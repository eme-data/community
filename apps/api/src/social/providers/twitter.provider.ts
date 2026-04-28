import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { createHash, randomBytes } from 'crypto';
import { SocialAccount } from '@prisma/client';
import { decrypt } from '../crypto.util';
import {
  SocialProvider,
  OAuthAuthorizeUrl,
  OAuthCallbackResult,
  PublishInput,
  PublishResult,
} from './social-provider.interface';

const AUTHORIZE_URL = 'https://twitter.com/i/oauth2/authorize';
const TOKEN_URL = 'https://api.twitter.com/2/oauth2/token';
const ME_URL = 'https://api.twitter.com/2/users/me';
const TWEET_URL = 'https://api.twitter.com/2/tweets';

const REFRESH_AHEAD_MS = 1000 * 60 * 30; // tokens last 2h, refresh 30 min ahead

// In-memory PKCE verifiers indexed by state. Sufficient for single-instance
// deployments; for multi-replica setups, persist these in Redis.
const pkceStore = new Map<string, string>();

@Injectable()
export class TwitterProvider implements SocialProvider {
  readonly key = 'TWITTER' as const;
  private readonly logger = new Logger(TwitterProvider.name);

  buildAuthorizeUrl(input: { tenantId: string; userId: string }): OAuthAuthorizeUrl {
    const state = `${input.tenantId}:${input.userId}:${randomBytes(8).toString('hex')}`;
    const codeVerifier = randomBytes(32).toString('hex');
    const codeChallenge = base64Url(createHash('sha256').update(codeVerifier).digest());
    pkceStore.set(state, codeVerifier);
    // Best-effort cleanup — drop verifiers after 10 minutes.
    setTimeout(() => pkceStore.delete(state), 10 * 60 * 1000).unref?.();

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.requireEnv('TWITTER_CLIENT_ID'),
      redirect_uri: this.requireEnv('TWITTER_REDIRECT_URI'),
      scope: 'tweet.read tweet.write users.read offline.access',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });
    return { url: `${AUTHORIZE_URL}?${params.toString()}`, state };
  }

  async handleCallback(input: { code: string; state: string }): Promise<OAuthCallbackResult> {
    const verifier = pkceStore.get(input.state);
    if (!verifier) throw new Error('Missing PKCE verifier — restart the OAuth flow');
    pkceStore.delete(input.state);

    const tokenRes = await axios.post(
      TOKEN_URL,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: input.code,
        redirect_uri: this.requireEnv('TWITTER_REDIRECT_URI'),
        client_id: this.requireEnv('TWITTER_CLIENT_ID'),
        code_verifier: verifier,
      }).toString(),
      {
        auth: {
          username: this.requireEnv('TWITTER_CLIENT_ID'),
          password: this.requireEnv('TWITTER_CLIENT_SECRET'),
        },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      },
    );
    const { access_token, refresh_token, expires_in, scope } = tokenRes.data;

    const me = await axios.get(ME_URL, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    return {
      providerUserId: me.data.data.id,
      displayName: me.data.data.name,
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: expires_in ? new Date(Date.now() + expires_in * 1000) : undefined,
      scopes: scope,
    };
  }

  async publish(account: SocialAccount, input: PublishInput): Promise<PublishResult> {
    const token = decrypt(account.accessToken);
    // X has a 280-char limit; truncate defensively rather than fail.
    const text = input.content.slice(0, 280);
    const res = await axios.post(
      TWEET_URL,
      { text },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
    );
    const id = res.data?.data?.id as string;
    return {
      providerPostId: id,
      providerUrl: id ? `https://twitter.com/i/status/${id}` : undefined,
    };
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
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.requireEnv('TWITTER_CLIENT_ID'),
      }).toString(),
      {
        auth: {
          username: this.requireEnv('TWITTER_CLIENT_ID'),
          password: this.requireEnv('TWITTER_CLIENT_SECRET'),
        },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      },
    );
    return {
      accessToken: res.data.access_token,
      refreshToken: res.data.refresh_token,
      expiresAt: res.data.expires_in ? new Date(Date.now() + res.data.expires_in * 1000) : undefined,
    };
  }

  private requireEnv(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env var ${name}`);
    return v;
  }
}

function base64Url(b: Buffer): string {
  return b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
