import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';

const QUEUES = ['post-publish', 'post-metrics', 'webhook-delivery'] as const;
export type QueueName = (typeof QUEUES)[number];

@Injectable()
export class QueuesService {
  private readonly map: Record<QueueName, Queue>;

  constructor(
    @InjectQueue('post-publish') postPublish: Queue,
    @InjectQueue('post-metrics') postMetrics: Queue,
    @InjectQueue('webhook-delivery') webhookDelivery: Queue,
  ) {
    this.map = {
      'post-publish': postPublish,
      'post-metrics': postMetrics,
      'webhook-delivery': webhookDelivery,
    };
  }

  async overview() {
    const out: Array<{ name: QueueName; counts: Record<string, number> }> = [];
    for (const name of QUEUES) {
      const counts = await this.map[name].getJobCounts(
        'waiting',
        'active',
        'delayed',
        'failed',
        'completed',
      );
      out.push({ name, counts });
    }
    return out;
  }

  async listFailed(name: QueueName, limit = 50) {
    const queue = this.requireQueue(name);
    const jobs = await queue.getFailed(0, Math.max(0, limit - 1));
    return jobs.map((j) => this.serialize(j));
  }

  async retry(name: QueueName, jobId: string) {
    const queue = this.requireQueue(name);
    const job = await queue.getJob(jobId);
    if (!job) throw new NotFoundException(`Job ${jobId} not found in ${name}`);
    if (!(await job.isFailed())) throw new BadRequestException('Job is not in failed state');
    await job.retry();
    return { ok: true };
  }

  async remove(name: QueueName, jobId: string) {
    const queue = this.requireQueue(name);
    const job = await queue.getJob(jobId);
    if (!job) throw new NotFoundException(`Job ${jobId} not found in ${name}`);
    await job.remove();
    return { ok: true };
  }

  private requireQueue(name: string): Queue {
    if (!QUEUES.includes(name as QueueName)) {
      throw new BadRequestException(`Unknown queue: ${name}`);
    }
    return this.map[name as QueueName];
  }

  private serialize(job: Job) {
    return {
      id: job.id,
      name: job.name,
      data: job.data,
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason,
      stacktrace: job.stacktrace?.slice(0, 3),
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
    };
  }
}
