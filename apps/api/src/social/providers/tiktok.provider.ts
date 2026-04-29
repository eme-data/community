import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { randomBytes } from 'crypto';
import { SocialAccount } from '@prisma/client';
import { decrypt } from '../crypto.util';
import { MediaService } from '../../media/media.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  SocialProvider,
  OAuthAuthorizeUrl,
  OAuthCallbackResult,
  PublishInput,
  PublishResult,
} from './social-provider.interface';
import { ProviderEnvService } from '../../provider-env/provider-env.service';

const REFRESH_AHEAD_MS = 1000 * 60 * 60 * 24; // TikTok access tokens are short-lived (24h)

const AUTHORIZE_URL = 'https://www.tiktok.com/v2/auth/authorize/';
const TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/';
const USERINFO_URL = 'https://open.tiktokapis.com/v2/user/info/';

/**
 * TikTok Content Posting API — see
 * https://developers.tiktok.com/doc/content-posting-api-get-started
 *
 * Posting requires a video upload. Plain-text posts are not supported by TikTok.
 * The publish() implementation here is a stub — wire it up once your MediaAsset
 * pipeline can produce video URLs that TikTok can fetch.
 */
@Injectable()
export class TikTokProvider implements SocialProvider {
  readonly key = 'TIKTOK' as const;
  private readonly logger = new Logger(TikTokProvider.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
    private readonly env: ProviderEnvService,
  ) {}

  buildAuthorizeUrl(input: { tenantId: string; userId: string }): OAuthAuthorizeUrl {
    const state = `${input.tenantId}:${input.userId}:${randomBytes(8).toString('hex')}`;
    const params = new URLSearchParams({
      client_key: this.requireEnv('TIKTOK_CLIENT_KEY'),
      redirect_uri: this.requireEnv('TIKTOK_REDIRECT_URI'),
      response_type: 'code',
      scope: 'user.info.basic,video.publish,video.upload',
      state,
    });
    return { url: `${AUTHORIZE_URL}?${params.toString()}`, state };
  }

  async handleCallback(input: { code: string; state: string }): Promise<OAuthCallbackResult> {
    const res = await axios.post(
      TOKEN_URL,
      new URLSearchParams({
        client_key: this.requireEnv('TIKTOK_CLIENT_KEY'),
        client_secret: this.requireEnv('TIKTOK_CLIENT_SECRET'),
        code: input.code,
        grant_type: 'authorization_code',
        redirect_uri: this.requireEnv('TIKTOK_REDIRECT_URI'),
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );
    const data = res.data;
    const accessToken = data.access_token;

    const me = await axios.get(USERINFO_URL, {
      params: { fields: 'open_id,union_id,avatar_url,display_name' },
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const u = me.data?.data?.user || {};

    return {
      providerUserId: u.open_id || data.open_id,
      displayName: u.display_name,
      avatarUrl: u.avatar_url,
      accessToken,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
      scopes: data.scope,
    };
  }

  async publish(account: SocialAccount, input: PublishInput): Promise<PublishResult> {
    if (!input.mediaIds || input.mediaIds.length === 0) {
      throw new Error('TikTok requires a video');
    }
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id: input.mediaIds[0] } });
    if (!asset || !asset.mimeType.startsWith('video/')) {
      throw new Error('TikTok requires a video media asset');
    }
    const token = decrypt(account.accessToken);
    const videoUrl = this.media.publicUrl(asset.id);

    // PULL_FROM_URL is the simplest path — TikTok fetches the file from us.
    // The URL must be publicly reachable via HTTPS in production.
    const initRes = await axios.post(
      'https://open.tiktokapis.com/v2/post/publish/video/init/',
      {
        post_info: {
          title: input.content.slice(0, 150),
          privacy_level: 'PUBLIC_TO_EVERYONE',
          disable_comment: false,
          disable_duet: false,
          disable_stitch: false,
        },
        source_info: { source: 'PULL_FROM_URL', video_url: videoUrl },
      },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
    );
    const publishId = initRes.data?.data?.publish_id as string;
    if (!publishId) throw new Error('TikTok did not return a publish_id');

    // Poll the status endpoint until TikTok says the post is fully published
    // or fails. Typical lead time: ~30s for short videos, longer for larger ones.
    await this.pollPublishStatus(publishId, token);
    return { providerPostId: publishId };
  }

  private async pollPublishStatus(publishId: string, token: string): Promise<void> {
    const maxAttempts = 60; // ~5 min at 5s
    for (let i = 0; i < maxAttempts; i++) {
      const res = await axios.post(
        'https://open.tiktokapis.com/v2/post/publish/status/fetch/',
        { publish_id: publishId },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
      );
      const status = res.data?.data?.status as string | undefined;
      if (status === 'PUBLISH_COMPLETE' || status === 'SEND_TO_USER_INBOX') return;
      if (status === 'FAILED') {
        const reason = res.data?.data?.fail_reason || 'unknown';
        throw new Error(`TikTok publishing failed: ${reason}`);
      }
      await new Promise((r) => setTimeout(r, 5000));
    }
    throw new Error('TikTok publishing did not complete in time');
  }

  async refreshTokens(account: SocialAccount): Promise<Partial<OAuthCallbackResult> | null> {
    if (!account.refreshToken) return null;
    if (account.expiresAt && account.expiresAt.getTime() - Date.now() > REFRESH_AHEAD_MS) {
      return null;
    }
    const refreshToken = decrypt(account.refreshToken);
    const res = await axios.post(
      TOKEN_URL,
      new URLSearchParams({
        client_key: this.requireEnv('TIKTOK_CLIENT_KEY'),
        client_secret: this.requireEnv('TIKTOK_CLIENT_SECRET'),
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );
    const data = res.data;
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
    };
  }

  private requireEnv(name: string): string {
    return this.env.require(name);
  }
}
