import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { SocialAccount, SocialProvider as ProviderEnum } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { LinkedInProvider } from './providers/linkedin.provider';
import { FacebookProvider, InstagramProvider } from './providers/meta.provider';
import { TikTokProvider } from './providers/tiktok.provider';
import { TwitterProvider } from './providers/twitter.provider';
import { BlueskyProvider } from './providers/bluesky.provider';
import { YouTubeProvider } from './providers/youtube.provider';
import {
  SocialProvider,
  PublishInput,
  PublishResult,
  PostMetricsSnapshot,
} from './providers/social-provider.interface';
import { encrypt } from './crypto.util';

@Injectable()
export class SocialService {
  private readonly logger = new Logger(SocialService.name);
  private readonly providers: Record<ProviderEnum, SocialProvider | null>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    linkedin: LinkedInProvider,
    facebook: FacebookProvider,
    instagram: InstagramProvider,
    tiktok: TikTokProvider,
    twitter: TwitterProvider,
    private readonly bluesky: BlueskyProvider,
    youtube: YouTubeProvider,
  ) {
    this.providers = {
      LINKEDIN: linkedin,
      FACEBOOK: facebook,
      INSTAGRAM: instagram,
      TIKTOK: tiktok,
      TWITTER: twitter,
      BLUESKY: bluesky,
      YOUTUBE: youtube,
    };
  }

  getProvider(key: ProviderEnum): SocialProvider {
    const p = this.providers[key];
    if (!p) throw new BadRequestException(`Provider ${key} is not configured`);
    return p;
  }

  buildAuthorizeUrl(provider: ProviderEnum, tenantId: string, userId: string) {
    return this.getProvider(provider).buildAuthorizeUrl({ tenantId, userId });
  }

  async handleCallback(provider: ProviderEnum, code: string, state: string) {
    // state format depends on provider but always begins with tenantId:userId
    // (or PROVIDER:tenantId:userId for Meta — handled below)
    const parts = state.split(':');
    let tenantId: string;
    let userId: string;
    if (provider === 'FACEBOOK' || provider === 'INSTAGRAM') {
      [, tenantId, userId] = parts;
    } else {
      [tenantId, userId] = parts;
    }
    if (!tenantId || !userId) throw new BadRequestException('Invalid OAuth state');

    const result = await this.getProvider(provider).handleCallback({ code, state });

    const account = await this.prisma.socialAccount.upsert({
      where: {
        tenantId_provider_providerUserId: {
          tenantId,
          provider,
          providerUserId: result.providerUserId,
        },
      },
      update: {
        accessToken: encrypt(result.accessToken),
        refreshToken: result.refreshToken ? encrypt(result.refreshToken) : null,
        expiresAt: result.expiresAt,
        scopes: result.scopes,
        displayName: result.displayName,
        avatarUrl: result.avatarUrl,
        metadata: result.metadata as any,
      },
      create: {
        tenantId,
        provider,
        providerUserId: result.providerUserId,
        accessToken: encrypt(result.accessToken),
        refreshToken: result.refreshToken ? encrypt(result.refreshToken) : null,
        expiresAt: result.expiresAt,
        scopes: result.scopes,
        displayName: result.displayName,
        avatarUrl: result.avatarUrl,
        metadata: result.metadata as any,
      },
    });
    await this.audit.log({
      tenantId,
      userId,
      action: 'social.account.connected',
      target: account.id,
      payload: { provider, displayName: account.displayName },
    });
    return account;
  }

  list(tenantId: string) {
    return this.prisma.socialAccount.findMany({
      where: { tenantId },
      select: {
        id: true,
        provider: true,
        providerUserId: true,
        displayName: true,
        avatarUrl: true,
        scopes: true,
        expiresAt: true,
        createdAt: true,
        refreshError: true,
        refreshFailedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(tenantId: string, accountId: string, userId?: string) {
    const acc = await this.prisma.socialAccount.findFirst({ where: { id: accountId, tenantId } });
    if (!acc) throw new NotFoundException('Account not found');
    await this.prisma.socialAccount.delete({ where: { id: accountId } });
    await this.audit.log({
      tenantId,
      userId,
      action: 'social.account.disconnected',
      target: accountId,
      payload: { provider: acc.provider, displayName: acc.displayName },
    });
    return { ok: true };
  }

  publish(account: SocialAccount, input: PublishInput): Promise<PublishResult> {
    return this.getProvider(account.provider).publish(account, input);
  }

  fetchMetrics(
    account: SocialAccount,
    providerPostId: string,
  ): Promise<PostMetricsSnapshot | null> {
    const p = this.getProvider(account.provider);
    if (!p.fetchMetrics) return Promise.resolve(null);
    return p.fetchMetrics(account, providerPostId);
  }

  /** Manual Bluesky connection — exchanges handle + app-password for tokens. */
  async connectBluesky(
    tenantId: string,
    userId: string,
    identifier: string,
    appPassword: string,
  ) {
    const result = await this.bluesky.createSession(identifier, appPassword);
    const account = await this.prisma.socialAccount.upsert({
      where: {
        tenantId_provider_providerUserId: {
          tenantId,
          provider: 'BLUESKY',
          providerUserId: result.providerUserId,
        },
      },
      update: {
        accessToken: encrypt(result.accessToken),
        refreshToken: result.refreshToken ? encrypt(result.refreshToken) : null,
        expiresAt: result.expiresAt,
        scopes: result.scopes,
        displayName: result.displayName,
        avatarUrl: result.avatarUrl,
        metadata: result.metadata as any,
      },
      create: {
        tenantId,
        provider: 'BLUESKY',
        providerUserId: result.providerUserId,
        accessToken: encrypt(result.accessToken),
        refreshToken: result.refreshToken ? encrypt(result.refreshToken) : null,
        expiresAt: result.expiresAt,
        scopes: result.scopes,
        displayName: result.displayName,
        avatarUrl: result.avatarUrl,
        metadata: result.metadata as any,
      },
    });
    await this.audit.log({
      tenantId,
      userId,
      action: 'social.account.connected',
      target: account.id,
      payload: { provider: 'BLUESKY', displayName: account.displayName },
    });
    return account;
  }

  /**
   * Refresh OAuth tokens for accounts whose tokens expire soon. Each provider
   * decides what "soon" means via its own `refreshTokens` implementation.
   * Returns the number of refreshed accounts.
   */
  async refreshExpiring(): Promise<number> {
    const horizon = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14); // look 14 days ahead
    const candidates = await this.prisma.socialAccount.findMany({
      where: {
        OR: [
          { expiresAt: { lte: horizon } },
          { expiresAt: null }, // still attempt — provider may decide to refresh anyway
        ],
        refreshToken: { not: null },
      },
    });

    let count = 0;
    for (const account of candidates) {
      const provider = this.providers[account.provider];
      if (!provider?.refreshTokens) continue;
      try {
        const updated = await provider.refreshTokens(account);
        if (!updated || !updated.accessToken) continue;
        await this.prisma.socialAccount.update({
          where: { id: account.id },
          data: {
            accessToken: encrypt(updated.accessToken),
            refreshToken: updated.refreshToken ? encrypt(updated.refreshToken) : account.refreshToken,
            expiresAt: updated.expiresAt ?? account.expiresAt,
            scopes: updated.scopes ?? account.scopes,
            refreshError: null,
            refreshFailedAt: null,
          },
        });
        count++;
      } catch (err: any) {
        const message = String(err?.message ?? err).slice(0, 500);
        this.logger.warn(
          `Refresh failed for ${account.provider} account ${account.id}: ${message}`,
        );
        // Only notify the first time we detect the failure — avoid spamming admins
        // every hour while the account stays broken.
        const wasHealthy = !account.refreshError;
        await this.prisma.socialAccount.update({
          where: { id: account.id },
          data: { refreshError: message, refreshFailedAt: new Date() },
        });
        if (wasHealthy) {
          await this.notifications.notifyAdmins(account.tenantId, {
            type: 'social.account.reauth_required',
            title: `Reconnexion requise — ${account.provider}`,
            body: `Le compte ${account.displayName ?? account.providerUserId} (${account.provider}) ne peut plus être rafraîchi : ${message}. Reconnectez-le pour continuer à publier.`,
            link: '/accounts',
          });
        }
      }
    }
    return count;
  }
}
