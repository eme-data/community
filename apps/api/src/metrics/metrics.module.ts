import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SocialModule } from '../social/social.module';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { PostMetricsProcessor } from './metrics.processor';

@Module({
  imports: [BullModule.registerQueue({ name: 'post-metrics' }), SocialModule],
  controllers: [MetricsController],
  providers: [MetricsService, PostMetricsProcessor],
  exports: [MetricsService],
})
export class MetricsModule {}
