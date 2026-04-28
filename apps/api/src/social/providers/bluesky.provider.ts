import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { SocialAccount } from '@prisma/client';
import { decrypt } from '../crypto.util';
import {
  SocialProvider,
  OAuthAuthorizeUrl,
  OAuthCallbackResult,
  PublishInput,
  PublishResult,
} from './social-provider.interface';

const PDS_URL = process.env.BLUESKY_PDS_URL || 'https://bsky.social';

/**
 * Bluesky provider — uses the AT Protocol with app passwords (handle + app
 * password) rather than OAuth. The standard buildAuthorizeUrl/handleCallback
 * pair doesn't apply: connection happens via the dedicated POST endpoint
 * /social/bluesky/connect which accepts { identifier, appPassword } and
 * calls com.atproto.server.createSession.
 *
 * App passwords are issued by users at https://bsky.app/settings/app-passwords
 * and can be revoked independently of the main account password.
 */
@Injectable()
export class BlueskyProvider implements SocialProvider {
  readonly key = 'BLUESKY' as const;
  private readonly logger = new Logger(BlueskyProvider.name);

  buildAuthorizeUrl(): OAuthAuthorizeUrl {
    // Bluesky uses a manual app-password flow; the frontend redirects users
    // to /accounts/bluesky/connect to enter their handle + app password.
    const webBase = process.env.APP_URL || 'http://localhost:3000';
    return { url: `${webBase}/accounts/bluesky/connect`, state: '' };
  }

  async handleCallback(): Promise<OAuthCallbackResult> {
    throw new Error('Bluesky uses the manual connect flow — see /social/bluesky/connect');
  }

  /** Used by the controller to exchange a handle + app password for tokens. */
  async createSession(identifier: string, appPassword: string): Promise<OAuthCallbackResult> {
    const res = await axios.post(
      `${PDS_URL}/xrpc/com.atproto.server.createSession`,
      { identifier, password: appPassword },
      { headers: { 'Content-Type': 'application/json' } },
    );
    const { did, handle, accessJwt, refreshJwt } = res.data;
    const profile = await axios
      .get(`${PDS_URL}/xrpc/app.bsky.actor.getProfile`, {
        params: { actor: did },
        headers: { Authorization: `Bearer ${accessJwt}` },
      })
      .catch(() => null);
    return {
      providerUserId: did,
      displayName: profile?.data?.displayName || handle,
      avatarUrl: profile?.data?.avatar,
      accessToken: accessJwt,
      refreshToken: refreshJwt,
      // Bluesky access JWTs are valid for ~2h; refresh JWTs much longer.
      expiresAt: new Date(Date.now() + 1000 * 60 * 90),
      metadata: { handle, pds: PDS_URL },
    };
  }

  async publish(account: SocialAccount, input: PublishInput): Promise<PublishResult> {
    const accessJwt = decrypt(account.accessToken);
    // Posts on Bluesky are limited to 300 graphemes — close enough to truncate at chars.
    const text = input.content.length > 300 ? input.content.slice(0, 297) + '...' : input.content;
    const record: Record<string, unknown> = {
      $type: 'app.bsky.feed.post',
      text,
      createdAt: new Date().toISOString(),
      langs: ['en'],
    };

    const res = await axios.post(
      `${PDS_URL}/xrpc/com.atproto.repo.createRecord`,
      {
        repo: account.providerUserId,
        collection: 'app.bsky.feed.post',
        record,
      },
      { headers: { Authorization: `Bearer ${accessJwt}`, 'Content-Type': 'application/json' } },
    );
    const uri = res.data?.uri as string | undefined;
    const cid = res.data?.cid as string | undefined;
    if (!uri) throw new Error('Bluesky did not return a post URI');

    // uri form: at://did:plc:xxx/app.bsky.feed.post/3kabcde — the public URL
    // uses the user's handle and the rkey (last path segment).
    const handle = (account.metadata as any)?.handle ?? account.providerUserId;
    const rkey = uri.split('/').pop();
    const providerUrl = rkey ? `https://bsky.app/profile/${handle}/post/${rkey}` : undefined;
    return { providerPostId: cid ? `${uri}|${cid}` : uri, providerUrl };
  }

  async refreshTokens(account: SocialAccount): Promise<Partial<OAuthCallbackResult> | null> {
    if (!account.refreshToken) return null;
    // Refresh slightly ahead of access-jwt expiry (~2h)
    if (account.expiresAt && account.expiresAt.getTime() - Date.now() > 30 * 60 * 1000) {
      return null;
    }
    const refreshJwt = decrypt(account.refreshToken);
    const res = await axios.post(
      `${PDS_URL}/xrpc/com.atproto.server.refreshSession`,
      null,
      { headers: { Authorization: `Bearer ${refreshJwt}` } },
    );
    return {
      accessToken: res.data.accessJwt,
      refreshToken: res.data.refreshJwt,
      expiresAt: new Date(Date.now() + 1000 * 60 * 90),
    };
  }
}
