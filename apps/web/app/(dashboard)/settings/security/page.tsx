'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface UserMe {
  id: string;
  email: string;
  name?: string;
  totpEnabledAt?: string | null;
}

export default function SecurityPage() {
  const [user, setUser] = useState<UserMe | null>(null);
  const [setup, setSetup] = useState<{ qrDataUrl: string; otpauth: string } | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function refresh() {
    api<UserMe>('/users/me').then(setUser);
  }
  useEffect(() => { refresh(); }, []);

  async function startSetup() {
    setError(null);
    try {
      const res = await api<{ qrDataUrl: string; otpauth: string }>('/auth/2fa/setup', { method: 'POST' });
      setSetup(res);
    } catch (err: any) { setError(err.message); }
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api('/auth/2fa/setup/confirm', { method: 'POST', body: JSON.stringify({ code }) });
      setSetup(null);
      setCode('');
      refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function disable() {
    const c = prompt('Entrez un code TOTP pour désactiver la 2FA :');
    if (!c) return;
    try {
      await api('/auth/2fa/disable', { method: 'POST', body: JSON.stringify({ code: c }) });
      refresh();
    } catch (err: any) {
      alert(err.message);
    }
  }

  if (!user) return <p>Chargement...</p>;
  const enabled = !!user.totpEnabledAt;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Sécurité</h1>
        <p className="text-sm text-slate-500">Authentification à deux facteurs (TOTP).</p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold">Authenticator app (TOTP)</p>
            <p className="text-sm text-slate-500">
              {enabled ? `Activé depuis le ${new Date(user.totpEnabledAt!).toLocaleDateString()}` : 'Non activé'}
            </p>
          </div>
          {enabled ? (
            <button onClick={disable} className="text-sm text-red-600 hover:underline">Désactiver</button>
          ) : !setup ? (
            <button onClick={startSetup} className="px-4 py-2 rounded bg-brand text-white text-sm">Activer</button>
          ) : null}
        </div>

        {setup && !enabled && (
          <form onSubmit={confirm} className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <p className="text-sm">Scannez ce QR code avec une app comme Google Authenticator, 1Password, Authy…</p>
            <img src={setup.qrDataUrl} alt="QR 2FA" className="w-48 h-48 border bg-white" />
            <p className="text-xs text-slate-500 break-all">Ou copiez ce secret : <code>{setup.otpauth}</code></p>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <input
              required
              pattern="[0-9]{6}"
              placeholder="Code à 6 chiffres"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-transparent"
            />
            <button disabled={loading} className="ml-2 px-5 py-2 rounded bg-brand text-white disabled:opacity-50">
              {loading ? 'Vérification...' : 'Confirmer'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
