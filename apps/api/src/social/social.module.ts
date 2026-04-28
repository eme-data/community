import { Module, forwardRef } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { SocialController } from './social.controller';
import { SocialService } from './social.service';
import { LinkedInProvider } from './providers/linkedin.provider';
import { FacebookProvider, InstagramProvider } from './providers/meta.provider';
import { TikTokProvider } from './providers/tiktok.provider';

@Module({
  imports: [MediaModule],
  controllers: [SocialController],
  providers: [
    SocialService,
    LinkedInProvider,
    FacebookProvider,
    InstagramProvider,
    TikTokProvider,
  ],
  exports: [SocialService],
})
export class SocialModule {}
