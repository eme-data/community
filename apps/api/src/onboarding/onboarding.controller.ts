import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { IsIn, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { OnboardingService } from './onboarding.service';

class SetStepDto {
  @IsString()
  @IsIn(['welcome', 'verify', 'connect', 'first_post', 'done'])
  step!: 'welcome' | 'verify' | 'connect' | 'first_post' | 'done';
}

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  status(@CurrentUser() user: AuthUser) {
    return this.onboarding.getStatus(user.userId, user.tenantId);
  }

  @Post('email/send')
  @UseGuards(JwtAuthGuard)
  sendVerification(@CurrentUser() user: AuthUser) {
    return this.onboarding.sendVerificationEmail(user.userId);
  }

  /** Public — the link from the email is opened in any browser. */
  @Post('email/verify')
  verify(@Body('token') token: string) {
    return this.onboarding.verifyEmail(token);
  }

  /** Also accept GET so the link in the email can be one-click. */
  @Get('email/verify')
  verifyGet(@Query('token') token: string) {
    return this.onboarding.verifyEmail(token);
  }

  @Post('step')
  @UseGuards(JwtAuthGuard)
  setStep(@CurrentUser() user: AuthUser, @Body() dto: SetStepDto) {
    return this.onboarding.setStep(user.tenantId, dto.step);
  }

  @Post('complete')
  @UseGuards(JwtAuthGuard)
  complete(@CurrentUser() user: AuthUser) {
    return this.onboarding.complete(user.tenantId);
  }
}
