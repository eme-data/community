'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api('/auth/password/forgot', { method: 'POST', body: JSON.stringify({ email }) });
      setDone(true);
    } catch (err: any) {
      setError(err.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 p-6 rounded-xl shadow space-y-4">
        <h1 className="text-2xl font-bold">Mot de passe oublié</h1>
        {done ? (
          <>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Si un compte existe avec cet email, un lien de réinitialisation vient d'être envoyé.
              Vérifiez votre boîte de réception (et les spams).
            </p>
            <Link href="/login" className="text-sm underline">Retour à la connexion</Link>
          </>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Entrez votre adresse email — nous vous enverrons un lien pour choisir un nouveau mot de passe.
            </p>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <input
              type="email"
              required
              placeholder="email@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-transparent"
            />
            <button
              disabled={loading}
              className="w-full py-2 rounded bg-brand text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {loading ? 'Envoi...' : 'Envoyer le lien'}
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
