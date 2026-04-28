import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { WebhooksService, WEBHOOK_EVENTS } from './webhooks.service';

@Controller('webhooks')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'ADMIN')
export class WebhooksController {
  constructor(private readonly svc: WebhooksService) {}

  @Get('events')
  events() {
    return WEBHOOK_EVENTS;
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.svc.list(user.tenantId);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() body: { url: string; events: string[] },
  ) {
    return this.svc.create(user.tenantId, user.userId, body);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() patch: { url?: string; events?: string[]; active?: boolean },
  ) {
    return this.svc.update(user.tenantId, id, patch);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.remove(user.tenantId, id);
  }

  @Get(':id/deliveries')
  deliveries(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.listDeliveries(user.tenantId, id, limit ? Number(limit) : 50);
  }

  @Post(':id/deliveries/:deliveryId/redeliver')
  redeliver(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('deliveryId') deliveryId: string,
  ) {
    return this.svc.redeliver(user.tenantId, id, deliveryId);
  }
}
