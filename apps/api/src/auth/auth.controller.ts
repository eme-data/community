import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsEmail, IsString, MinLength, Matches } from 'class-validator';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import { TwoFactorService } from './twofa.service';

class RegisterDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
  @IsString() name?: string;
  @IsString() tenantName!: string;
  @IsString() @Matches(/^[a-z0-9-]+$/, { message: 'slug must be lowercase alphanumeric with dashes' })
  tenantSlug!: string;
}

class LoginDto {
  @IsEmail() email!: string;
  @IsString() password!: string;
}

class ForgotPasswordDto {
  @IsEmail() email!: string;
}

class ResetPasswordDto {
  @IsString() token!: string;
  @IsString() @MinLength(8) password!: string;
}

class SwitchTenantDto {
  @IsString() tenantId!: string;
}

class TwoFactorVerifyDto {
  @IsString() challenge!: string;
  @IsString() code!: string;
}

class TwoFactorCodeDto {
  @IsString() code!: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly twofa: TwoFactorService,
  ) {}

  @Post('register')
  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  @Throttle({ auth: { limit: 10, ttl: 60_000 } })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: { userId: string; tenantId: string }) {
    return user;
  }

  @Post('switch-tenant')
  @UseGuards(JwtAuthGuard)
  switchTenant(@CurrentUser() user: { userId: string }, @Body() dto: SwitchTenantDto) {
    return this.auth.switchTenant(user.userId, dto.tenantId);
  }

  @Post('password/forgot')
  @Throttle({ auth: { limit: 3, ttl: 60_000 } })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.requestPasswordReset(dto.email);
  }

  @Post('password/reset')
  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.token, dto.password);
  }

  @Post('2fa/verify')
  @Throttle({ auth: { limit: 10, ttl: 60_000 } })
  verifyTwoFactor(@Body() dto: TwoFactorVerifyDto) {
    return this.auth.verifyTwoFactor(dto.challenge, dto.code);
  }

  @Post('2fa/setup')
  @UseGuards(JwtAuthGuard)
  setupTwoFactor(@CurrentUser() user: { userId: string }) {
    return this.twofa.beginSetup(user.userId);
  }

  @Post('2fa/setup/confirm')
  @UseGuards(JwtAuthGuard)
  confirmTwoFactor(@CurrentUser() user: { userId: string }, @Body() dto: TwoFactorCodeDto) {
    return this.twofa.confirmSetup(user.userId, dto.code);
  }

  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  disableTwoFactor(@CurrentUser() user: { userId: string }, @Body() dto: TwoFactorCodeDto) {
    return this.twofa.disable(user.userId, dto.code);
  }
}
