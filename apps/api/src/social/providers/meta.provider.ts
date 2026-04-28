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
  PostMetricsSnapshot,
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

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly media: MediaService,
    key: 'FACEBOOK' | 'INSTAGRAM' = 'FACEBOOK',
  ) {
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
    if (!input.mediaIds || input.mediaIds.length === 0) {
      throw new Error('Instagram requires at least one media (image/video)');
    }
    const token = decrypt(account.accessToken);
    const igUserId = account.providerUserId;

    const assets = await this.prisma.mediaAsset.findMany({
      where: { id: { in: input.mediaIds } },
    });
    if (assets.length === 0) throw new Error('No accessible media');

    // Single-media post
    if (assets.length === 1) {
      const a = assets[0];
      const isVideo = a.mimeType.startsWith('video/');
      const containerRes = await axios.post(`${GRAPH_URL}/${igUserId}/media`, null, {
        params: {
          [isVideo ? 'video_url' : 'image_url']: this.media.publicUrl(a.id),
          media_type: isVideo ? 'REELS' : undefined,
          caption: input.content,
          access_token: token,
        },
      });
      const containerId = containerRes.data.id as string;

      // For videos IG needs a poll on container status, but for images publish is immediate.
      if (isVideo) {
        await this.waitForContainerReady(containerId, token);
      }

      const publishRes = await axios.post(`${GRAPH_URL}/${igUserId}/media_publish`, null, {
        params: { creation_id: containerId, access_token: token },
      });
      const id = publishRes.data.id as string;
      return { providerPostId: id, providerUrl: `https://www.instagram.com/p/${id}` };
    }

    // Carousel (2-10 media)
    const childIds: string[] = [];
    for (const a of assets.slice(0, 10)) {
      const isVideo = a.mimeType.startsWith('video/');
      const c = await axios.post(`${GRAPH_URL}/${igUserId}/media`, null, {
        params: {
          [isVideo ? 'video_url' : 'image_url']: this.media.publicUrl(a.id),
          is_carousel_item: true,
          access_token: token,
        },
      });
      childIds.push(c.data.id);
    }
    const carousel = await axios.post(`${GRAPH_URL}/${igUserId}/media`, null, {
      params: {
        media_type: 'CAROUSEL',
        children: childIds.join(','),
        caption: input.content,
        access_token: token,
      },
    });
    const publishRes = await axios.post(`${GRAPH_URL}/${igUserId}/media_publish`, null, {
      params: { creation_id: carousel.data.id, access_token: token },
    });
    return { providerPostId: publishRes.data.id };
  }

  async fetchMetrics(
    account: SocialAccount,
    providerPostId: string,
  ): Promise<PostMetricsSnapshot | null> {
    const token = decrypt(account.accessToken);
    try {
      if (account.provider === 'INSTAGRAM') {
        // IG insights: impressions, reach, likes, comments — Reels also expose plays.
        const metricList = 'impressions,reach,likes,comments,saved,shares';
        const res = await axios.get(`${GRAPH_URL}/${providerPostId}/insights`, {
          params: { metric: metricList, access_token: token },
        });
        const data: Record<string, number> = {};
        for (const m of res.data?.data ?? []) {
          data[m.name] = m.values?.[0]?.value ?? 0;
        }
        return {
          impressions: data.impressions,
          reach: data.reach,
          likes: data.likes,
          comments: data.comments,
          shares: data.shares,
          raw: data,
        };
      }
      // Facebook page post insights — these names are stable for page posts.
      const metricList = 'post_impressions,post_impressions_unique,post_clicks,post_engaged_users';
      const res = await axios.get(`${GRAPH_URL}/${providerPostId}/insights`, {
        params: { metric: metricList, access_token: token },
      });
      const data: Record<string, number> = {};
      for (const m of res.data?.data ?? []) {
        data[m.name] = m.values?.[0]?.value ?? 0;
      }
      return {
        impressions: data.post_impressions,
        reach: data.post_impressions_unique,
        clicks: data.post_clicks,
        raw: data,
      };
    } catch (err: any) {
      this.logger.debug?.(`Meta metrics unavailable for ${providerPostId}: ${err?.message ?? err}`);
      return null;
    }
  }

  /** Poll a video container until IG reports it's ready (or fail after a timeout). */
  private async waitForContainerReady(containerId: string, token: string): Promise<void> {
    const maxAttempts = 30; // ~2.5 min at 5s
    for (let i = 0; i < maxAttempts; i++) {
      const res = await axios.get(`${GRAPH_URL}/${containerId}`, {
        params: { fields: 'status_code', access_token: token },
      });
      const status = res.data.status_code;
      if (status === 'FINISHED') return;
      if (status === 'ERROR' || status === 'EXPIRED') {
        throw new Error(`IG container failed: ${status}`);
      }
      await new Promise((r) => setTimeout(r, 5000));
    }
    throw new Error('IG container did not become ready in time');
  }

  private requireEnv(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env var ${name}`);
    return v;
  }
}

@Injectable()
export class FacebookProvider extends MetaProvider {
  constructor(prisma: PrismaService, media: MediaService) {
    super(prisma, media, 'FACEBOOK');
  }
}

@Injectable()
export class InstagramProvider extends MetaProvider {
  constructor(prisma: PrismaService, media: MediaService) {
    super(prisma, media, 'INSTAGRAM');
  }
}
