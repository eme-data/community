import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import axios from 'axios';
import { createHmac } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Processor('webhook-delivery')
export class WebhookDeliveryProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookDeliveryProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<{ deliveryId: string }>) {
    const delivery = await this.prisma.webhookDelivery.findUnique({
      where: { id: job.data.deliveryId },
      include: { webhook: true },
    });
    if (!delivery) {
      this.logger.warn(`Delivery ${job.data.deliveryId} not found — dropping`);
      return;
    }
    const { webhook } = delivery;
    if (!webhook.active) {
      this.logger.log(`Webhook ${webhook.id} inactive — skipping`);
      return;
    }

    const body = JSON.stringify({
      id: delivery.id,
      event: delivery.event,
      tenantId: webhook.tenantId,
      createdAt: delivery.createdAt.toISOString(),
      data: delivery.payload,
    });
    const signature = createHmac('sha256', webhook.secret).update(body).digest('hex');

    let statusCode: number | null = null;
    let responseBody: string | null = null;
    let errorMessage: string | null = null;

    try {
      const res = await axios.post(webhook.url, body, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Community-Webhook/1.0',
          'X-Community-Event': delivery.event,
          'X-Community-Delivery': delivery.id,
          'X-Community-Signature': `sha256=${signature}`,
        },
        timeout: 10_000,
        // We want to inspect 4xx ourselves, not throw on them by default.
        validateStatus: () => true,
      });
      statusCode = res.status;
      responseBody = typeof res.data === 'string'
        ? res.data.slice(0, 500)
        : JSON.stringify(res.data).slice(0, 500);
      if (res.status >= 200 && res.status < 300) {
        await this.prisma.$transaction([
          this.prisma.webhookDelivery.update({
            where: { id: delivery.id },
            data: {
              statusCode,
              responseBody,
              attempts: { increment: 1 },
              deliveredAt: new Date(),
              errorMessage: null,
            },
          }),
          this.prisma.webhook.update({
            where: { id: webhook.id },
            data: { lastDeliveryAt: new Date() },
          }),
        ]);
        return;
      }
      errorMessage = `HTTP ${res.status}`;
    } catch (err: any) {
      errorMessage = String(err?.message ?? err).slice(0, 500);
    }

    await this.prisma.$transaction([
      this.prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          statusCode,
          responseBody,
          errorMessage,
          attempts: { increment: 1 },
        },
      }),
      this.prisma.webhook.update({
        where: { id: webhook.id },
        data: { lastFailureAt: new Date() },
      }),
    ]);

    // Re-throw so BullMQ retries with backoff up to the configured attempts.
    throw new Error(`Webhook delivery failed: ${errorMessage}`);
  }
}
