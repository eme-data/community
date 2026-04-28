import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SocialModule } from '../social/social.module';
import { PostPublishProcessor } from './post-publish.processor';

@Module({
  imports: [BullModule.registerQueue({ name: 'post-publish' }), SocialModule],
  providers: [PostPublishProcessor],
})
export class SchedulerModule {}
