import { Body, Controller, Delete, Get, Patch, UseGuards } from '@nestjs/common';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { TenantsService } from './tenants.service';

class UpdateTenantDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsBoolean() requireApproval?: boolean;
  // brandVoice is a free-form JSON object: { tone, guidelines, doNotMention[], examples[] }.
  // We accept any object here; AI service applies its own shape expectations.
  @IsOptional() brandVoice?: unknown;
}

class DeleteTenantDto {
  @IsString() confirmation!: string; // must equal the tenant slug
}

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

  @Patch('current')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateTenantDto) {
    return this.tenants.update(user.tenantId, dto);
  }

  @Delete('current')
  @UseGuards(RolesGuard)
  @Roles('OWNER')
  deleteTenant(@CurrentUser() user: AuthUser, @Body() dto: DeleteTenantDto) {
    return this.tenants.deleteWithConfirmation(user.tenantId, dto.confirmation);
  }
}
