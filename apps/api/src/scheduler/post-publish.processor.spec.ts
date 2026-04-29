import { PostPublishProcessor } from './post-publish.processor';

function makeProcessor() {
  const prisma = {
    post: {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    },
    postTarget: {
      update: jest.fn().mockResolvedValue(undefined),
    },
  } as any;
  const social = { publish: jest.fn() } as any;
  const audit = { log: jest.fn().mockResolvedValue(undefined) } as any;
  const webhooks = { dispatch: jest.fn().mockResolvedValue(undefined) } as any;
  const notifications = { create: jest.fn().mockResolvedValue(undefined) } as any;
  const metrics = { scheduleForPost: jest.fn().mockResolvedValue(undefined) } as any;

  const processor = new PostPublishProcessor(
    prisma,
    social,
    audit,
    webhooks,
    notifications,
    metrics,
  );
  return { processor, prisma, social, audit, webhooks, notifications, metrics };
}

function makeJob(postId = 'p1', attemptsMade = 0) {
  return { data: { postId }, attemptsMade } as any;
}

function makePost(targets: Array<{ id: string; provider: string; status?: string }>) {
  return {
    id: 'p1',
    tenantId: 't1',
    authorUserId: 'u1',
    content: 'Hello world',
    media: [],
    targets: targets.map((t) => ({
      id: t.id,
      status: t.status ?? 'SCHEDULED',
      account: { id: t.id, provider: t.provider },
    })),
  };
}

describe('PostPublishProcessor', () => {
  it('returns early when the post no longer exists', async () => {
    const { processor, prisma, social } = makeProcessor();
    prisma.post.findUnique.mockResolvedValueOnce(null);
    await processor.process(makeJob());
    expect(social.publish).not.toHaveBeenCalled();
    expect(prisma.post.update).not.toHaveBeenCalled();
  });

  it('marks the post PUBLISHED when every target succeeds', async () => {
    const { processor, prisma, social, audit, webhooks, notifications, metrics } = makeProcessor();
    prisma.post.findUnique.mockResolvedValueOnce(
      makePost([
        { id: 'tgt-li', provider: 'LINKEDIN' },
        { id: 'tgt-bs', provider: 'BLUESKY' },
      ]),
    );
    social.publish
      .mockResolvedValueOnce({ providerPostId: 'urn:li:1', providerUrl: 'https://li' })
      .mockResolvedValueOnce({ providerPostId: 'at://2', providerUrl: 'https://bsky' });

    await processor.process(makeJob());

    // Final status update is PUBLISHED.
    const finalUpdate = prisma.post.update.mock.calls.at(-1)![0];
    expect(finalUpdate.where).toEqual({ id: 'p1' });
    expect(finalUpdate.data.status).toEqual('PUBLISHED');
    expect(finalUpdate.data.publishedAt).toBeInstanceOf(Date);

    // Each target was marked PUBLISHED with its provider URL.
    expect(prisma.postTarget.update).toHaveBeenCalledTimes(2);
    for (const call of prisma.postTarget.update.mock.calls) {
      expect(call[0].data.status).toEqual('PUBLISHED');
      expect(call[0].data.errorMessage).toBeNull();
    }

    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'post.published', tenantId: 't1' }),
    );
    expect(webhooks.dispatch).toHaveBeenCalledWith(
      't1',
      'post.published',
      expect.objectContaining({ postId: 'p1' }),
    );
    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'post.published', userId: 'u1' }),
    );
    expect(metrics.scheduleForPost).toHaveBeenCalledWith('p1');
  });

  it('marks the post FAILED and rethrows when any target fails', async () => {
    const { processor, prisma, social, webhooks, notifications, metrics } = makeProcessor();
    prisma.post.findUnique.mockResolvedValueOnce(
      makePost([
        { id: 'tgt-ok', provider: 'LINKEDIN' },
        { id: 'tgt-ko', provider: 'TIKTOK' },
      ]),
    );
    social.publish
      .mockResolvedValueOnce({ providerPostId: 'urn:li:1' })
      .mockRejectedValueOnce(new Error('TikTok 4xx'));

    await expect(processor.process(makeJob())).rejects.toThrow(/One or more targets failed/);

    // Each target update reflects its outcome.
    const calls = prisma.postTarget.update.mock.calls.map((c: any[]) => c[0]);
    const ok = calls.find((c) => c.where.id === 'tgt-ok');
    const ko = calls.find((c) => c.where.id === 'tgt-ko');
    expect(ok.data.status).toEqual('PUBLISHED');
    expect(ko.data.status).toEqual('FAILED');
    expect(ko.data.errorMessage).toContain('TikTok 4xx');

    // Final post status update is FAILED, no metrics scheduling.
    const finalUpdate = prisma.post.update.mock.calls.at(-1)![0];
    expect(finalUpdate.data.status).toEqual('FAILED');
    expect(finalUpdate.data.publishedAt).toBeNull();
    expect(metrics.scheduleForPost).not.toHaveBeenCalled();

    // Notification + webhook still fire so admins know about the failure.
    expect(webhooks.dispatch).toHaveBeenCalledWith('t1', 'post.failed', expect.anything());
    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'post.failed' }),
    );
  });

  it('skips already-PUBLISHED targets on a retry', async () => {
    const { processor, prisma, social } = makeProcessor();
    prisma.post.findUnique.mockResolvedValueOnce(
      makePost([
        { id: 'tgt-done', provider: 'LINKEDIN', status: 'PUBLISHED' },
        { id: 'tgt-pending', provider: 'BLUESKY' },
      ]),
    );
    social.publish.mockResolvedValueOnce({ providerPostId: 'at://x' });

    await processor.process(makeJob());

    // social.publish should be called only for the pending target.
    expect(social.publish).toHaveBeenCalledTimes(1);
    expect(social.publish.mock.calls[0][0]).toMatchObject({ provider: 'BLUESKY' });
  });
});
