'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, setToken } from '@/lib/api';

interface UserMe {
  id: string;
  email: string;
  name?: string;
  totpEnabledAt?: string | null;
}

export default function SecurityPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserMe | null>(null);
  const [setup, setSetup] = useState<{ qrDataUrl: string; otpauth: string } | null>(null);
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
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

  async function onConfirm(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ ok: true; backupCodes: string[] }>('/auth/2fa/setup/confirm', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
      setSetup(null);
      setCode('');
      setBackupCodes(res.backupCodes);
      refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function regenerateCodes() {
    if (!window.confirm('Régénérer les codes invalidera tous les codes existants. Continuer ?')) return;
    try {
      const res = await api<{ backupCodes: string[] }>('/auth/2fa/backup-codes/regenerate', { method: 'POST' });
      setBackupCodes(res.backupCodes);
    } catch (err: any) { alert(err.message); }
  }

  async function disable() {
    const c = prompt('Entrez un code TOTP (ou un code de récupération) pour désactiver la 2FA :');
    if (!c) return;
    try {
      await api('/auth/2fa/disable', { method: 'POST', body: JSON.stringify({ code: c }) });
      setBackupCodes(null);
      refresh();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function deleteAccount() {
    const password = prompt('Entrez votre mot de passe pour supprimer définitivement votre compte :');
    if (!password) return;
    if (!window.confirm('Cette action est IRRÉVERSIBLE. Confirmer la suppression ?')) return;
    try {
      await api('/users/me', { method: 'DELETE', body: JSON.stringify({ password }) });
      setToken(null);
      router.push('/');
    } catch (err: any) {
      alert(err.message);
    }
  }

  if (!user) return <p>Chargement...</p>;
  const enabled = !!user.totpEnabledAt;

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Sécurité</h1>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold">Authenticator app (TOTP)</p>
            <p className="text-sm text-slate-500">
              {enabled ? `Activé depuis le ${new Date(user.totpEnabledAt!).toLocaleDateString()}` : 'Non activé'}
            </p>
          </div>
          {enabled ? (
            <div className="flex gap-2">
              <button onClick={regenerateCodes} className="text-sm text-brand hover:underline">Régénérer codes</button>
              <button onClick={disable} className="text-sm text-red-600 hover:underline">Désactiver</button>
            </div>
          ) : !setup ? (
            <button onClick={startSetup} className="px-4 py-2 rounded bg-brand text-white text-sm">Activer</button>
          ) : null}
        </div>

        {setup && !enabled && (
          <form onSubmit={onConfirm} className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <p className="text-sm">Scannez ce QR code avec une app comme Google Authenticator, 1Password, Authy…</p>
            <img src={setup.qrDataUrl} alt="QR 2FA" className="w-48 h-48 border bg-white" />
            <p className="text-xs text-slate-500 break-all">Ou saisissez ce secret : <code>{setup.otpauth}</code></p>
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

        {backupCodes && (
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
            <p className="font-semibold">Codes de récupération</p>
            <p className="text-sm text-slate-500 mb-2">
              Conservez ces codes en lieu sûr. Chacun ne peut être utilisé <strong>qu'une seule fois</strong> et remplace le code TOTP en cas de perte du téléphone. Ils ne s'afficheront plus après cette page.
            </p>
            <ul className="grid grid-cols-2 gap-1 font-mono text-sm bg-slate-50 dark:bg-slate-950 p-3 rounded">
              {backupCodes.map((c) => <li key={c}>{c}</li>)}
            </ul>
            <button
              onClick={() => navigator.clipboard.writeText(backupCodes.join('\n'))}
              className="mt-2 text-xs underline"
            >
              Copier dans le presse-papier
            </button>
          </div>
        )}
      </div>

      <div className="border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10 rounded-lg p-4 space-y-2">
        <h2 className="font-semibold text-red-700 dark:text-red-300">Supprimer mon compte</h2>
        <p className="text-sm">
          Votre compte utilisateur sera effacé. Les espaces dont vous êtes le seul OWNER seront aussi supprimés (avec leurs posts, comptes connectés, médias, etc.).
        </p>
        <button onClick={deleteAccount} className="px-4 py-2 rounded bg-red-600 text-white text-sm">
          Supprimer mon compte
        </button>
      </div>
    </div>
  );
}
