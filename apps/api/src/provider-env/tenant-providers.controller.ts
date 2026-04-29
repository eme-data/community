import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { SocialProvider } from '@prisma/client';
import { IsArray, IsIn, IsObject, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { TenantProvidersService } from './tenant-providers.service';

const PROVIDERS: SocialProvider[] = [
  'LINKEDIN',
  'FACEBOOK',
  'INSTAGRAM',
  'TIKTOK',
  'TWITTER',
  'YOUTUBE',
];

class UpsertTenantProviderConfigDto {
  @IsString()
  @IsIn(PROVIDERS)
  provider!: SocialProvider;

  @IsObject()
  values!: Record<string, string>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  encryptedKeys?: string[];
}

@Controller('tenant-providers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'ADMIN')
export class TenantProvidersController {
  constructor(private readonly svc: TenantProvidersService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.svc.list(user.tenantId);
  }

  @Get(':provider')
  get(@CurrentUser() user: AuthUser, @Param('provider') provider: string) {
    return this.svc.get(user.tenantId, provider.toUpperCase() as SocialProvider);
  }

  @Post()
  upsert(@CurrentUser() user: AuthUser, @Body() dto: UpsertTenantProviderConfigDto) {
    return this.svc.upsert(user.tenantId, dto, user.userId);
  }

  /** Drop the tenant override and fall back to the platform-shared credentials. */
  @Delete(':provider')
  reset(@CurrentUser() user: AuthUser, @Param('provider') provider: string) {
    return this.svc.reset(user.tenantId, provider.toUpperCase() as SocialProvider);
  }
}
