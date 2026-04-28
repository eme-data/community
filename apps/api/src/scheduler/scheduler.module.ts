import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SocialModule } from '../social/social.module';
import { PostPublishProcessor } from './post-publish.processor';
import { TokenRefreshService } from './token-refresh.service';

@Module({
  imports: [BullModule.registerQueue({ name: 'post-publish' }), SocialModule],
  providers: [PostPublishProcessor, TokenRefreshService],
})
export class SchedulerModule {}
