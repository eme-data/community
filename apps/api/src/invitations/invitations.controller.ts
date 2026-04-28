import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { InvitationsService } from './invitations.service';

class CreateInvitationDto {
  @IsEmail() email!: string;
  @IsString() @IsIn(['ADMIN', 'EDITOR', 'VIEWER']) role!: Role;
}

class AcceptInvitationDto {
  @IsString() token!: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() @MinLength(8) password?: string;
}

@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateInvitationDto) {
    return this.invitations.create(user.tenantId, user.userId, dto.email, dto.role);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN')
  list(@CurrentUser() user: AuthUser) {
    return this.invitations.list(user.tenantId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN')
  revoke(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.invitations.revoke(user.tenantId, id);
  }

  /** Public — frontend reads this to show the invitee what they're joining. */
  @Get('preview')
  @Throttle({ auth: { limit: 20, ttl: 60_000 } })
  preview(@Query('token') token: string) {
    return this.invitations.preview(token);
  }

  /** Public — accepts the invite, optionally creating the user. */
  @Post('accept')
  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  accept(@Body() dto: AcceptInvitationDto) {
    return this.invitations.accept(dto.token, { name: dto.name, password: dto.password });
  }
}
