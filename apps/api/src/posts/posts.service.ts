import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreatePostDto } from './dto/create-post.dto';

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly webhooks: WebhooksService,
    private readonly notifications: NotificationsService,
    @InjectQueue('post-publish') private readonly queue: Queue,
  ) {}

  list(tenantId: string) {
    return this.prisma.post.findMany({
      where: { tenantId },
      include: { targets: { include: { account: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  listPending(tenantId: string) {
    return this.prisma.post.findMany({
      where: { tenantId, status: 'PENDING_APPROVAL' },
      include: { targets: { include: { account: true } }, media: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const post = await this.prisma.post.findFirst({
      where: { id, tenantId },
      include: { targets: { include: { account: true } }, media: true },
    });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async create(tenantId: string, userId: string, dto: CreatePostDto) {
    const accounts = await this.prisma.socialAccount.findMany({
      where: { id: { in: dto.accountIds }, tenantId },
    });
    if (accounts.length !== dto.accountIds.length) {
      throw new BadRequestException('One or more social accounts are invalid');
    }

    const mediaIds = dto.mediaIds ?? [];
    if (mediaIds.length > 0) {
      const owned = await this.prisma.mediaAsset.count({
        where: { id: { in: mediaIds }, tenantId },
      });
      if (owned !== mediaIds.length) {
        throw new BadRequestException('One or more media assets are invalid');
      }
    }

    // If the tenant requires approval and the author is just an EDITOR, the
    // post lands in PENDING_APPROVAL and is NOT enqueued. OWNER/ADMIN bypass.
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { requireApproval: true },
    });
    const m = await this.prisma.membership.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
      select: { role: true },
    });
    const role = m?.role;
    const needsApproval = !!tenant?.requireApproval && role === 'EDITOR';

    const scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
    const status = needsApproval
      ? 'PENDING_APPROVAL'
      : scheduledAt
        ? 'SCHEDULED'
        : 'DRAFT';

    const post = await this.prisma.post.create({
      data: {
        tenantId,
        authorUserId: userId,
        content: dto.content,
        thread: dto.thread ?? [],
        status,
        scheduledAt,
        targets: {
          create: dto.accountIds.map((accountId) => ({
            accountId,
            status,
          })),
        },
        media: mediaIds.length
          ? { connect: mediaIds.map((id) => ({ id })) }
          : undefined,
      },
      include: { targets: true, media: true },
    });

    if (status === 'SCHEDULED' && scheduledAt) {
      await this.enqueue(post.id, scheduledAt);
    }

    await this.audit.log({
      tenantId,
      userId,
      action:
        status === 'PENDING_APPROVAL'
          ? 'post.submitted_for_approval'
          : status === 'SCHEDULED'
            ? 'post.scheduled'
            : 'post.draft.created',
      target: post.id,
      payload: { accountIds: dto.accountIds, scheduledAt: scheduledAt?.toISOString() },
    });

    if (status === 'SCHEDULED') {
      await this.webhooks.dispatch(tenantId, 'post.scheduled', {
        postId: post.id,
        scheduledAt: scheduledAt?.toISOString(),
        accountIds: dto.accountIds,
      });
    }
    if (status === 'PENDING_APPROVAL') {
      await this.webhooks.dispatch(tenantId, 'approval.requested', {
        postId: post.id,
        authorUserId: userId,
      });
      await this.notifications.notifyAdmins(tenantId, {
        type: 'approval.requested',
        title: 'Post en attente d\'approbation',
        body: dto.content.slice(0, 140),
        link: `/posts/pending`,
      });
    }

    return post;
  }

  async approve(tenantId: string, reviewerUserId: string, postId: string) {
    const post = await this.findOne(tenantId, postId);
    if (post.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Post is not pending approval');
    }
    if (post.authorUserId === reviewerUserId) {
      throw new ForbiddenException('You cannot approve your own post');
    }
    const newStatus = post.scheduledAt ? 'SCHEDULED' : 'DRAFT';
    await this.prisma.post.update({
      where: { id: postId },
      data: {
        status: newStatus,
        approvedAt: new Date(),
        approvedByUserId: reviewerUserId,
      },
    });
    await this.prisma.postTarget.updateMany({
      where: { postId },
      data: { status: newStatus },
    });
    if (post.scheduledAt) await this.enqueue(postId, post.scheduledAt);

    await this.audit.log({
      tenantId,
      userId: reviewerUserId,
      action: 'post.approved',
      target: postId,
      payload: { authorUserId: post.authorUserId, scheduledAt: post.scheduledAt?.toISOString() },
    });
    await this.webhooks.dispatch(tenantId, 'post.approved', {
      postId,
      reviewerUserId,
      scheduledAt: post.scheduledAt?.toISOString(),
    });
    await this.notifications.create({
      tenantId,
      userId: post.authorUserId,
      type: 'post.approved',
      title: 'Post approuvé',
      body: post.content.slice(0, 140),
      link: `/posts/${postId}`,
    });
    return { ok: true };
  }

  async reject(tenantId: string, reviewerUserId: string, postId: string, reason?: string) {
    const post = await this.findOne(tenantId, postId);
    if (post.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Post is not pending approval');
    }
    await this.prisma.post.update({
      where: { id: postId },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectedByUserId: reviewerUserId,
        rejectionReason: reason?.slice(0, 1000) ?? null,
      },
    });
    await this.prisma.postTarget.updateMany({
      where: { postId },
      data: { status: 'REJECTED' },
    });
    await this.audit.log({
      tenantId,
      userId: reviewerUserId,
      action: 'post.rejected',
      target: postId,
      payload: { authorUserId: post.authorUserId, reason },
    });
    await this.webhooks.dispatch(tenantId, 'post.rejected', {
      postId,
      reviewerUserId,
      reason: reason ?? null,
    });
    await this.notifications.create({
      tenantId,
      userId: post.authorUserId,
      type: 'post.rejected',
      title: 'Post refusé',
      body: reason || post.content.slice(0, 140),
      link: `/posts/${postId}`,
    });
    return { ok: true };
  }

  async publishNow(tenantId: string, postId: string) {
    const post = await this.findOne(tenantId, postId);
    if (post.status === 'PUBLISHED') throw new BadRequestException('Post already published');
    if (post.status === 'PENDING_APPROVAL') {
      throw new BadRequestException('Post is awaiting approval');
    }

    await this.prisma.post.update({
      where: { id: postId },
      data: { status: 'SCHEDULED', scheduledAt: new Date() },
    });
    await this.enqueue(postId, new Date());
    return { ok: true };
  }

  async cancel(tenantId: string, postId: string) {
    const post = await this.findOne(tenantId, postId);
    if (post.status === 'PUBLISHED') throw new BadRequestException('Cannot cancel published post');
    await this.prisma.post.update({
      where: { id: postId },
      data: { status: 'DRAFT', scheduledAt: null },
    });
    return { ok: true };
  }

  private async enqueue(postId: string, scheduledAt: Date) {
    const delay = Math.max(0, scheduledAt.getTime() - Date.now());
    await this.queue.add(
      'publish',
      { postId },
      {
        delay,
        attempts: 5,
        backoff: { type: 'exponential', delay: 60_000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    );
  }
}
