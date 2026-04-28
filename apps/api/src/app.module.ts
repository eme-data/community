import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';
import { PostsModule } from './posts/posts.module';
import { SocialModule } from './social/social.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRoot({
      connection: {
        url: process.env.REDIS_URL || 'redis://redis:6379',
      },
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    MailModule,
    AuthModule,
    TenantsModule,
    UsersModule,
    PostsModule,
    SocialModule,
    SchedulerModule,
    OnboardingModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
