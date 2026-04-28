import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { SocialService } from '../social/social.service';
import { AuditService } from '../audit/audit.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MetricsService } from '../metrics/metrics.service';

@Processor('post-publish')
export class PostPublishProcessor extends WorkerHost {
  private readonly logger = new Logger(PostPublishProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly social: SocialService,
    private readonly audit: AuditService,
    private readonly webhooks: WebhooksService,
    private readonly notifications: NotificationsService,
    private readonly metrics: MetricsService,
  ) {
    super();
  }

  async process(job: Job<{ postId: string }>) {
    const { postId } = job.data;
    this.logger.log(`Publishing post ${postId} (attempt ${job.attemptsMade + 1})`);

    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { targets: { include: { account: true } }, media: true },
    });
    if (!post) {
      this.logger.warn(`Post ${postId} not found — skipping`);
      return;
    }

    await this.prisma.post.update({
      where: { id: postId },
      data: { status: 'PUBLISHING' },
    });

    let allOk = true;

    for (const target of post.targets) {
      if (target.status === 'PUBLISHED') continue;

      try {
        const result = await this.social.publish(target.account, {
          content: post.content,
          mediaIds: post.media.map((m) => m.id),
          thread: post.thread,
        });

        await this.prisma.postTarget.update({
          where: { id: target.id },
          data: {
            status: 'PUBLISHED',
            providerPostId: result.providerPostId,
            providerUrl: result.providerUrl,
            publishedAt: new Date(),
            attempts: { increment: 1 },
            errorMessage: null,
          },
        });
      } catch (err: any) {
        allOk = false;
        this.logger.error(`Target ${target.id} failed: ${err?.message ?? err}`);
        await this.prisma.postTarget.update({
          where: { id: target.id },
          data: {
            status: 'FAILED',
            attempts: { increment: 1 },
            errorMessage: String(err?.message ?? err).slice(0, 1000),
          },
        });
      }
    }

    await this.prisma.post.update({
      where: { id: postId },
      data: {
        status: allOk ? 'PUBLISHED' : 'FAILED',
        publishedAt: allOk ? new Date() : null,
      },
    });

    const targetSummary = post.targets.map((t) => ({
      provider: t.account.provider,
      status: t.status,
      providerUrl: t.providerUrl,
      providerPostId: t.providerPostId,
      errorMessage: t.errorMessage,
    }));

    await this.audit.log({
      tenantId: post.tenantId,
      userId: post.authorUserId,
      action: allOk ? 'post.published' : 'post.failed',
      target: postId,
      payload: { targets: targetSummary },
    });

    // Webhook fan-out + in-app notification — both fire-and-forget.
    await this.webhooks.dispatch(post.tenantId, allOk ? 'post.published' : 'post.failed', {
      postId,
      content: post.content.slice(0, 280),
      targets: targetSummary,
    });

    await this.notifications.create({
      tenantId: post.tenantId,
      userId: post.authorUserId,
      type: allOk ? 'post.published' : 'post.failed',
      title: allOk ? 'Publication réussie' : 'Échec de publication',
      body: allOk
        ? `Publié sur ${targetSummary.map((t) => t.provider).join(', ')}.`
        : `Une ou plusieurs cibles ont échoué : ${targetSummary
            .filter((t) => t.status === 'FAILED')
            .map((t) => `${t.provider} (${t.errorMessage ?? 'erreur'})`)
            .join('; ')}`,
      link: `/posts/${postId}`,
    });

    // Schedule the H+1 / J+1 / J+7 metric refetches for any published target.
    if (allOk) {
      try {
        await this.metrics.scheduleForPost(postId);
      } catch (err: any) {
        this.logger.warn(`Could not schedule metrics for ${postId}: ${err?.message ?? err}`);
      }
    }

    if (!allOk) throw new Error(`One or more targets failed for post ${postId}`);
  }
}
