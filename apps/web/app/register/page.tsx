'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, setToken } from '@/lib/api';

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    tenantName: '',
    tenantSlug: '',
  });
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => {
      if (key === 'tenantName' && !slugTouched) {
        return { ...f, tenantName: value, tenantSlug: slugify(value) };
      }
      return { ...f, [key]: value };
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ accessToken: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setToken(res.accessToken);
      // Kick off the email verification (sends mail or auto-verifies in dev)
      try { await api('/onboarding/email/send', { method: 'POST' }); } catch {}
      router.push('/onboarding');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-4 bg-white dark:bg-slate-900 p-6 rounded-xl shadow">
        <h1 className="text-2xl font-bold">Créer un espace</h1>
        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="space-y-2">
          <p className="text-sm font-medium">Votre organisation</p>
          <input
            required
            placeholder="Nom de l'organisation"
            value={form.tenantName}
            onChange={(e) => update('tenantName', e.target.value)}
            className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-transparent"
          />
          <div>
            <input
              required
              pattern="[a-z0-9-]+"
              placeholder="slug-url-unique"
              value={form.tenantSlug}
              onChange={(e) => {
                setSlugTouched(true);
                update('tenantSlug', slugify(e.target.value));
              }}
              className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-transparent"
            />
            <p className="text-xs text-slate-500 mt-1">
              {form.tenantSlug
                ? <>URL de votre espace : <code className="font-mono">/{form.tenantSlug}</code></>
                : "Sera généré automatiquement à partir du nom de l'organisation."}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Vous</p>
          <input
            placeholder="Nom complet"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-transparent"
          />
          <input
            type="email"
            required
            placeholder="email@exemple.com"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-transparent"
          />
          <input
            type="password"
            required
            minLength={8}
            placeholder="Mot de passe (min 8 caractères)"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-transparent"
          />
        </div>

        <button
          disabled={loading}
          className="w-full py-2 rounded bg-brand text-white hover:bg-brand-dark transition disabled:opacity-50"
        >
          {loading ? 'Création...' : 'Créer'}
        </button>
      </form>
    </main>
  );
}
