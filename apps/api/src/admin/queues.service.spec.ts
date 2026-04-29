import { BadRequestException, NotFoundException } from '@nestjs/common';
import { QueuesService } from './queues.service';

function makeQueue(overrides: Partial<any> = {}) {
  return {
    getJobCounts: jest.fn().mockResolvedValue({
      waiting: 0,
      active: 0,
      delayed: 0,
      failed: 0,
      completed: 0,
    }),
    getFailed: jest.fn().mockResolvedValue([]),
    getJob: jest.fn().mockResolvedValue(null),
    ...overrides,
  } as any;
}

describe('QueuesService', () => {
  it('overview lists every known queue with its counts', async () => {
    const a = makeQueue({ getJobCounts: jest.fn().mockResolvedValue({ waiting: 1, failed: 2 }) });
    const b = makeQueue({ getJobCounts: jest.fn().mockResolvedValue({ waiting: 0, failed: 0 }) });
    const c = makeQueue({ getJobCounts: jest.fn().mockResolvedValue({ waiting: 5, failed: 0 }) });
    const svc = new QueuesService(a, b, c);
    const out = await svc.overview();
    expect(out.map((q) => q.name)).toEqual(['post-publish', 'post-metrics', 'webhook-delivery']);
    expect(out[0].counts).toEqual({ waiting: 1, failed: 2 });
    expect(out[2].counts).toEqual({ waiting: 5, failed: 0 });
  });

  it('listFailed serializes jobs and respects the limit', async () => {
    const failedJobs = [
      {
        id: '1',
        name: 'publish',
        data: { postId: 'p1' },
        attemptsMade: 3,
        failedReason: 'boom',
        stacktrace: ['l1', 'l2', 'l3', 'l4'],
        timestamp: 100,
        processedOn: 110,
        finishedOn: 120,
      },
    ];
    const queue = makeQueue({ getFailed: jest.fn().mockResolvedValue(failedJobs) });
    const svc = new QueuesService(queue, makeQueue(), makeQueue());
    const out = await svc.listFailed('post-publish', 10);
    expect(queue.getFailed).toHaveBeenCalledWith(0, 9);
    expect(out[0]).toMatchObject({
      id: '1',
      failedReason: 'boom',
      data: { postId: 'p1' },
    });
    // Only the first 3 stacktrace lines are kept.
    expect(out[0].stacktrace).toEqual(['l1', 'l2', 'l3']);
  });

  it('rejects an unknown queue name', async () => {
    const svc = new QueuesService(makeQueue(), makeQueue(), makeQueue());
    await expect(svc.listFailed('does-not-exist' as any)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('retry calls Job.retry() when the job is failed', async () => {
    const job = {
      isFailed: jest.fn().mockResolvedValue(true),
      retry: jest.fn().mockResolvedValue(undefined),
    };
    const queue = makeQueue({ getJob: jest.fn().mockResolvedValue(job) });
    const svc = new QueuesService(queue, makeQueue(), makeQueue());
    await expect(svc.retry('post-publish', 'job-1')).resolves.toEqual({ ok: true });
    expect(job.retry).toHaveBeenCalled();
  });

  it('retry refuses a job that is not in failed state', async () => {
    const job = {
      isFailed: jest.fn().mockResolvedValue(false),
      retry: jest.fn(),
    };
    const queue = makeQueue({ getJob: jest.fn().mockResolvedValue(job) });
    const svc = new QueuesService(queue, makeQueue(), makeQueue());
    await expect(svc.retry('post-publish', 'job-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(job.retry).not.toHaveBeenCalled();
  });

  it('retry returns 404 when the job does not exist', async () => {
    const queue = makeQueue({ getJob: jest.fn().mockResolvedValue(null) });
    const svc = new QueuesService(queue, makeQueue(), makeQueue());
    await expect(svc.retry('post-publish', 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('remove deletes the job', async () => {
    const job = { remove: jest.fn().mockResolvedValue(undefined) };
    const queue = makeQueue({ getJob: jest.fn().mockResolvedValue(job) });
    const svc = new QueuesService(queue, makeQueue(), makeQueue());
    await expect(svc.remove('post-publish', 'job-1')).resolves.toEqual({ ok: true });
    expect(job.remove).toHaveBeenCalled();
  });
});
