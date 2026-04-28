import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

import { PrismaModule } from './prisma/prisma.module';
import { SocialModule } from './social/social.module';
import { MediaModule } from './media/media.module';
import { AuditModule } from './audit/audit.module';
import { PostPublishProcessor } from './scheduler/post-publish.processor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRoot({
      connection: {
        url: process.env.REDIS_URL || 'redis://redis:6379',
      },
    }),
    BullModule.registerQueue({ name: 'post-publish' }),
    PrismaModule,
    SocialModule,
    MediaModule,
    AuditModule,
  ],
  providers: [PostPublishProcessor],
})
export class WorkerModule {}
