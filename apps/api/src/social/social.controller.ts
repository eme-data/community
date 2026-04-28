import { Controller, Delete, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { SocialProvider } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { SocialService } from './social.service';

const PROVIDER_PATH: Record<string, SocialProvider> = {
  linkedin: 'LINKEDIN',
  facebook: 'FACEBOOK',
  instagram: 'INSTAGRAM',
  tiktok: 'TIKTOK',
  twitter: 'TWITTER',
};

@Controller('social')
export class SocialController {
  constructor(private readonly social: SocialService) {}

  @Get('accounts')
  @UseGuards(JwtAuthGuard)
  list(@CurrentUser() user: AuthUser) {
    return this.social.list(user.tenantId);
  }

  @Delete('accounts/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.social.remove(user.tenantId, id, user.userId);
  }

  /** Build OAuth URL — frontend redirects the browser there */
  @Get(':provider/authorize')
  @UseGuards(JwtAuthGuard)
  authorize(@CurrentUser() user: AuthUser, @Param('provider') provider: string) {
    const key = PROVIDER_PATH[provider];
    if (!key) return { error: 'Unknown provider' };
    return this.social.buildAuthorizeUrl(key, user.tenantId, user.userId);
  }

  /**
   * OAuth callback. The provider redirects the BROWSER here, so we don't
   * have a JWT — we rely on the `state` param to know which tenant/user
   * the connection belongs to. After success we redirect to the web UI.
   */
  @Get(':provider/callback')
  async callback(
    @Param('provider') provider: string,
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const key = PROVIDER_PATH[provider];
    const webBase = process.env.APP_URL || 'http://localhost:3000';
    if (!key || !code || !state) {
      return res.redirect(`${webBase}/accounts?error=invalid_callback`);
    }
    try {
      await this.social.handleCallback(key, code, state);
      return res.redirect(`${webBase}/accounts?connected=${provider}`);
    } catch (err: any) {
      const msg = encodeURIComponent(err?.message ?? 'oauth_failed');
      return res.redirect(`${webBase}/accounts?error=${msg}`);
    }
  }
}
