import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { SocialProvider } from '@prisma/client';
import { IsArray, IsIn, IsObject, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { SuperAdminGuard } from './super-admin.guard';
import { AdminService } from './admin.service';

const PROVIDERS: SocialProvider[] = ['LINKEDIN', 'FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'TWITTER', 'YOUTUBE'];

class UpsertProviderConfigDto {
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

@Controller('admin')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('providers')
  list() {
    return this.admin.listProviderConfigs();
  }

  @Get('providers/:provider')
  get(@Param('provider') provider: string) {
    return this.admin.getProviderConfig(provider.toUpperCase() as SocialProvider);
  }

  @Post('providers')
  upsert(@CurrentUser() user: AuthUser, @Body() dto: UpsertProviderConfigDto) {
    return this.admin.upsertProviderConfig(dto, user.userId);
  }

  /** Hot-reload the cache without re-saving (useful after a manual DB edit). */
  @Post('providers/reload')
  reload() {
    return this.admin.reloadCache();
  }
}