import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { randomBytes } from 'crypto';
import { SocialAccount } from '@prisma/client';
import { decrypt } from '../crypto.util';
import {
  SocialProvider,
  OAuthAuthorizeUrl,
  OAuthCallbackResult,
  PostMetricsSnapshot,
  PublishInput,
  PublishResult,
} from './social-provider.interface';

const REFRESH_AHEAD_MS = 1000 * 60 * 60 * 24 * 7; // refresh if expiring within 7 days

const AUTHORIZE_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';
const UGC_POSTS_URL = 'https://api.linkedin.com/v2/ugcPosts';

@Injectable()
export class LinkedInProvider implements SocialProvider {
  readonly key = 'LINKEDIN' as const;
  private readonly logger = new Logger(LinkedInProvider.name);

  buildAuthorizeUrl(input: { tenantId: string; userId: string }): OAuthAuthorizeUrl {
    const state = `${input.tenantId}:${input.userId}:${randomBytes(8).toString('hex')}`;
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.requireEnv('LINKEDIN_CLIENT_ID'),
      redirect_uri: this.requireEnv('LINKEDIN_REDIRECT_URI'),
      state,
      scope: 'openid profile email w_member_social',
    });
    return { url: `${AUTHORIZE_URL}?${params.toString()}`, state };
  }

  async handleCallback(input: { code: string; state: string }): Promise<OAuthCallbackResult> {
    const tokenRes = await axios.post(
      TOKEN_URL,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: input.code,
        redirect_uri: this.requireEnv('LINKEDIN_REDIRECT_URI'),
        client_id: this.requireEnv('LINKEDIN_CLIENT_ID'),
        client_secret: this.requireEnv('LINKEDIN_CLIENT_SECRET'),
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );
    const { access_token, expires_in, refresh_token, scope } = tokenRes.data;

    const me = await axios.get(USERINFO_URL, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    return {
      providerUserId: me.data.sub,
      displayName: me.data.name,
      avatarUrl: me.data.picture,
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: expires_in ? new Date(Date.now() + expires_in * 1000) : undefined,
      scopes: scope,
    };
  }

  async publish(account: SocialAccount, input: PublishInput): Promise<PublishResult> {
    const token = decrypt(account.accessToken);
    const author = `urn:li:person:${account.providerUserId}`;

    const body = {
      author,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: input.content },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    };

    const res = await axios.post(UGC_POSTS_URL, body, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Restli-Protocol-Version': '2.0.0',
        'Content-Type': 'application/json',
      },
    });

    const id = res.headers['x-restli-id'] || res.data?.id;
    return {
      providerPostId: id,
      providerUrl: id ? `https://www.linkedin.com/feed/update/${encodeURIComponent(id)}` : undefined,
    };
  }

  async refreshTokens(account: SocialAccount): Promise<Partial<OAuthCallbackResult> | null> {
    if (!account.refreshToken) return null;
    if (account.expiresAt && account.expiresAt.getTime() - Date.now() > REFRESH_AHEAD_MS) {
      return null; // not yet due
    }
    const refreshToken = decrypt(account.refreshToken);
    const res = await axios.post(
      TOKEN_URL,
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.requireEnv('LINKEDIN_CLIENT_ID'),
        client_secret: this.requireEnv('LINKEDIN_CLIENT_SECRET'),
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );
    const { access_token, expires_in, refresh_token } = res.data;
    return {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: expires_in ? new Date(Date.now() + expires_in * 1000) : undefined,
    };
  }

  async fetchMetrics(
    account: SocialAccount,
    providerPostId: string,
  ): Promise<PostMetricsSnapshot | null> {
    // socialActions returns counters scoped to a UGC post URN. Some app tiers
    // get 403; we silently degrade in that case.
    try {
      const token = decrypt(account.accessToken);
      const urn = encodeURIComponent(providerPostId);
      const res = await axios.get(`https://api.linkedin.com/v2/socialActions/${urn}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      });
      return {
        likes: res.data?.likesSummary?.totalLikes,
        comments: res.data?.commentsSummary?.totalFirstLevelComments,
        raw: res.data,
      };
    } catch (err: any) {
      this.logger.debug?.(`LinkedIn metrics unavailable: ${err?.message ?? err}`);
      return null;
    }
  }

  private requireEnv(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env var ${name}`);
    return v;
  }
}
