'use client';

import Link from 'next/link';
import { useState } from 'react';
import clsx from 'clsx';

type Cycle = 'monthly' | 'yearly';

interface Tier {
  name: string;
  tagline: string;
  monthly: number | null;
  yearly: number | null;
  highlighted?: boolean;
  features: string[];
  cta: string;
  href: string;
}

const tiers: Tier[] = [
  {
    name: 'Free',
    tagline: 'Pour tester ou pour un usage personnel.',
    monthly: 0,
    yearly: 0,
    features: [
      '1 espace de travail',
      "Jusqu'à 3 comptes connectés",
      '30 publications / mois',
      'Programmation à 7 jours',
      'IA : 20 générations / mois',
      'Support communautaire',
    ],
    cta: 'Démarrer gratuitement',
    href: '/register?plan=free',
  },
  {
    name: 'Starter',
    tagline: 'Pour les freelances et créateurs solo.',
    monthly: 19,
    yearly: 16,
    features: [
      '3 espaces de travail',
      "Jusqu'à 10 comptes connectés",
      '300 publications / mois',
      'Programmation illimitée',
      'IA : 200 générations / mois',
      'Statistiques de base',
      'Support email (48h)',
    ],
    cta: 'Démarrer 14 jours gratuits',
    href: '/register?plan=starter',
  },
  {
    name: 'Pro',
    tagline: 'Pour les agences et équipes marketing.',
    monthly: 49,
    yearly: 41,
    highlighted: true,
    features: [
      '10 espaces de travail',
      'Comptes connectés illimités',
      '2 000 publications / mois',
      'Rôles & permissions par utilisateur',
      "Validation & approbation des posts",
      'IA voix de marque par espace',
      'Statistiques unifiées + exports',
      'Intégrations Slack & Teams',
      'Support prioritaire (24h)',
    ],
    cta: 'Démarrer 14 jours gratuits',
    href: '/register?plan=pro',
  },
  {
    name: 'Business',
    tagline: 'Pour les structures multi-marques.',
    monthly: 149,
    yearly: 124,
    features: [
      'Espaces de travail illimités',
      'Comptes connectés illimités',
      'Publications illimitées',
      'IA illimitée',
      'Connexion unique d\'entreprise (SSO)',
      "Journal d'audit avancé",
      'Disponibilité garantie 99,9%',
      'Support dédié (4h)',
      'Onboarding accompagné',
    ],
    cta: 'Démarrer 14 jours gratuits',
    href: '/register?plan=business',
  },
];

const enterprise = {
  name: 'Enterprise',
  tagline: 'Sur-mesure : cloud privé dédié, conformité renforcée, intégrations spécifiques.',
  features: [
    'Instance en cloud privé entièrement dédiée',
    'Engagement de service & DPA signé',
    'Conformité renforcée (ISO 27001, SOC 2 sur demande)',
    'Intégrations sur-mesure avec vos outils',
    'Customer Success dédié',
  ],
};

const faq = [
  {
    q: "Comment fonctionne la période d'essai ?",
    a: "14 jours d'essai gratuit sur les plans payants, sans carte bancaire. À la fin, vous choisissez de souscrire ou votre espace bascule automatiquement en plan Free.",
  },
  {
    q: 'Puis-je changer de plan à tout moment ?',
    a: "Oui — passez à un plan supérieur ou inférieur en un clic depuis votre console. Le prorata est calculé automatiquement, sans contact commercial.",
  },
  {
    q: 'Comment se passe la facturation ?',
    a: "Carte bancaire ou prélèvement SEPA, en toute sécurité. Facturation mensuelle ou annuelle (2 mois offerts). Factures TVA téléchargeables à tout moment.",
  },
  {
    q: 'Que se passe-t-il si je dépasse mon quota ?',
    a: "Vous recevez une alerte à 80% et 100%. Aucune publication n'est perdue : les nouvelles publications sont mises en pause jusqu'à votre upgrade ou la fenêtre suivante.",
  },
  {
    q: 'Mes données sont-elles hébergées en Europe ?',
    a: "Oui, sur des datacenters basés en France. Aucune donnée personnelle ne quitte l'Union européenne.",
  },
  {
    q: 'Puis-je avoir un environnement entièrement dédié ?',
    a: "Oui, sur le plan Enterprise. Nous déployons une instance en cloud privé entièrement dédiée à votre organisation, avec un accompagnement et un support sur-mesure.",
  },
];

