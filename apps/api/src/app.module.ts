import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';
import { PostsModule } from './posts/posts.module';
import { SocialModule } from './social/social.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { MediaModule } from './media/media.module';
import { InvitationsModule } from './invitations/invitations.module';
import { BillingModule } from './billing/billing.module';
import { AuditModule } from './audit/audit.module';
import { TemplatesModule } from './templates/templates.module';
import { AIModule } from './ai/ai.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { MetricsModule } from './metrics/metrics.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ProviderEnvModule } from './provider-env/provider-env.module';
import { AdminModule } from './admin/admin.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : { target: 'pino-pretty', options: { singleLine: true, colorize: true } },
        autoLogging: { ignore: (req) => req.url === '/health' },
        redact: ['req.headers.authorization', 'req.headers.cookie'],
      },
    }),
    BullModule.forRoot({
      connection: {
        url: process.env.REDIS_URL || 'redis://redis:6379',
      },
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      // Default: 60 requests / minute per IP
      { name: 'default', ttl: 60_000, limit: 60 },
      // Tighter bucket reserved for auth/email endpoints — opt-in via @Throttle('auth')
      { name: 'auth', ttl: 60_000, limit: 10 },
    ]),
    PrismaModule,
    MailModule,
    AuthModule,
    TenantsModule,
    UsersModule,
    PostsModule,
    SocialModule,
    SchedulerModule,
    OnboardingModule,
    MediaModule,
    InvitationsModule,
    BillingModule,
    AuditModule,
    TemplatesModule,
    AIModule,
    ApiKeysModule,
    MetricsModule,
    WebhooksModule,
    NotificationsModule,
    ProviderEnvModule,
    AdminModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
