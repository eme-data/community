import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { Plan, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const PRICE_TO_PLAN: Record<string, Plan> = {};

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly stripe: Stripe | null;

  constructor(private readonly prisma: PrismaService) {
    const key = process.env.STRIPE_SECRET_KEY;
    this.stripe = key ? new Stripe(key, { apiVersion: '2025-02-24.acacia' }) : null;

    if (process.env.STRIPE_PRICE_STARTER) PRICE_TO_PLAN[process.env.STRIPE_PRICE_STARTER] = 'STARTER';
    if (process.env.STRIPE_PRICE_PRO) PRICE_TO_PLAN[process.env.STRIPE_PRICE_PRO] = 'PRO';
  }

  isEnabled() {
    return !!this.stripe;
  }

  private requireStripe(): Stripe {
    if (!this.stripe) throw new BadRequestException('Billing is not configured on this instance');
    return this.stripe;
  }

  async createCheckoutSession(tenantId: string, userId: string, plan: 'STARTER' | 'PRO') {
    const stripe = this.requireStripe();
    const priceId = plan === 'STARTER' ? process.env.STRIPE_PRICE_STARTER : process.env.STRIPE_PRICE_PRO;
    if (!priceId) throw new BadRequestException(`Price for ${plan} is not configured`);

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    let customerId = tenant.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: tenant.name,
        metadata: { tenantId },
      });
      customerId = customer.id;
      await this.prisma.tenant.update({ where: { id: tenantId }, data: { stripeCustomerId: customerId } });
    }

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/settings/billing?status=success`,
      cancel_url: `${appUrl}/settings/billing?status=cancelled`,
      client_reference_id: tenantId,
      metadata: { tenantId, plan },
      allow_promotion_codes: true,
    });
    return { url: session.url };
  }

  async createPortalSession(tenantId: string) {
    const stripe = this.requireStripe();
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant?.stripeCustomerId) {
      throw new BadRequestException('No Stripe customer for this tenant');
    }
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const session = await stripe.billingPortal.sessions.create({
      customer: tenant.stripeCustomerId,
      return_url: `${appUrl}/settings/billing`,
    });
    return { url: session.url };
  }

  /**
   * Process a verified Stripe webhook event. The controller is responsible for
   * verifying the signature using the raw request body before calling this.
   */
  async handleEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const tenantId = session.metadata?.tenantId || session.client_reference_id;
        if (tenantId && typeof session.subscription === 'string') {
          await this.syncSubscription(tenantId, session.subscription);
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.created':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const tenant = await this.prisma.tenant.findFirst({
          where: { stripeCustomerId: sub.customer as string },
        });
        if (tenant) await this.applySubscription(tenant.id, sub);
        break;
      }
      default:
        this.logger.debug(`Ignoring Stripe event ${event.type}`);
    }
  }

  private async syncSubscription(tenantId: string, subscriptionId: string) {
    const stripe = this.requireStripe();
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    await this.applySubscription(tenantId, sub);
  }

  private async applySubscription(tenantId: string, sub: Stripe.Subscription) {
    const status = mapStatus(sub.status);
    const priceId = sub.items.data[0]?.price.id;
    const plan: Plan = priceId && PRICE_TO_PLAN[priceId] ? PRICE_TO_PLAN[priceId] : 'FREE';

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        stripeSubscriptionId: sub.id,
        stripePriceId: priceId ?? null,
        subscriptionStatus: status,
        plan: status === 'ACTIVE' || status === 'TRIALING' ? plan : 'FREE',
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
        cancelAtPeriodEnd: sub.cancel_at_period_end,
      },
    });
  }

  /** Verify and decode a webhook event from a raw payload + signature header. */
  constructEvent(rawBody: Buffer, signature: string): Stripe.Event {
    const stripe = this.requireStripe();
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new BadRequestException('STRIPE_WEBHOOK_SECRET is not configured');
    return stripe.webhooks.constructEvent(rawBody, signature, secret);
  }
}

function mapStatus(s: Stripe.Subscription.Status): SubscriptionStatus {
  switch (s) {
    case 'trialing': return 'TRIALING';
    case 'active': return 'ACTIVE';
    case 'past_due': return 'PAST_DUE';
    case 'canceled': return 'CANCELED';
    case 'incomplete':
    case 'incomplete_expired':
    case 'unpaid':
    case 'paused': return 'INCOMPLETE';
    default: return 'NONE';
  }
}
