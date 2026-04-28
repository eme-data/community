import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { IsIn, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { BillingService } from './billing.service';

class CheckoutDto {
  @IsString() @IsIn(['STARTER', 'PRO']) plan!: 'STARTER' | 'PRO';
}

@Controller('billing')
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  async status(@CurrentUser() user: AuthUser) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: {
        plan: true,
        subscriptionStatus: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
        stripeCustomerId: true,
      },
    });
    return { ...tenant, billingEnabled: this.billing.isEnabled() };
  }

  @Post('checkout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN')
  checkout(@CurrentUser() user: AuthUser, @Body() dto: CheckoutDto) {
    return this.billing.createCheckoutSession(user.tenantId, user.userId, dto.plan);
  }

  @Post('portal')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN')
  portal(@CurrentUser() user: AuthUser) {
    return this.billing.createPortalSession(user.tenantId);
  }

  /**
   * Stripe webhook. The controller is mounted with the global /api prefix so
   * the public URL is https://<host>/api/billing/webhook. Stripe needs the
   * RAW body to verify the signature — we apply a raw-body middleware on
   * just this route in main.ts.
   */
  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) throw new BadRequestException('Missing stripe-signature header');
    const raw = (req as any).rawBody as Buffer | undefined;
    if (!raw) throw new BadRequestException('Raw body unavailable');
    const event = this.billing.constructEvent(raw, signature);
    await this.billing.handleEvent(event);
    return { received: true };
  }
}
