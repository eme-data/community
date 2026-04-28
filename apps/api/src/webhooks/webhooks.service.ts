import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

export const WEBHOOK_EVENTS = [
  'post.published',
  'post.failed',
  'post.scheduled',
  'post.approved',
  'post.rejected',
  'approval.requested',
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('webhook-delivery') private readonly queue: Queue,
  ) {}

  async list(tenantId: string) {
    return this.prisma.webhook.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        url: true,
        events: true,
        active: true,
        lastDeliveryAt: true,
        lastFailureAt: true,
        createdAt: true,
      },
    });
  }

  async create(
    tenantId: string,
    userId: string,
    input: { url: string; events: string[] },
  ) {
    const validEvents = input.events.filter((e) =>
      (WEBHOOK_EVENTS as readonly string[]).includes(e),
    );
    const secret = `whs_${randomBytes(24).toString('hex')}`;
    const wh = await this.prisma.webhook.create({
      data: {
        tenantId,
        url: input.url,
        secret,
        events: validEvents,
        createdByUserId: userId,
      },
    });
    // Return secret ONCE — caller must persist it.
    return { ...wh, secret };
  }

  async update(
    tenantId: string,
    id: string,
    patch: { url?: string; events?: string[]; active?: boolean },
  ) {
    const existing = await this.prisma.webhook.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Webhook not found');
    const data: any = {};
    if (patch.url !== undefined) data.url = patch.url;
    if (patch.active !== undefined) data.active = patch.active;
    if (patch.events !== undefined) {
      data.events = patch.events.filter((e) =>
        (WEBHOOK_EVENTS as readonly string[]).includes(e),
      );
    }
    return this.prisma.webhook.update({ where: { id }, data });
  }

  async remove(tenantId: string, id: string) {
    const existing = await this.prisma.webhook.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Webhook not found');
    await this.prisma.webhook.delete({ where: { id } });
    return { ok: true };
  }

  async listDeliveries(tenantId: string, webhookId: string, limit = 50) {
    const wh = await this.prisma.webhook.findFirst({ where: { id: webhookId, tenantId } });
    if (!wh) throw new NotFoundException('Webhook not found');
    return this.prisma.webhookDelivery.findMany({
      where: { webhookId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
    });
  }

  /** Manually re-fire the most recent delivery — useful when fixing a 500 on the receiver. */
  async redeliver(tenantId: string, webhookId: string, deliveryId: string) {
    const wh = await this.prisma.webhook.findFirst({ where: { id: webhookId, tenantId } });
    if (!wh) throw new NotFoundException('Webhook not found');
    const d = await this.prisma.webhookDelivery.findFirst({
      where: { id: deliveryId, webhookId },
    });
    if (!d) throw new NotFoundException('Delivery not found');
    await this.queue.add(
      'deliver',
      { deliveryId: d.id },
      { attempts: 1, removeOnComplete: 1000, removeOnFail: 1000 },
    );
    return { ok: true };
  }

  /**
   * Fan out an event to every active webhook subscribed to it. Each delivery
   * gets its own row + queued job so we can show per-attempt history in the UI.
   */
  async dispatch(
    tenantId: string,
    event: WebhookEvent,
    payload: Record<string, unknown>,
  ): Promise<void> {
    let hooks: { id: string }[] = [];
    try {
      hooks = await this.prisma.webhook.findMany({
        where: { tenantId, active: true, events: { has: event } },
        select: { id: true },
      });
    } catch (err: any) {
      // dispatch is fire-and-forget from the caller's perspective — never throw.
      this.logger.warn(`Webhook lookup failed for ${event}: ${err?.message ?? err}`);
      return;
    }
    if (hooks.length === 0) return;

    for (const h of hooks) {
      try {
        const delivery = await this.prisma.webhookDelivery.create({
          data: { webhookId: h.id, event, payload: payload as any },
        });
        await this.queue.add(
          'deliver',
          { deliveryId: delivery.id },
          {
            attempts: 5,
            backoff: { type: 'exponential', delay: 30_000 },
            removeOnComplete: 1000,
            removeOnFail: 5000,
          },
        );
      } catch (err: any) {
        this.logger.warn(
          `Failed to enqueue webhook delivery for ${h.id}: ${err?.message ?? err}`,
        );
      }
    }
  }
}
