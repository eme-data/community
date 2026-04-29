'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
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
interface ProviderStatus { provider: string; configured: boolean; missing: string[] }

export default function ConnectPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [status, setStatus] = useState<Record<string, ProviderStatus>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ provider: string; missing: string[]; message: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  function refresh() {
    Promise.all([
      api<Account[]>('/social/accounts'),
      api<ProviderStatus[]>('/social/providers/status').catch(() => [] as ProviderStatus[]),
    ])
      .then(([accs, st]) => {
        setAccounts(accs);
        const map: Record<string, ProviderStatus> = {};
        for (const s of st) map[s.provider] = s;
        setStatus(map);
      })
      .finally(() => setLoading(false));
  }
  useEffect(() => { refresh(); }, []);

  async function connect(provider: string) {
    setError(null);
    setBusy(provider);
    try {
      const res = await api<{ url: string }>(`/social/${provider}/authorize`);
      window.location.href = res.url;
    } catch (e) {
      if (e instanceof ApiError && e.body?.error === 'provider_not_configured') {
        setError({
          provider,
          missing: e.body.missing ?? [],
          message: e.body.message ?? `${provider} n'est pas encore configuré.`,
        });
      } else {
        setError({
          provider,
          missing: [],
          message: e instanceof Error ? e.message : `Erreur lors de la connexion à ${provider}.`,
        });
      }
    } finally {
      setBusy(null);
    }
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
          Sélectionnez un réseau pour démarrer la connexion. Vous pourrez en ajouter d'autres plus tard depuis la console.
        </p>

        {error && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 px-4 py-3 text-sm mb-6">
            <p className="font-medium text-amber-800 dark:text-amber-200">
              {error.provider} n'est pas encore configuré sur cette instance.
            </p>
            <p className="text-amber-700 dark:text-amber-300 mt-1">
              {error.missing.length > 0
                ? `Variables manquantes : ${error.missing.join(', ')}.`
                : error.message}
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">
              L'administrateur doit ajouter ces variables au .env puis redémarrer le service. En attendant, vous pouvez sauter cette étape.
            </p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 mb-6">
          {PROVIDERS.map((p) => {
            const isConnected = !!accounts.find((a) => a.provider.toLowerCase() === p.key);
            const isConfigured = status[p.key]?.configured !== false;
            const isBusy = busy === p.key;
            return (
              <button
                key={p.key}
                onClick={() => !isConnected && connect(p.key)}
                disabled={isConnected || isBusy}
                className="text-left p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-brand disabled:cursor-default disabled:hover:border-slate-200 dark:disabled:hover:border-slate-800"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{p.label}</p>
                  {isConnected ? (
                    <span className="text-xs text-emerald-600">Connecté ✓</span>
                  ) : !isConfigured ? (
                    <span className="text-xs text-amber-600">⚠ à configurer</span>
                  ) : null}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {isBusy ? 'Redirection...' : p.desc}
                </p>
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
            <p className="text-sm text-slate-500 self-center">
              Connectez au moins un compte ou sautez cette étape.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}