import type { Metadata } from 'next';
import { PricingClient } from './pricing-client';

export const metadata: Metadata = {
  title: 'Tarifs',
  description:
    'Tarifs Free, Starter (19€), Pro (49€) et Business (149€). 14 jours d\'essai gratuit, sans carte bancaire. Hébergement Europe, RGPD.',
};

export default function PricingPage() {
  return <PricingClient />;
}
