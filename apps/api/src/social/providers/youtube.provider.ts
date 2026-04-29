import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { randomBytes } from 'crypto';
import { createReadStream, statSync } from 'fs';
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
import { ProviderEnvService } from '../../provider-env/provider-env.service';

const REFRESH_AHEAD_MS = 1000 * 60 * 30; // YouTube access tokens last ~1h

const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CHANNELS_URL = 'https://www.googleapis.com/youtube/v3/channels';
const VIDEOS_URL = 'https://www.googleapis.com/youtube/v3/videos';
const UPLOAD_URL = 'https://www.googleapis.com/upload/youtube/v3/videos';

/**
 * YouTube provider — uploads videos via the resumable upload protocol
 * (initiate → PUT bytes → resource). Designed primarily for Shorts: any
 * vertical clip ≤ 60 s with the `#Shorts` hashtag will be surfaced as a
 * Short by YouTube automatically.
 *
 * Required Google Cloud project setup:
 * - Enable the YouTube Data API v3
 * - OAuth consent screen in External or Internal mode
 * - OAuth client of type "Web application" with the configured redirect URI
 * - Scope: https://www.googleapis.com/auth/youtube.upload
 */
@Injectable()
export class YouTubeProvider implements SocialProvider {
  readonly key = 'YOUTUBE' as const;
  private readonly logger = new Logger(YouTubeProvider.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
    private readonly env: ProviderEnvService,
  ) {}

  buildAuthorizeUrl(input: { tenantId: string; userId: string }): OAuthAuthorizeUrl {
    const state = `${input.tenantId}:${input.userId}:${randomBytes(8).toString('hex')}`;
    const params = new URLSearchParams({
      client_id: this.requireEnv('YOUTUBE_CLIENT_ID'),
      redirect_uri: this.requireEnv('YOUTUBE_REDIRECT_URI'),
      response_type: 'code',
      access_type: 'offline', // required to get a refresh_token
      prompt: 'consent', // force refresh_token on every connect
      include_granted_scopes: 'true',
      scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',
      state,
    });
    return { url: `${AUTHORIZE_URL}?${params.toString()}`, state };
  }

  async handleCallback(input: { code: string; state: string }): Promise<OAuthCallbackResult> {
    const tokenRes = await axios.post(
      TOKEN_URL,
      new URLSearchParams({
        code: input.code,
        client_id: this.requireEnv('YOUTUBE_CLIENT_ID'),
        client_secret: this.requireEnv('YOUTUBE_CLIENT_SECRET'),
        redirect_uri: this.requireEnv('YOUTUBE_REDIRECT_URI'),
        grant_type: 'authorization_code',
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );
    const { access_token, refresh_token, expires_in, scope } = tokenRes.data;

    // Fetch the authenticated channel — we use the channel id as providerUserId
    // because that's what /videos endpoints scope around.
    const channels = await axios.get(CHANNELS_URL, {
      params: { part: 'snippet', mine: 'true' },
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const channel = channels.data?.items?.[0];
    if (!channel?.id) {
      throw new Error('YouTube did not return a channel for this account');
    }

    return {
      providerUserId: channel.id,
      displayName: channel.snippet?.title,
      avatarUrl: channel.snippet?.thumbnails?.default?.url,
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: expires_in ? new Date(Date.now() + expires_in * 1000) : undefined,
      scopes: scope,
    };
  }

  async publish(account: SocialAccount, input: PublishInput): Promise<PublishResult> {
    if (!input.mediaIds || input.mediaIds.length === 0) {
      throw new Error('YouTube requires a video');
    }
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id: input.mediaIds[0] } });
    if (!asset || !asset.mimeType.startsWith('video/')) {
      throw new Error('YouTube requires a video media asset');
    }
    const token = decrypt(account.accessToken);

    const filePath = this.media.absolutePath(asset.storageKey);
    const fileSize = statSync(filePath).size;

    // Title is mandatory (max 100 chars). Description carries the full content.
    // The first newline of `content` is treated as the title; the rest as description.
    const [firstLine, ...rest] = input.content.split('\n');
    const title = (firstLine || 'Untitled').slice(0, 95);
    const description = rest.join('\n').trim() || input.content;

    // Step 1 — initiate the resumable upload.
    const initRes = await axios.post(
      `${UPLOAD_URL}?uploadType=resumable&part=snippet,status`,
      {
        snippet: {
          title,
          description,
          // 22 = "People & Blogs" — safe default, supports Shorts.
          categoryId: '22',
        },
        status: {
          privacyStatus: 'public',
          selfDeclaredMadeForKids: false,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': asset.mimeType,
          'X-Upload-Content-Length': String(fileSize),
        },
        validateStatus: (s) => s === 200 || s === 201,
      },
    );
    const uploadUrl = initRes.headers['location'];
    if (!uploadUrl) throw new Error('YouTube did not return a resumable upload URL');

    // Step 2 — stream the bytes.
    const uploadRes = await axios.put(uploadUrl, createReadStream(filePath), {
      headers: {
        'Content-Type': asset.mimeType,
        'Content-Length': String(fileSize),
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    const videoId = uploadRes.data?.id;
    if (!videoId) throw new Error('YouTube upload did not return a video id');
    return {
      providerPostId: videoId,
      providerUrl: `https://youtu.be/${videoId}`,
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
        client_id: this.requireEnv('YOUTUBE_CLIENT_ID'),
        client_secret: this.requireEnv('YOUTUBE_CLIENT_SECRET'),
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );
    const { access_token, expires_in, scope } = res.data;
    return {
      accessToken: access_token,
      // Google does NOT rotate refresh tokens here; keep the existing one.
      expiresAt: expires_in ? new Date(Date.now() + expires_in * 1000) : undefined,
      scopes: scope,
    };
  }

  async fetchMetrics(
    account: SocialAccount,
    providerPostId: string,
  ): Promise<PostMetricsSnapshot | null> {
    try {
      const token = decrypt(account.accessToken);
      const res = await axios.get(VIDEOS_URL, {
        params: { part: 'statistics', id: providerPostId },
        headers: { Authorization: `Bearer ${token}` },
      });
      const stats = res.data?.items?.[0]?.statistics;
      if (!stats) return null;
      return {
        impressions: stats.viewCount ? Number(stats.viewCount) : undefined,
        likes: stats.likeCount ? Number(stats.likeCount) : undefined,
        comments: stats.commentCount ? Number(stats.commentCount) : undefined,
        raw: stats,
      };
    } catch (err: any) {
      this.logger.debug?.(`YouTube metrics unavailable: ${err?.message ?? err}`);
      return null;
    }
  }

  private requireEnv(name: string): string {
    return this.env.require(name);
  }
}
