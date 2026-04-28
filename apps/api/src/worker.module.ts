import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

import { PrismaModule } from './prisma/prisma.module';
import { SocialModule } from './social/social.module';
import { MediaModule } from './media/media.module';
import { AuditModule } from './audit/audit.module';
import { MetricsModule } from './metrics/metrics.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PostPublishProcessor } from './scheduler/post-publish.processor';
import { PostMetricsProcessor } from './metrics/metrics.processor';
import { WebhookDeliveryProcessor } from './webhooks/webhook-delivery.processor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRoot({
      connection: {
        url: process.env.REDIS_URL || 'redis://redis:6379',
      },
    }),
    BullModule.registerQueue(
      { name: 'post-publish' },
      { name: 'post-metrics' },
      { name: 'webhook-delivery' },
    ),
    PrismaModule,
    SocialModule,
    MediaModule,
    AuditModule,
    MetricsModule,
    WebhooksModule,
    NotificationsModule,
  ],
  providers: [PostPublishProcessor, PostMetricsProcessor, WebhookDeliveryProcessor],
})
export class WorkerModule {}
