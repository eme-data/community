import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { MetricsService } from './metrics.service';

@Controller('metrics')
@UseGuards(JwtAuthGuard)
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get('posts/:id')
  forPost(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.metrics.forPost(user.tenantId, id);
  }

  @Get('recent')
  recent(@CurrentUser() user: AuthUser, @Query('limit') limit?: string) {
    return this.metrics.forTenant(user.tenantId, limit ? Number(limit) : 20);
  }
}
