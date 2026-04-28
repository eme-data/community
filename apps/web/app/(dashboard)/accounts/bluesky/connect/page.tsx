'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function BlueskyConnectPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await api('/social/bluesky/connect', {
        method: 'POST',
        body: JSON.stringify({ identifier: identifier.trim(), appPassword }),
      });
      router.push('/accounts?connected=bluesky');
    } catch (e: any) {
      setErr(e?.message || 'Connexion impossible');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-2xl font-bold">Connecter Bluesky</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Bluesky n'utilise pas OAuth. Crée un <em>app password</em> dédié sur{' '}
        <a
          href="https://bsky.app/settings/app-passwords"
          target="_blank"
          rel="noreferrer"
          className="text-brand underline"
        >
          bsky.app/settings/app-passwords
        </a>{' '}
        — il pourra être révoqué indépendamment de ton mot de passe principal.
      </p>

      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="text-sm font-medium">Handle</label>
          <input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="alice.bsky.social"
            autoComplete="username"
            required
            className="w-full mt-1 px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-transparent"
          />
        </div>
        <div>
          <label className="text-sm font-medium">App password</label>
          <input
            type="password"
            value={appPassword}
            onChange={(e) => setAppPassword(e.target.value)}
            placeholder="xxxx-xxxx-xxxx-xxxx"
            autoComplete="current-password"
            required
            className="w-full mt-1 px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-transparent font-mono"
          />
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button
          type="submit"
          disabled={busy}
          className="px-4 py-2 rounded bg-brand text-white text-sm disabled:opacity-50"
        >
          {busy ? 'Connexion…' : 'Connecter'}
        </button>
      </form>
    </div>
  );
}
