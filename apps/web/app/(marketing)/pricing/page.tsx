import Link from 'next/link';
import clsx from 'clsx';

interface Tier {
  name: string;
  price: string;
  highlighted?: boolean;
  features: string[];
  cta: string;
  href: string;
}

const tiers: Tier[] = [
  {
    name: 'Free',
    price: '0 €',
    features: [
      '1 organisation',
      'Jusqu\'à 3 comptes connectés',
      '30 publications / mois',
      'Programmation à 7 jours',
      'Support communautaire',
    ],
    cta: 'Démarrer',
    href: '/register',
  },
  {
    name: 'Starter',
    price: '19 €/mois',
    highlighted: true,
    features: [
      '3 organisations',
      'Jusqu\'à 10 comptes connectés',
      '300 publications / mois',
      'Programmation illimitée',
      'Statistiques de base',
      'Support email',
    ],
    cta: 'Choisir Starter',
    href: '/register?plan=starter',
  },
  {
    name: 'Pro',
    price: '49 €/mois',
    features: [
      'Organisations illimitées',
      'Comptes illimités',
      'Publications illimitées',
      'Rôles & permissions',
      'API & webhooks',
      'Support prioritaire',
    ],
    cta: 'Choisir Pro',
    href: '/register?plan=pro',
  },
];

export default function PricingPage() {
  return (
    <main className="px-4 py-16 max-w-6xl mx-auto">
      <header className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-3">Tarifs simples, sans surprise</h1>
        <p className="text-slate-600 dark:text-slate-300">Commencez gratuitement, payez lorsque vous grandissez.</p>
        <p className="text-xs text-slate-500 mt-2">La facturation Stripe arrive bientôt — d'ici là, tous les plans sont accessibles librement sur votre instance.</p>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        {tiers.map((t) => (
          <article
            key={t.name}
            className={clsx(
              'p-6 rounded-xl border bg-white dark:bg-slate-900',
              t.highlighted
                ? 'border-brand ring-2 ring-brand/30 relative'
                : 'border-slate-200 dark:border-slate-800',
            )}
          >
            {t.highlighted && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand text-white text-xs px-3 py-1 rounded-full">
                Le plus populaire
              </span>
            )}
            <h2 className="text-xl font-bold mb-1">{t.name}</h2>
            <p className="text-3xl font-bold mb-4">{t.price}</p>
            <ul className="space-y-2 text-sm mb-6">
              {t.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-brand">✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link
              href={t.href}
              className={clsx(
                'block w-full text-center py-2 rounded-lg font-medium',
                t.highlighted
                  ? 'bg-brand text-white hover:bg-brand-dark'
                  : 'border border-slate-300 dark:border-slate-700',
              )}
            >
              {t.cta}
            </Link>
          </article>
        ))}
      </div>

      <section className="mt-20 text-center">
        <h2 className="text-2xl font-bold mb-2">Besoin d'un plan sur mesure ?</h2>
        <p className="text-slate-600 dark:text-slate-300 mb-4">Contactez-nous pour un déploiement dédié, un SLA ou une intégration spécifique.</p>
        <Link href="mailto:contact@example.com" className="px-6 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:border-brand">
          Nous contacter
        </Link>
      </section>
    </main>
  );
}
