'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

interface BillingStatus {
  plan: 'FREE' | 'STARTER' | 'PRO';
  subscriptionStatus: 'NONE' | 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'INCOMPLETE';
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  stripeCustomerId?: string;
  billingEnabled: boolean;
}

function BillingInner() {
  const params = useSearchParams();
  const status = params.get('status');
  const [info, setInfo] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api<BillingStatus>('/billing/status').then(setInfo);
  }, []);

  async function checkout(plan: 'STARTER' | 'PRO') {
    setLoading(true);
    try {
      const res = await api<{ url: string }>('/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan }),
      });
      window.location.href = res.url;
    } finally {
      setLoading(false);
    }
  }

  async function openPortal() {
    setLoading(true);
    try {
      const res = await api<{ url: string }>('/billing/portal', { method: 'POST' });
      window.location.href = res.url;
    } finally {
      setLoading(false);
    }
  }

  if (!info) return <p>Chargement...</p>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Facturation</h1>
        <p className="text-sm text-slate-500">Gérez votre abonnement et vos moyens de paiement.</p>
      </div>

      {status === 'success' && (
        <p className="text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-2 rounded">
          Abonnement activé ✓ La synchronisation peut prendre quelques secondes.
        </p>
      )}
      {status === 'cancelled' && (
        <p className="text-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded">
          Paiement annulé.
        </p>
      )}

      {!info.billingEnabled && (
        <p className="text-sm bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 px-3 py-2 rounded">
          La facturation Stripe n'est pas configurée sur cette instance — tous les plans sont accessibles librement.
        </p>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
        <p className="text-sm text-slate-500">Plan actuel</p>
        <p className="text-2xl font-bold">{info.plan}</p>
        <p className="text-xs text-slate-500 mt-1">
          Statut : {info.subscriptionStatus}
          {info.currentPeriodEnd && ` · prochain renouvellement le ${new Date(info.currentPeriodEnd).toLocaleDateString()}`}
          {info.cancelAtPeriodEnd && ' · annulation programmée à la fin de la période'}
        </p>
      </div>

      {info.billingEnabled && (
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => checkout('STARTER')}
            disabled={loading || info.plan === 'STARTER'}
            className="p-4 rounded-lg border border-slate-300 dark:border-slate-700 hover:border-brand text-left disabled:opacity-50"
          >
            <p className="font-semibold">Starter — 19 €/mois</p>
            <p className="text-xs text-slate-500">3 organisations · 300 publications/mois</p>
          </button>
          <button
            onClick={() => checkout('PRO')}
            disabled={loading || info.plan === 'PRO'}
            className="p-4 rounded-lg border border-slate-300 dark:border-slate-700 hover:border-brand text-left disabled:opacity-50"
          >
            <p className="font-semibold">Pro — 49 €/mois</p>
            <p className="text-xs text-slate-500">Illimité · API · support prioritaire</p>
          </button>
        </div>
      )}

      {info.billingEnabled && info.stripeCustomerId && (
        <button
          onClick={openPortal}
          disabled={loading}
          className="px-5 py-2 rounded border border-slate-300 dark:border-slate-700 hover:border-brand"
        >
          Gérer mon abonnement (portail Stripe)
        </button>
      )}
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<p>Chargement...</p>}>
      <BillingInner />
    </Suspense>
  );
}
