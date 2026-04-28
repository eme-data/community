import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { randomBytes } from 'crypto';
import { SocialAccount } from '@prisma/client';
import { decrypt } from '../crypto.util';
import {
  SocialProvider,
  OAuthAuthorizeUrl,
  OAuthCallbackResult,
  PublishInput,
  PublishResult,
} from './social-provider.interface';

const VERSION = process.env.META_GRAPH_VERSION || 'v21.0';
const AUTHORIZE_URL = `https://www.facebook.com/${VERSION}/dialog/oauth`;
const TOKEN_URL = `https://graph.facebook.com/${VERSION}/oauth/access_token`;
const GRAPH_URL = `https://graph.facebook.com/${VERSION}`;

/**
 * Meta provider — handles BOTH Facebook page posts and Instagram business posts.
 * The same OAuth flow returns Pages access; on a successful link we expose the
 * pages and IG accounts the user manages and create one SocialAccount per target.
 *
 * For simplicity here, we implement the FB page-posting path. Instagram publishing
 * uses the same access token but a 2-step container/publish flow, see
 * MetaProvider.publishInstagram.
 */
@Injectable()
export class MetaProvider implements SocialProvider {
  // The factory binds an instance per concrete provider key
  readonly key: 'FACEBOOK' | 'INSTAGRAM';
  private readonly logger = new Logger(MetaProvider.name);

  constructor(key: 'FACEBOOK' | 'INSTAGRAM' = 'FACEBOOK') {
    this.key = key;
  }

  buildAuthorizeUrl(input: { tenantId: string; userId: string }): OAuthAuthorizeUrl {
    const state = `${this.key}:${input.tenantId}:${input.userId}:${randomBytes(8).toString('hex')}`;
    const scope =
      this.key === 'INSTAGRAM'
        ? 'instagram_basic,instagram_content_publish,pages_show_list,business_management'
        : 'pages_show_list,pages_manage_posts,pages_read_engagement,public_profile';

    const params = new URLSearchParams({
      client_id: this.requireEnv('META_APP_ID'),
      redirect_uri: this.requireEnv('META_REDIRECT_URI'),
      state,
      response_type: 'code',
      scope,
    });
    return { url: `${AUTHORIZE_URL}?${params.toString()}`, state };
  }

  async handleCallback(input: { code: string; state: string }): Promise<OAuthCallbackResult> {
    const tokenRes = await axios.get(TOKEN_URL, {
      params: {
        client_id: this.requireEnv('META_APP_ID'),
        client_secret: this.requireEnv('META_APP_SECRET'),
        redirect_uri: this.requireEnv('META_REDIRECT_URI'),
        code: input.code,
      },
    });
    const userToken = tokenRes.data.access_token;

    // Get the user's pages — pick the first as a default; the UI lets the user
    // re-link if they want a different page or IG account.
    const pages = await axios.get(`${GRAPH_URL}/me/accounts`, {
      params: { access_token: userToken, fields: 'id,name,access_token,instagram_business_account' },
    });
    const page = pages.data.data?.[0];
    if (!page) throw new Error('No Facebook page accessible with this account');

    if (this.key === 'INSTAGRAM') {
      const igId = page.instagram_business_account?.id;
      if (!igId) throw new Error('No Instagram business account linked to this page');
      return {
        providerUserId: igId,
        displayName: page.name,
        accessToken: page.access_token, // page token — long lived
        metadata: { pageId: page.id, pageName: page.name },
      };
    }

    return {
      providerUserId: page.id,
      displayName: page.name,
      accessToken: page.access_token,
      metadata: { pageName: page.name },
    };
  }

  async publish(account: SocialAccount, input: PublishInput): Promise<PublishResult> {
    if (account.provider === 'INSTAGRAM') {
      return this.publishInstagram(account, input);
    }
    return this.publishFacebookPage(account, input);
  }

  private async publishFacebookPage(account: SocialAccount, input: PublishInput): Promise<PublishResult> {
    const token = decrypt(account.accessToken);
    const res = await axios.post(`${GRAPH_URL}/${account.providerUserId}/feed`, null, {
      params: { message: input.content, access_token: token },
    });
    const id = res.data.id as string;
    return {
      providerPostId: id,
      providerUrl: `https://www.facebook.com/${id}`,
    };
  }

  private async publishInstagram(account: SocialAccount, input: PublishInput): Promise<PublishResult> {
    // IG publishing requires media. Without media we fall back to a placeholder error.
    // TODO: when MediaAsset upload is wired, push image_url/video_url here.
    if (!input.mediaIds || input.mediaIds.length === 0) {
      throw new Error('Instagram requires at least one media (image/video)');
    }
    throw new Error('Instagram publishing not yet implemented — see MetaProvider.publishInstagram');
  }

  private requireEnv(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env var ${name}`);
    return v;
  }
}

@Injectable()
export class FacebookProvider extends MetaProvider {
  constructor() {
    super('FACEBOOK');
  }
}

@Injectable()
export class InstagramProvider extends MetaProvider {
  constructor() {
    super('INSTAGRAM');
  }
}
