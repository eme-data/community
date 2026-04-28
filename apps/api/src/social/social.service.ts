import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SocialAccount, SocialProvider as ProviderEnum } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LinkedInProvider } from './providers/linkedin.provider';
import { FacebookProvider, InstagramProvider } from './providers/meta.provider';
import { TikTokProvider } from './providers/tiktok.provider';
import { SocialProvider, PublishInput, PublishResult } from './providers/social-provider.interface';
import { encrypt } from './crypto.util';

@Injectable()
export class SocialService {
  private readonly providers: Record<ProviderEnum, SocialProvider | null>;

  constructor(
    private readonly prisma: PrismaService,
    linkedin: LinkedInProvider,
    facebook: FacebookProvider,
    instagram: InstagramProvider,
    tiktok: TikTokProvider,
  ) {
    this.providers = {
      LINKEDIN: linkedin,
      FACEBOOK: facebook,
      INSTAGRAM: instagram,
      TIKTOK: tiktok,
      TWITTER: null,
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
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(tenantId: string, accountId: string) {
    const acc = await this.prisma.socialAccount.findFirst({ where: { id: accountId, tenantId } });
    if (!acc) throw new NotFoundException('Account not found');
    await this.prisma.socialAccount.delete({ where: { id: accountId } });
    return { ok: true };
  }

  publish(account: SocialAccount, input: PublishInput): Promise<PublishResult> {
    return this.getProvider(account.provider).publish(account, input);
  }
}
