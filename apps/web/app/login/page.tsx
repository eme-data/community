'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, setToken } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ accessToken: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setToken(res.accessToken);
      // Resume onboarding if it isn't completed yet.
      try {
        const status = await api<{ progress: { completed: boolean } }>('/onboarding/status');
        router.push(status.progress.completed ? '/dashboard' : '/onboarding');
      } catch {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 bg-white dark:bg-slate-900 p-6 rounded-xl shadow">
        <h1 className="text-2xl font-bold">Connexion</h1>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <input
          type="email"
          required
          placeholder="email@exemple.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-transparent"
        />
        <input
          type="password"
          required
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-transparent"
        />
        <button
          disabled={loading}
          className="w-full py-2 rounded bg-brand text-white hover:bg-brand-dark transition disabled:opacity-50"
        >
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>
        <p className="text-sm text-center text-slate-500">
          Pas de compte ? <Link className="underline" href="/register">Créer un compte</Link>
        </p>
      </form>
    </main>
  );
}
