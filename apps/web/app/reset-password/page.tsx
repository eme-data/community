'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

function ResetInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError('Lien invalide');
      return;
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    setLoading(true);
    try {
      await api('/auth/password/reset', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      setDone(true);
      setTimeout(() => router.push('/login'), 1500);
    } catch (err: any) {
      setError(err.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 p-6 rounded-xl shadow space-y-4">
        <h1 className="text-2xl font-bold">Nouveau mot de passe</h1>
        {done ? (
          <p className="text-emerald-700">Mot de passe réinitialisé ✓ Redirection...</p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <input
              type="password"
              required
              minLength={8}
              placeholder="Nouveau mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-transparent"
            />
            <input
              type="password"
              required
              minLength={8}
              placeholder="Confirmer"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-transparent"
            />
            <button
              disabled={loading}
              className="w-full py-2 rounded bg-brand text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {loading ? 'Enregistrement...' : 'Définir le mot de passe'}
            </button>
            <p className="text-sm text-center text-slate-500">
              <Link href="/login" className="underline">Retour à la connexion</Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<p className="text-center p-10">Chargement...</p>}>
      <ResetInner />
    </Suspense>
  );
}
