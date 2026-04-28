import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MetricsService } from './metrics.service';

@Processor('post-metrics')
export class PostMetricsProcessor extends WorkerHost {
  private readonly logger = new Logger(PostMetricsProcessor.name);

  constructor(private readonly metrics: MetricsService) {
    super();
  }

  async process(job: Job<{ postId: string }>) {
    const stored = await this.metrics.runForPost(job.data.postId);
    if (stored > 0) {
      this.logger.log(`Stored ${stored} metric snapshot(s) for post ${job.data.postId}`);
    }
  }
}
