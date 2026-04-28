'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, setToken } from '@/lib/api';

interface LoginResponse {
  accessToken?: string;
  twoFactorRequired?: boolean;
  challenge?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [challenge, setChallenge] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function postLogin(accessToken: string) {
    setToken(accessToken);
    try {
      const status = await api<{ progress: { completed: boolean } }>('/onboarding/status');
      router.push(status.progress.completed ? '/dashboard' : '/onboarding');
    } catch {
      router.push('/dashboard');
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (res.twoFactorRequired && res.challenge) {
        setChallenge(res.challenge);
      } else if (res.accessToken) {
        await postLogin(res.accessToken);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }

  async function onVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!challenge) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ accessToken: string }>('/auth/2fa/verify', {
        method: 'POST',
        body: JSON.stringify({ challenge, code: otp }),
      });
      await postLogin(res.accessToken);
    } catch (err: any) {
      setError(err.message || 'Code invalide');
    } finally {
      setLoading(false);
    }
  }

  if (challenge) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <form onSubmit={onVerifyOtp} className="w-full max-w-sm space-y-4 bg-white dark:bg-slate-900 p-6 rounded-xl shadow">
          <h1 className="text-2xl font-bold">Code de vérification</h1>
          <p className="text-sm text-slate-500">Entrez le code à 6 chiffres généré par votre application d'authentification.</p>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <input
            required
            inputMode="numeric"
            pattern="[0-9]{6}"
            placeholder="123456"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-transparent text-center tracking-widest font-mono"
            autoFocus
          />
          <button
            disabled={loading}
            className="w-full py-2 rounded bg-brand text-white hover:bg-brand-dark transition disabled:opacity-50"
          >
            {loading ? 'Vérification...' : 'Valider'}
          </button>
          <button
            type="button"
            onClick={() => { setChallenge(null); setOtp(''); }}
            className="w-full py-2 text-sm text-slate-500 hover:underline"
          >
            Annuler
          </button>
        </form>
      </main>
    );
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
          <Link className="underline" href="/forgot-password">Mot de passe oublié ?</Link>
        </p>
        <p className="text-sm text-center text-slate-500">
          Pas de compte ? <Link className="underline" href="/register">Créer un compte</Link>
        </p>
      </form>
    </main>
  );
}
