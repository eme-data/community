import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SocialService } from '../social/social.service';

@Injectable()
export class TokenRefreshService {
  private readonly logger = new Logger(TokenRefreshService.name);

  constructor(private readonly social: SocialService) {}

  /**
   * Refresh OAuth tokens hourly. Providers decide which accounts are due —
   * this service just loops and logs the result.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async run() {
    try {
      const refreshed = await this.social.refreshExpiring();
      if (refreshed > 0) this.logger.log(`Refreshed ${refreshed} OAuth tokens`);
    } catch (err: any) {
      this.logger.error(`Token refresh sweep failed: ${err?.message ?? err}`);
    }
  }
}
