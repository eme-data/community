import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Query('unread') unread?: string,
    @Query('limit') limit?: string,
  ) {
    const items = await this.svc.list(user.tenantId, user.userId, {
      unreadOnly: unread === '1' || unread === 'true',
      limit: limit ? Number(limit) : 50,
    });
    const unreadCount = await this.svc.unreadCount(user.tenantId, user.userId);
    return { items, unreadCount };
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() user: AuthUser) {
    return { count: await this.svc.unreadCount(user.tenantId, user.userId) };
  }

  @Post(':id/read')
  markRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.markRead(user.tenantId, user.userId, id);
  }

  @Post('read-all')
  markAllRead(@CurrentUser() user: AuthUser) {
    return this.svc.markAllRead(user.tenantId, user.userId);
  }
}