export function PricingClient() {
  const [cycle, setCycle] = useState<Cycle>('monthly');
  return (
    <main className="px-4 py-16 max-w-6xl mx-auto">
      <header className="text-center max-w-3xl mx-auto mb-10">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
          Des tarifs simples, qui grandissent avec vous
        </h1>
        <p className="text-slate-600 dark:text-slate-300 text-lg">
          14 jours d'essai gratuit sur les plans payants. Sans carte bancaire. Annulation en un
          clic.
        </p>
      </header>

      <div className="flex justify-center mb-12">
        <div className="inline-flex p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setCycle('monthly')}
            className={clsx(
              'px-4 py-2 text-sm rounded-md transition',
              cycle === 'monthly'
                ? 'bg-white dark:bg-slate-800 shadow-sm font-medium'
                : 'text-slate-500',
            )}
          >
            Mensuel
          </button>
          <button
            type="button"
            onClick={() => setCycle('yearly')}
            className={clsx(
              'px-4 py-2 text-sm rounded-md transition flex items-center gap-2',
              cycle === 'yearly'
                ? 'bg-white dark:bg-slate-800 shadow-sm font-medium'
                : 'text-slate-500',
            )}
          >
            Annuel
            <span className="text-xs px-1.5 py-0.5 rounded bg-brand/10 text-brand">−2 mois</span>
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {tiers.map((t) => (
          <article
            key={t.name}
            className={clsx(
              'p-6 rounded-xl border bg-white dark:bg-slate-900 flex flex-col',
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
            <h2 className="text-lg font-bold mb-1">{t.name}</h2>
            <p className="text-xs text-slate-500 mb-4 min-h-[2.5rem]">{t.tagline}</p>
            <div className="mb-4">
              {(cycle === 'monthly' ? t.monthly : t.yearly) === 0 ? (
                <p className="text-3xl font-bold">0 €</p>
              ) : (
                <p className="text-3xl font-bold">
                  {cycle === 'monthly' ? t.monthly : t.yearly} €
                  <span className="text-sm font-normal text-slate-500">/mois</span>
                </p>
              )}
              {cycle === 'yearly' && (t.yearly ?? 0) > 0 && (
                <p className="text-xs text-slate-500 mt-1">facturé annuellement</p>
              )}
            </div>
            <ul className="space-y-2 text-sm mb-6 flex-1">
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
                'block w-full text-center py-2 rounded-lg font-medium text-sm',
                t.highlighted
                  ? 'bg-brand text-white hover:bg-brand-dark'
                  : 'border border-slate-300 dark:border-slate-700 hover:border-brand',
              )}
            >
              {t.cta}
            </Link>
          </article>
        ))}
      </div>

      <section className="mt-12 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 grid md:grid-cols-2 gap-8 items-center">
        <div>
          <h2 className="text-2xl font-bold mb-2">{enterprise.name}</h2>
          <p className="text-slate-600 dark:text-slate-300 mb-4">{enterprise.tagline}</p>
          <ul className="space-y-2 text-sm">
            {enterprise.features.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-brand">✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="text-center md:text-left">
          <p className="text-3xl font-bold mb-1">Sur devis</p>
          <p className="text-sm text-slate-500 mb-6">
            Tarification adaptée à votre volume, votre stack et vos contraintes.
          </p>
          <Link
            href="mailto:contact@meoxa.app?subject=Demande%20Enterprise%20Community"
            className="inline-block px-6 py-3 rounded-lg bg-brand text-white font-medium hover:bg-brand-dark"
          >
            Parler à un expert
          </Link>
        </div>
      </section>

      <p className="text-center text-xs text-slate-500 mt-12">
        Tous les plans incluent : hébergement Europe · RGPD · Chiffrement au repos · OAuth officiel
        · Support en français
      </p>

      <section className="mt-20 max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-10">Questions fréquentes</h2>
        <div className="space-y-3">
          {faq.map((f) => (
            <FaqItem key={f.q} q={f.q} a={f.a} />
          ))}
        </div>
      </section>

      <section className="mt-20 text-center">
        <h2 className="text-2xl font-bold mb-2">Une question avant de vous lancer ?</h2>
        <p className="text-slate-600 dark:text-slate-300 mb-6">
          Notre équipe répond en moins de 24h, en français.
        </p>
        <Link
          href="mailto:contact@meoxa.app"
          className="px-6 py-3 rounded-lg border border-slate-300 dark:border-slate-700 hover:border-brand"
        >
          Nous contacter
        </Link>
      </section>
    </main>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 p-4 text-left"
        aria-expanded={open}
      >
        <span className="font-medium text-sm">{q}</span>
        <span className="text-slate-400 text-lg leading-none">{open ? '−' : '+'}</span>
      </button>
      {open && <p className="px-4 pb-4 text-sm text-slate-600 dark:text-slate-400">{a}</p>}
    </div>
  );
}
