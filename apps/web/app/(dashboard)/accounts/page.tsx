'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

interface Account {
  id: string;
  provider: string;
  providerUserId: string;
  displayName?: string;
  avatarUrl?: string;
  expiresAt?: string;
}

const PROVIDERS = [
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'tiktok', label: 'TikTok' },
];

export default function AccountsPage() {
  const params = useSearchParams();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const error = params.get('error');
  const connected = params.get('connected');

  function refresh() {
    setLoading(true);
    api<Account[]>('/social/accounts').then(setAccounts).finally(() => setLoading(false));
  }

  useEffect(() => { refresh(); }, []);

  async function connect(provider: string) {
    const res = await api<{ url: string }>(`/social/${provider}/authorize`);
    window.location.href = res.url;
  }

  async function remove(id: string) {
    if (!confirm('Supprimer ce compte ?')) return;
    await api(`/social/accounts/${id}`, { method: 'DELETE' });
    refresh();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Comptes sociaux</h1>

      {connected && <p className="text-emerald-700 text-sm">Compte {connected} connecté ✓</p>}
      {error && <p className="text-red-600 text-sm">Erreur OAuth : {error}</p>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {PROVIDERS.map(p => (
          <button
            key={p.key}
            onClick={() => connect(p.key)}
            className="p-4 rounded-lg border border-slate-300 dark:border-slate-700 hover:border-brand hover:text-brand transition text-left"
          >
            <p className="font-semibold">{p.label}</p>
            <p className="text-xs text-slate-500">Connecter un compte</p>
          </button>
        ))}
      </div>

      <h2 className="text-lg font-semibold pt-4">Comptes connectés</h2>
      {loading ? (
        <p>Chargement...</p>
      ) : accounts.length === 0 ? (
        <p className="text-sm text-slate-500">Aucun compte connecté.</p>
      ) : (
        <ul className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded">
          {accounts.map(a => (
            <li key={a.id} className="p-3 flex items-center gap-3">
              {a.avatarUrl && <img src={a.avatarUrl} alt="" className="w-8 h-8 rounded-full" />}
              <div className="flex-1">
                <p className="font-medium text-sm">{a.provider} — {a.displayName || a.providerUserId}</p>
                {a.expiresAt && <p className="text-xs text-slate-500">Expire le {new Date(a.expiresAt).toLocaleString()}</p>}
              </div>
              <button onClick={() => remove(a.id)} className="text-sm text-red-600 hover:underline">Supprimer</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
