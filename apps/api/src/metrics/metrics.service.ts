import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { SocialService } from '../social/social.service';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly social: SocialService,
    @InjectQueue('post-metrics') private readonly queue: Queue,
  ) {}

  /**
   * Schedule three follow-up fetches at H+1, J+1, J+7 after publication.
   * Each job re-fetches every published target of the post.
   */
  async scheduleForPost(postId: string): Promise<void> {
    const delays = [
      1000 * 60 * 60, // 1h
      1000 * 60 * 60 * 24, // 24h
      1000 * 60 * 60 * 24 * 7, // 7d
    ];
    for (const delay of delays) {
      await this.queue.add(
        'fetch',
        { postId },
        {
          delay,
          attempts: 3,
          backoff: { type: 'exponential', delay: 60_000 },
          removeOnComplete: 1000,
          removeOnFail: 1000,
        },
      );
    }
  }

  /** Fetch & persist metrics for every published target of a post. Called by the worker. */
  async runForPost(postId: string): Promise<number> {
    const targets = await this.prisma.postTarget.findMany({
      where: { postId, status: 'PUBLISHED', providerPostId: { not: null } },
      include: { account: true },
    });
    let stored = 0;
    for (const target of targets) {
      try {
        const snapshot = await this.social.fetchMetrics(target.account, target.providerPostId!);
        if (!snapshot) continue;
        await this.prisma.postMetric.create({
          data: {
            targetId: target.id,
            impressions: snapshot.impressions,
            reach: snapshot.reach,
            likes: snapshot.likes,
            comments: snapshot.comments,
            shares: snapshot.shares,
            clicks: snapshot.clicks,
            raw: snapshot.raw as any,
          },
        });
        stored++;
      } catch (err: any) {
        this.logger.warn(
          `Metric fetch failed for target ${target.id}: ${err?.message ?? err}`,
        );
      }
    }
    return stored;
  }

  /** Aggregated metrics for a post across all targets — latest sample per target. */
  async forPost(tenantId: string, postId: string) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, tenantId },
      include: {
        targets: {
          include: {
            account: { select: { provider: true, displayName: true } },
            metrics: { orderBy: { fetchedAt: 'desc' } },
          },
        },
      },
    });
    if (!post) throw new NotFoundException('Post not found');

    const totals = { impressions: 0, reach: 0, likes: 0, comments: 0, shares: 0, clicks: 0 };
    const perTarget = post.targets.map((t) => {
      const latest = t.metrics[0];
      if (latest) {
        totals.impressions += latest.impressions ?? 0;
        totals.reach += latest.reach ?? 0;
        totals.likes += latest.likes ?? 0;
        totals.comments += latest.comments ?? 0;
        totals.shares += latest.shares ?? 0;
        totals.clicks += latest.clicks ?? 0;
      }
      return {
        targetId: t.id,
        provider: t.account.provider,
        displayName: t.account.displayName,
        providerUrl: t.providerUrl,
        history: t.metrics.map((m) => ({
          fetchedAt: m.fetchedAt,
          impressions: m.impressions,
          reach: m.reach,
          likes: m.likes,
          comments: m.comments,
          shares: m.shares,
          clicks: m.clicks,
        })),
      };
    });
    return { postId, totals, perTarget };
  }

  /** Tenant-wide latest metrics — useful for the dashboard summary. */
  async forTenant(tenantId: string, limit = 20) {
    const recent = await this.prisma.post.findMany({
      where: { tenantId, status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      take: limit,
      include: {
        targets: {
          include: {
            account: { select: { provider: true, displayName: true } },
            metrics: { orderBy: { fetchedAt: 'desc' }, take: 1 },
          },
        },
      },
    });
    return recent.map((p) => {
      const totals = { impressions: 0, likes: 0, comments: 0 };
      for (const t of p.targets) {
        const m = t.metrics[0];
        if (m) {
          totals.impressions += m.impressions ?? 0;
          totals.likes += m.likes ?? 0;
          totals.comments += m.comments ?? 0;
        }
      }
      return {
        postId: p.id,
        content: p.content.slice(0, 120),
        publishedAt: p.publishedAt,
        totals,
        targets: p.targets.map((t) => ({
          provider: t.account.provider,
          providerUrl: t.providerUrl,
        })),
      };
    });
  }
}
