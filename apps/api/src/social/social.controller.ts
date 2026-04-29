import { BadRequestException, Body, Controller, Delete, Get, HttpException, HttpStatus, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { SocialProvider } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { SocialService } from './social.service';
import { ProviderEnvService } from '../provider-env/provider-env.service';

const PROVIDER_PATH: Record<string, SocialProvider> = {
  linkedin: 'LINKEDIN',
  facebook: 'FACEBOOK',
  instagram: 'INSTAGRAM',
  tiktok: 'TIKTOK',
  twitter: 'TWITTER',
  bluesky: 'BLUESKY',
  youtube: 'YOUTUBE',
};

const PROVIDER_ENV_VARS: Record<string, string[]> = {
  LINKEDIN: ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET', 'LINKEDIN_REDIRECT_URI'],
  FACEBOOK: ['META_APP_ID', 'META_APP_SECRET', 'META_REDIRECT_URI'],
  INSTAGRAM: ['META_APP_ID', 'META_APP_SECRET', 'META_REDIRECT_URI'],
  TIKTOK: ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET', 'TIKTOK_REDIRECT_URI'],
  TWITTER: ['TWITTER_CLIENT_ID', 'TWITTER_CLIENT_SECRET', 'TWITTER_REDIRECT_URI'],
  YOUTUBE: ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REDIRECT_URI'],
};

function missingEnvVars(provider: SocialProvider, env: ProviderEnvService): string[] {
  const required = PROVIDER_ENV_VARS[provider] ?? [];
  return env.missing(required);
}

@Controller('social')
export class SocialController {
  constructor(
    private readonly social: SocialService,
    private readonly env: ProviderEnvService,
  ) {}

  @Get('providers/status')
  @UseGuards(JwtAuthGuard)
  providersStatus() {
    return Object.entries(PROVIDER_PATH).map(([slug, key]) => ({
      provider: slug,
      configured: missingEnvVars(key, this.env).length === 0,
      missing: missingEnvVars(key, this.env),
    }));
  }

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

  /**
   * Manual Bluesky connection — no OAuth round-trip; the user enters their
   * handle and an app password (created at https://bsky.app/settings/app-passwords)
   * which we exchange against the PDS for an access JWT.
   */
  @Post('bluesky/connect')
  @UseGuards(JwtAuthGuard)
  async connectBluesky(
    @CurrentUser() user: AuthUser,
    @Body() body: { identifier?: string; appPassword?: string },
  ) {
    if (!body.identifier || !body.appPassword) {
      throw new BadRequestException('identifier and appPassword are required');
    }
    return this.social.connectBluesky(
      user.tenantId,
      user.userId,
      body.identifier.trim(),
      body.appPassword,
    );
  }

  /** Build OAuth URL — frontend redirects the browser there */
  @Get(':provider/authorize')
  @UseGuards(JwtAuthGuard)
  authorize(@CurrentUser() user: AuthUser, @Param('provider') provider: string) {
    const key = PROVIDER_PATH[provider];
    if (!key) throw new BadRequestException('Unknown provider');

    const missing = missingEnvVars(key, this.env);
    if (missing.length) {
      // 503 = "service not configured yet". The frontend surfaces the
      // missing env vars so the operator knows exactly what to add.
      throw new HttpException(
        {
          error: 'provider_not_configured',
          provider,
          missing,
          message: `Provider ${provider} is not configured. Add ${missing.join(', ')} to your environment.`,
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    try {
      return this.social.buildAuthorizeUrl(key, user.tenantId, user.userId);
    } catch (err: any) {
      const msg: string = err?.message ?? '';
      if (msg.startsWith('Missing env var ')) {
        throw new HttpException(
          {
            error: 'provider_not_configured',
            provider,
            missing: [msg.replace('Missing env var ', '')],
            message: msg,
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      throw err;
    }
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