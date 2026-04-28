import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { TenantsService } from './tenants.service';

@Controller('tenants')
@UseGuards(JwtAuthGuard)
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.tenants.listForUser(user.userId);
  }

  @Get('current')
  current(@CurrentUser() user: AuthUser) {
    return this.tenants.findById(user.tenantId);
  }
}
