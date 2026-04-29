'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Stepper } from '@/components/onboarding/stepper';

const STEPS = [
  { key: 'verify', label: 'Email' },
  { key: 'connect', label: 'Réseaux' },
  { key: 'done', label: 'Fini' },
];

interface BillingStatus {
  plan?: string;
  subscriptionStatus?: string;
  billingEnabled: boolean;
}

export default function OnboardingDonePage() {
  const router = useRouter();
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  useEffect(() => {
    api<BillingStatus>('/billing/status')
      .then(setBilling)
      .catch(() => setBilling({ billingEnabled: false }));
  }, []);

  async function finish(target: '/dashboard' | '/posts/new') {
    await api('/onboarding/complete', { method: 'POST' });
    router.push(target);
  }

  async function upgrade(plan: 'STARTER' | 'PRO') {
    setUpgrading(plan);
    try {
      const res = await api<{ url: string }>('/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan }),
      });
      // Mark onboarding done before redirecting away — the user is checking out.
      try { await api('/onboarding/complete', { method: 'POST' }); } catch {}
      window.location.href = res.url;
    } catch (err: any) {
      alert(err?.message ?? 'Le checkout Stripe a échoué.');
      setUpgrading(null);
    }
  }

  const showPlans = billing?.billingEnabled && billing?.plan === 'FREE';

  return (
    <div>
      <Stepper steps={STEPS} currentKey="done" />
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center">
        <p className="text-5xl mb-4">🎉</p>
        <h1 className="text-2xl font-bold mb-2">Tout est prêt !</h1>
        <p className="text-slate-600 dark:text-slate-300 mb-8">
          Votre espace est configuré. Vous pouvez créer votre première publication ou explorer le tableau de bord.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => finish('/posts/new')}
            className="px-6 py-3 rounded-lg bg-brand text-white hover:bg-brand-dark"
          >
            Créer mon premier post
          </button>
          <button
            onClick={() => finish('/dashboard')}
            className="px-6 py-3 rounded-lg border border-slate-300 dark:border-slate-700 hover:border-brand"
          >
            Aller au tableau de bord
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-6">
          Besoin d&apos;aide ? <Link href="/features" className="underline">Consulter les fonctionnalités</Link>
        </p>
      </div>

      {showPlans && (
        <div className="mt-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8">
          <h2 className="text-xl font-semibold mb-1">Vous voulez plus de capacité ?</h2>
          <p className="text-sm text-slate-500 mb-6">
            Vous êtes actuellement en plan gratuit. Passez à un plan payant pour plus de comptes
            sociaux, de posts planifiés et de génération AI.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <PlanCard
              name="Starter"
              price="29€/mois"
              features={[
                "Jusqu'à 10 comptes sociaux",
                '500 posts planifiés / mois',
                'Génération AI illimitée',
                'Support email',
              ]}
              busy={upgrading === 'STARTER'}
              onClick={() => upgrade('STARTER')}
            />
            <PlanCard
              name="Pro"
              price="79€/mois"
              highlight
              features={[
                'Comptes sociaux illimités',
                'Posts planifiés illimités',
                'Workflow approbation',
                'Support prioritaire',
              ]}
              busy={upgrading === 'PRO'}
              onClick={() => upgrade('PRO')}
            />
          </div>
          <p className="text-xs text-slate-500 mt-4">
            Vous pouvez aussi rester en plan gratuit et upgrader plus tard depuis{' '}
            <Link href="/settings/billing" className="underline">Paramètres → Facturation</Link>.
          </p>
        </div>
      )}
    </div>
  );
}

function PlanCard({
  name,
  price,
  features,
  highlight,
  busy,
  onClick,
}: {
  name: string;
  price: string;
  features: string[];
  highlight?: boolean;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className={`rounded-lg border p-5 text-left ${
        highlight
          ? 'border-brand ring-1 ring-brand/30 bg-brand/5'
          : 'border-slate-200 dark:border-slate-800'
      }`}
    >
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-semibold">{name}</h3>
        <span className="text-lg font-bold">{price}</span>
      </div>
      <ul className="text-sm space-y-1.5 text-slate-600 dark:text-slate-300 mb-5">
        {features.map((f) => (
          <li key={f}>· {f}</li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className={`w-full px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 ${
          highlight
            ? 'bg-brand text-white hover:bg-brand-dark'
            : 'border border-slate-300 dark:border-slate-700 hover:border-brand'
        }`}
      >
        {busy ? 'Redirection vers Stripe…' : `Choisir ${name}`}
      </button>
    </div>
  );
}
