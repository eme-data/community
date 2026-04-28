import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { randomBytes } from 'crypto';
import { SocialAccount } from '@prisma/client';
import {
  SocialProvider,
  OAuthAuthorizeUrl,
  OAuthCallbackResult,
  PublishInput,
  PublishResult,
} from './social-provider.interface';

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

  async publish(_account: SocialAccount, _input: PublishInput): Promise<PublishResult> {
    throw new Error(
      'TikTok publishing is not implemented yet — TikTok requires a video upload via the Content Posting API.',
    );
  }

  private requireEnv(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env var ${name}`);
    return v;
  }
}
