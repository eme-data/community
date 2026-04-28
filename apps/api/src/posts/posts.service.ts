import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('post-publish') private readonly queue: Queue,
  ) {}

  list(tenantId: string) {
    return this.prisma.post.findMany({
      where: { tenantId },
      include: { targets: { include: { account: true } } },
      orderBy: { createdAt: 'desc' },
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
    // Verify all accounts belong to the tenant
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

    const scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
    const status = scheduledAt ? 'SCHEDULED' : 'DRAFT';

    const post = await this.prisma.post.create({
      data: {
        tenantId,
        authorUserId: userId,
        content: dto.content,
        status,
        scheduledAt,
        targets: {
          create: dto.accountIds.map((accountId) => ({
            accountId,
            status: scheduledAt ? 'SCHEDULED' : 'DRAFT',
          })),
        },
        media: mediaIds.length
          ? { connect: mediaIds.map((id) => ({ id })) }
          : undefined,
      },
      include: { targets: true, media: true },
    });

    if (scheduledAt) {
      await this.enqueue(post.id, scheduledAt);
    }

    return post;
  }

  async publishNow(tenantId: string, postId: string) {
    const post = await this.findOne(tenantId, postId);
    if (post.status === 'PUBLISHED') throw new BadRequestException('Post already published');

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
