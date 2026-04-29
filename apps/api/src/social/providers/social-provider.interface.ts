import { SocialAccount } from '@prisma/client';

export interface OAuthAuthorizeUrl {
  url: string;
  state: string;
}

export interface OAuthCallbackResult {
  providerUserId: string;
  displayName?: string;
  avatarUrl?: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scopes?: string;
  metadata?: Record<string, unknown>;
}

export interface PublishInput {
  content: string;
  mediaIds: string[]; // local MediaAsset ids — provider may need to upload
  /** Optional X / Twitter thread — additional tweets posted as replies. */
  thread?: string[];
}

export interface PublishResult {
  providerPostId: string;
  providerUrl?: string;
}

export interface PostMetricsSnapshot {
  impressions?: number;
  reach?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  clicks?: number;
  raw?: Record<string, unknown>;
}

export interface SocialProvider {
  /** Stable identifier matching the SocialProvider enum */
  readonly key: 'LINKEDIN' | 'FACEBOOK' | 'INSTAGRAM' | 'TIKTOK' | 'TWITTER' | 'BLUESKY' | 'YOUTUBE';

  /** Build the OAuth authorize URL for the user to begin the flow */
  buildAuthorizeUrl(input: { tenantId: string; userId: string }): OAuthAuthorizeUrl;

  /** Exchange the authorization code for tokens + user info */
  handleCallback(input: { code: string; state: string; tenantId: string }): Promise<OAuthCallbackResult>;

  /** Publish a post on behalf of an account */
  publish(account: SocialAccount, input: PublishInput): Promise<PublishResult>;

  /** Refresh tokens if needed; returns updated fields or null if not applicable */
  refreshTokens?(account: SocialAccount): Promise<Partial<OAuthCallbackResult> | null>;

  /**
   * Fetch engagement metrics for a published post. Returns null if the
   * provider does not expose metrics with the current scopes/tier.
   * Implementations should not throw on permission errors — return null
   * and let the metrics worker move on.
   */
  fetchMetrics?(
    account: SocialAccount,
    providerPostId: string,
  ): Promise<PostMetricsSnapshot | null>;
}
