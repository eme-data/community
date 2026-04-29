'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';

interface Account {
  id: string;
  provider: string;
  providerUserId: string;
  displayName?: string;
  avatarUrl?: string;
  expiresAt?: string;
  refreshError?: string | null;
  refreshFailedAt?: string | null;
}

interface ProviderStatus {
  provider: string;
  configured: boolean;
  missing: string[];
}

const PROVIDERS = [
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'twitter', label: 'X (Twitter)' },
  { key: 'bluesky', label: 'Bluesky', manual: true },
];

function AccountsInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [status, setStatus] = useState<Record<string, ProviderStatus>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ provider: string; missing: string[]; message: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const queryError = params.get('error');
  const connected = params.get('connected');

  function refresh() {
    setLoading(true);
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

  async function connect(provider: string, manual?: boolean) {
    setError(null);
    if (manual) {
      router.push(`/accounts/${provider}/connect`);
      return;
    }
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

  async function remove(id: string) {
    if (!confirm('Supprimer ce compte ?')) return;
    await api(`/social/accounts/${id}`, { method: 'DELETE' });
    refresh();
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Comptes sociaux</h1>
        <p className="text-sm text-slate-500 mt-1">
          Connectez vos pages et profils pour publier directement depuis Community.
        </p>
      </header>

      {connected && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          Compte {connected} connecté ✓
        </div>
      )}
      {queryError && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          Erreur OAuth : {queryError}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 px-4 py-3 text-sm">
          <p className="font-medium text-amber-800 dark:text-amber-200">
            {error.provider} n'est pas encore configuré
          </p>
          <p className="text-amber-700 dark:text-amber-300 mt-1">
            {error.missing.length > 0
              ? `Variables manquantes côté serveur : ${error.missing.join(', ')}.`
              : error.message}
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">
            L'administrateur doit ajouter ces variables au fichier <code className="font-mono">.env</code> puis redémarrer le service api &amp; worker. Voir la documentation du provider {error.provider}.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {PROVIDERS.map((p) => {
          const isManual = (p as any).manual;
          const isConfigured = isManual || status[p.key]?.configured !== false;
          const isBusy = busy === p.key;
          const isConnected = accounts.some((a) => a.provider.toLowerCase() === p.key);
          return (
            <button
              key={p.key}
              onClick={() => connect(p.key, isManual)}
              disabled={isBusy}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-brand hover:shadow-sm transition text-left disabled:opacity-60"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="font-semibold">{p.label}</p>
                {isConnected && <span className="text-xs text-emerald-600">✓ connecté</span>}
                {!isConfigured && !isConnected && (
                  <span className="text-xs text-amber-600">⚠ à configurer</span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {isBusy
                  ? 'Redirection...'
                  : isManual
                  ? 'Connexion par mot de passe d\'application'
                  : isConfigured
                  ? 'Connecter un compte'
                  : 'Credentials OAuth manquants'}
              </p>
            </button>
          );
        })}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Comptes connectés</h2>
        {loading ? (
          <div className="space-y-2">
            <div className="h-12 bg-slate-100 dark:bg-slate-900 rounded-lg animate-pulse" />
            <div className="h-12 bg-slate-100 dark:bg-slate-900 rounded-lg animate-pulse" />
          </div>
        ) : accounts.length === 0 ? (
          <p className="text-sm text-slate-500 p-6 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-center">
            Aucun compte connecté pour le moment. Cliquez sur un réseau ci-dessus pour démarrer.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
            {accounts.map((a) => (
              <li key={a.id} className="p-4 flex items-center gap-3">
                {a.avatarUrl && <img src={a.avatarUrl} alt="" className="w-9 h-9 rounded-full" />}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate flex items-center gap-2">
                    <span className="uppercase text-xs text-slate-500">{a.provider}</span>
                    <span className="truncate">{a.displayName || a.providerUserId}</span>
                    {a.refreshError && (
                      <span className="shrink-0 text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 font-medium">
                        Reconnexion requise
                      </span>
                    )}
                  </p>
                  {a.refreshError ? (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-0.5 truncate" title={a.refreshError}>
                      Erreur de rafraîchissement : {a.refreshError}
                    </p>
                  ) : (
                    a.expiresAt && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        Token expire le {new Date(a.expiresAt).toLocaleDateString()}
                      </p>
                    )
                  )}
                </div>
                {a.refreshError && (
                  <button
                    onClick={() => connect(a.provider.toLowerCase())}
                    className="text-sm px-3 py-1.5 rounded-lg bg-brand text-white hover:bg-brand-dark"
                  >
                    Reconnecter
                  </button>
                )}
                <button onClick={() => remove(a.id)} className="text-sm text-red-600 hover:underline">
                  Supprimer
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function AccountsPage() {
  return (
    <Suspense fallback={<p>Chargement...</p>}>
      <AccountsInner />
    </Suspense>
  );
}