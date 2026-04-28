import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { SocialService } from '../social/social.service';

@Processor('post-publish')
export class PostPublishProcessor extends WorkerHost {
  private readonly logger = new Logger(PostPublishProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly social: SocialService,
  ) {
    super();
  }

  async process(job: Job<{ postId: string }>) {
    const { postId } = job.data;
    this.logger.log(`Publishing post ${postId} (attempt ${job.attemptsMade + 1})`);

    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { targets: { include: { account: true } } },
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
          mediaIds: [],
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

    if (!allOk) throw new Error(`One or more targets failed for post ${postId}`);
  }
}
