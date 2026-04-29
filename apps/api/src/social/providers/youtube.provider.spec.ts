import axios from 'axios';
import { YouTubeProvider } from './youtube.provider';
import { encrypt } from '../crypto.util';

jest.mock('axios');
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  createReadStream: jest.fn(() => 'STREAM' as any),
  statSync: jest.fn(() => ({ size: 1234 })),
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

function makeProvider(envValues: Record<string, string> = {}) {
  const env = {
    require: jest.fn((name: string) => {
      const v =
        envValues[name] ??
        ({
          YOUTUBE_CLIENT_ID: 'cid',
          YOUTUBE_CLIENT_SECRET: 'csecret',
          YOUTUBE_REDIRECT_URI: 'https://app/cb',
        } as Record<string, string>)[name];
      if (!v) throw new Error(`Missing env var ${name}`);
      return v;
    }),
  } as any;
  const prisma = {
    mediaAsset: { findUnique: jest.fn() },
  } as any;
  const media = {
    absolutePath: jest.fn().mockReturnValue('/uploads/v.mp4'),
  } as any;
  return { provider: new YouTubeProvider(prisma, media, env), prisma, media, env };
}

describe('YouTubeProvider', () => {
  beforeEach(() => jest.resetAllMocks());

  it('builds an authorize URL with offline access and the upload scope', () => {
    const { provider } = makeProvider();
    const { url, state } = provider.buildAuthorizeUrl({ tenantId: 't1', userId: 'u1' });
    expect(state.startsWith('t1:u1:')).toBe(true);
    expect(url).toContain('access_type=offline');
    expect(url).toContain('prompt=consent');
    expect(url).toContain('youtube.upload');
    expect(url).toContain('client_id=cid');
    expect(url).toContain(encodeURIComponent('https://app/cb'));
  });

  it('handleCallback exchanges code for tokens and returns the channel id', async () => {
    const { provider } = makeProvider();
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        access_token: 'AT',
        refresh_token: 'RT',
        expires_in: 3600,
        scope: 'youtube.upload',
      },
    } as any);
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        items: [
          {
            id: 'UCabc',
            snippet: { title: 'My Channel', thumbnails: { default: { url: 'avatar.png' } } },
          },
        ],
      },
    } as any);

    const out = await provider.handleCallback({ code: 'CODE', state: 't1:u1:zz' });
    expect(out.providerUserId).toEqual('UCabc');
    expect(out.displayName).toEqual('My Channel');
    expect(out.accessToken).toEqual('AT');
    expect(out.refreshToken).toEqual('RT');
    expect(out.expiresAt).toBeInstanceOf(Date);
  });

  it('handleCallback throws if the account has no channel', async () => {
    const { provider } = makeProvider();
    mockedAxios.post.mockResolvedValueOnce({
      data: { access_token: 'AT', refresh_token: 'RT', expires_in: 3600 },
    } as any);
    mockedAxios.get.mockResolvedValueOnce({ data: { items: [] } } as any);
    await expect(provider.handleCallback({ code: 'C', state: 's' })).rejects.toThrow(
      /did not return a channel/,
    );
  });

  it('publish refuses when no media is attached', async () => {
    const { provider } = makeProvider();
    await expect(
      provider.publish({} as any, { content: 'hi', mediaIds: [] }),
    ).rejects.toThrow(/requires a video/);
  });

  it('publish refuses when the media is not a video', async () => {
    const { provider, prisma } = makeProvider();
    prisma.mediaAsset.findUnique.mockResolvedValueOnce({ mimeType: 'image/png' });
    await expect(
      provider.publish({ accessToken: encrypt('AT') } as any, {
        content: 'hi',
        mediaIds: ['m1'],
      }),
    ).rejects.toThrow(/video media asset/);
  });

  it('publish does a 2-step resumable upload and returns the video id', async () => {
    const { provider, prisma } = makeProvider();
    prisma.mediaAsset.findUnique.mockResolvedValueOnce({
      id: 'm1',
      mimeType: 'video/mp4',
      storageKey: 'v.mp4',
    });
    mockedAxios.post.mockResolvedValueOnce({
      headers: { location: 'https://upload.googleapis.com/...' },
      data: {},
    } as any);
    mockedAxios.put.mockResolvedValueOnce({ data: { id: 'VID123' } } as any);

    const out = await provider.publish(
      { accessToken: encrypt('AT'), providerUserId: 'UCabc' } as any,
      { content: 'My Title\nDescription line', mediaIds: ['m1'] },
    );

    expect(out).toEqual({ providerPostId: 'VID123', providerUrl: 'https://youtu.be/VID123' });

    // First call must initiate the resumable upload with snippet+status part.
    const initCall = mockedAxios.post.mock.calls[0];
    expect(initCall[0]).toContain('uploadType=resumable');
    expect((initCall[1] as any).snippet.title).toEqual('My Title');
    expect((initCall[1] as any).snippet.description).toContain('Description line');

    // Second call streams the bytes to the location URL.
    const putCall = mockedAxios.put.mock.calls[0];
    expect(putCall[0]).toEqual('https://upload.googleapis.com/...');
    expect(putCall[1]).toEqual('STREAM');
  });

  it('publish throws if YouTube does not return a resumable URL', async () => {
    const { provider, prisma } = makeProvider();
    prisma.mediaAsset.findUnique.mockResolvedValueOnce({
      id: 'm1',
      mimeType: 'video/mp4',
      storageKey: 'v.mp4',
    });
    mockedAxios.post.mockResolvedValueOnce({ headers: {}, data: {} } as any);
    await expect(
      provider.publish(
        { accessToken: encrypt('AT') } as any,
        { content: 'hi', mediaIds: ['m1'] },
      ),
    ).rejects.toThrow(/resumable upload URL/);
  });

  it('refreshTokens skips when expiry is far in the future', async () => {
    const { provider } = makeProvider();
    const account = {
      refreshToken: encrypt('RT'),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 6), // 6h ahead, > 30min
    } as any;
    const out = await provider.refreshTokens(account);
    expect(out).toBeNull();
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('refreshTokens calls Google when the token is near expiry', async () => {
    const { provider } = makeProvider();
    mockedAxios.post.mockResolvedValueOnce({
      data: { access_token: 'NEW', expires_in: 3600, scope: 'youtube.upload' },
    } as any);
    const account = {
      refreshToken: encrypt('RT'),
      expiresAt: new Date(Date.now() + 1000 * 60), // 1 min ahead
    } as any;
    const out = await provider.refreshTokens(account);
    expect(out?.accessToken).toEqual('NEW');
    expect(out?.expiresAt).toBeInstanceOf(Date);
  });

  it('fetchMetrics maps statistics fields and returns null on error', async () => {
    const { provider } = makeProvider();
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        items: [
          {
            statistics: { viewCount: '1234', likeCount: '56', commentCount: '7' },
          },
        ],
      },
    } as any);
    const ok = await provider.fetchMetrics(
      { accessToken: encrypt('AT') } as any,
      'VID',
    );
    expect(ok).toMatchObject({ impressions: 1234, likes: 56, comments: 7 });

    mockedAxios.get.mockRejectedValueOnce(new Error('quota exceeded'));
    const ko = await provider.fetchMetrics(
      { accessToken: encrypt('AT') } as any,
      'VID',
    );
    expect(ko).toBeNull();
  });
});
