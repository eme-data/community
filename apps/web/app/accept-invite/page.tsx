'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api, setToken } from '@/lib/api';

interface Preview {
  email: string;
  role: 'ADMIN' | 'EDITOR' | 'VIEWER';
  tenant: { name: string; slug: string };
  userExists: boolean;
}

function AcceptInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') || '';

  const [preview, setPreview] = useState<Preview | null>(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    api<Preview>(`/invitations/preview?token=${encodeURIComponent(token)}`)
      .then(setPreview)
      .catch((err) => setError(err.message || 'Lien invalide'));
  }, [token]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api('/invitations/accept', {
        method: 'POST',
        body: JSON.stringify({
          token,
          name: preview?.userExists ? undefined : name,
          password: preview?.userExists ? undefined : password,
        }),
      });

      // If the user was created here we have to log them in.
      if (!preview?.userExists) {
        const login = await api<{ accessToken: string }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: preview?.email, password }),
        });
        setToken(login.accessToken);
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return <p className="text-center p-10 text-red-600">Lien d'invitation manquant.</p>;
  }
  if (error && !preview) {
    return (
      <main className="p-10 text-center">
        <h1 className="text-xl font-bold mb-2">Invitation invalide</h1>
        <p className="text-slate-500 mb-4">{error}</p>
        <Link href="/" className="underline">Retour à l'accueil</Link>
      </main>
    );
  }
  if (!preview) return <p className="text-center p-10">Chargement...</p>;

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 p-6 rounded-xl shadow space-y-4">
        <h1 className="text-2xl font-bold">Rejoindre {preview.tenant.name}</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Vous êtes invité(e) en tant que <strong>{preview.role}</strong> avec l'adresse <strong>{preview.email}</strong>.
        </p>
        <form onSubmit={onSubmit} className="space-y-3">
          {error && <p className="text-red-600 text-sm">{error}</p>}
          {!preview.userExists && (
            <>
              <input
                placeholder="Votre nom"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-transparent"
              />
              <input
                type="password"
                required
                minLength={8}
                placeholder="Mot de passe (min 8)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-transparent"
              />
            </>
          )}
          <button
            disabled={loading}
            className="w-full py-2 rounded bg-brand text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {loading ? 'Acceptation...' : preview.userExists ? 'Accepter et se connecter' : 'Créer le compte et rejoindre'}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<p className="text-center p-10">Chargement...</p>}>
      <AcceptInner />
    </Suspense>
  );
}
