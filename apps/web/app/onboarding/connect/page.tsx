'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Stepper } from '@/components/onboarding/stepper';

const STEPS = [
  { key: 'verify', label: 'Email' },
  { key: 'connect', label: 'Réseaux' },
  { key: 'done', label: 'Fini' },
];

const PROVIDERS = [
  { key: 'linkedin', label: 'LinkedIn', desc: "Postez sur votre profil ou page entreprise." },
  { key: 'facebook', label: 'Facebook', desc: 'Publication sur vos pages.' },
  { key: 'instagram', label: 'Instagram', desc: 'Compte business lié à une page Facebook requis.' },
  { key: 'tiktok', label: 'TikTok', desc: 'Vidéos uniquement (pipeline média à activer).' },
];

interface Account { id: string; provider: string; displayName?: string }

export default function ConnectPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  function refresh() {
    api<Account[]>('/social/accounts').then(setAccounts).finally(() => setLoading(false));
  }
  useEffect(() => { refresh(); }, []);

  async function connect(provider: string) {
    const res = await api<{ url: string }>(`/social/${provider}/authorize`);
    window.location.href = res.url;
  }

  async function next() {
    await api('/onboarding/step', { method: 'POST', body: JSON.stringify({ step: 'first_post' }) });
    router.push('/onboarding/done');
  }

  async function skip() {
    await api('/onboarding/complete', { method: 'POST' });
    router.push('/dashboard');
  }

  return (
    <div>
      <Stepper steps={STEPS} currentKey="connect" />
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8">
        <h1 className="text-2xl font-bold mb-2">Connectez votre premier réseau</h1>
        <p className="text-slate-600 dark:text-slate-300 mb-6">
          Sélectionnez un provider pour démarrer l'OAuth. Vous pourrez en ajouter d'autres plus tard.
        </p>

        <div className="grid gap-3 sm:grid-cols-2 mb-6">
          {PROVIDERS.map((p) => {
            const connected = accounts.find((a) => a.provider.toLowerCase() === p.key);
            return (
              <button
                key={p.key}
                onClick={() => !connected && connect(p.key)}
                disabled={!!connected}
                className="text-left p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-brand disabled:opacity-50 disabled:cursor-default"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{p.label}</p>
                  {connected && <span className="text-xs text-emerald-600">Connecté ✓</span>}
                </div>
                <p className="text-xs text-slate-500 mt-1">{p.desc}</p>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={next}
            disabled={accounts.length === 0}
            className="px-6 py-2 rounded-lg bg-brand text-white hover:bg-brand-dark disabled:opacity-50"
          >
            Continuer
          </button>
          <button onClick={skip} className="px-6 py-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100">
            Sauter pour l'instant
          </button>
          {!loading && accounts.length === 0 && (
            <p className="text-sm text-slate-500 self-center">Connectez au moins un compte pour continuer.</p>
          )}
        </div>
      </div>
    </div>
  );
}
