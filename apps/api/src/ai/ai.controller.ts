import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ArrayMaxSize, IsArray, IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { AIService } from './ai.service';

class HashtagsDto {
  @IsString() @MinLength(1) @MaxLength(4000) content!: string;
  @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) networks!: string[];
}

class RewriteDto {
  @IsString() @MinLength(1) @MaxLength(4000) content!: string;
  @IsString() @IsIn(['LINKEDIN', 'FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'TWITTER', 'THREAD'])
  network!: string;
  @IsString() @IsIn(['professional', 'casual', 'enthusiastic', 'informative', 'witty'])
  tone!: string;
}

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AIController {
  constructor(private readonly ai: AIService) {}

  @Get('status')
  status() {
    return { enabled: this.ai.isEnabled() };
  }

  @Post('hashtags')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'EDITOR')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async hashtags(@CurrentUser() user: AuthUser, @Body() dto: HashtagsDto) {
    return { hashtags: await this.ai.suggestHashtags(user.tenantId, dto.content, dto.networks) };
  }

  @Post('rewrite')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'EDITOR')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async rewrite(@CurrentUser() user: AuthUser, @Body() dto: RewriteDto) {
    return this.ai.rewrite(user.tenantId, dto.content, dto.network, dto.tone);
  }
}
