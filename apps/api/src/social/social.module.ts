import { Module, forwardRef } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { AuditModule } from '../audit/audit.module';
import { SocialController } from './social.controller';
import { SocialService } from './social.service';
import { LinkedInProvider } from './providers/linkedin.provider';
import { FacebookProvider, InstagramProvider } from './providers/meta.provider';
import { TikTokProvider } from './providers/tiktok.provider';
import { TwitterProvider } from './providers/twitter.provider';
import { BlueskyProvider } from './providers/bluesky.provider';

@Module({
  imports: [MediaModule, AuditModule],
  controllers: [SocialController],
  providers: [
    SocialService,
    LinkedInProvider,
    FacebookProvider,
    InstagramProvider,
    TikTokProvider,
    TwitterProvider,
    BlueskyProvider,
  ],
  exports: [SocialService],
})
export class SocialModule {}
