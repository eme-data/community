'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Tenant { id: string; slug: string; name: string }
interface Post {
  id: string;
  content: string;
  status: string;
  scheduledAt?: string;
  publishedAt?: string;
  createdAt?: string;
}
interface OnboardingStatus {
  progress: {
    emailVerified: boolean;
    accountConnected: boolean;
    firstPostCreated: boolean;
    completed: boolean;
  };
}

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: 'Brouillon', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  PENDING_APPROVAL: { label: 'À approuver', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  SCHEDULED: { label: 'Programmé', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  PUBLISHED: { label: 'Publié', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  FAILED: { label: 'Échec', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
};

export default function DashboardPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [onboarding, setOnboarding] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api<Tenant>('/tenants/current'),
      api<Post[]>('/posts'),
      api<OnboardingStatus>('/onboarding/status').catch(() => null),
    ])
      .then(([t, p, ob]) => { setTenant(t); setPosts(p); setOnboarding(ob); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[0,1,2,3].map(i => <div key={i} className="h-24 bg-slate-100 dark:bg-slate-900 rounded-xl animate-pulse" />)}
        </div>
        <div className="h-64 bg-slate-100 dark:bg-slate-900 rounded-xl animate-pulse" />
      </div>
    );
  }

  const drafts = posts.filter(p => p.status === 'DRAFT').length;
  const pending = posts.filter(p => p.status === 'PENDING_APPROVAL').length;
  const scheduled = posts.filter(p => p.status === 'SCHEDULED').length;
  const published = posts.filter(p => p.status === 'PUBLISHED').length;

  const greeting = greet();
  const recentPosts = [...posts]
    .sort((a, b) => +new Date(b.scheduledAt || b.publishedAt || b.createdAt || 0) - +new Date(a.scheduledAt || a.publishedAt || a.createdAt || 0))
    .slice(0, 8);

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500 mb-1">{greeting}</p>
          <h1 className="text-3xl font-bold tracking-tight">{tenant?.name}</h1>
          <p className="text-sm text-slate-500 mt-1">Voici l'activité de votre espace.</p>
        </div>
        <Link
          href="/posts/new"
          className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg bg-brand text-white font-medium text-sm hover:bg-brand-dark transition shadow-sm"
        >
          + Nouveau post
        </Link>
      </header>

      {onboarding && !onboarding.progress.completed && (
        <OnboardingChecklist progress={onboarding.progress} />
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Brouillons" value={drafts} tone="slate" href="/posts" />
        <Stat label="À approuver" value={pending} tone="amber" href="/posts/pending" />
        <Stat label="Programmés" value={scheduled} tone="blue" href="/posts/calendar" />
        <Stat label="Publiés" value={published} tone="emerald" href="/posts" />
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <Shortcut href="/posts/new" title="Composer un post" subtitle="Pour 1 ou plusieurs réseaux" />
        <Shortcut href="/posts/calendar" title="Voir le calendrier" subtitle="Planifiez à plusieurs semaines" />
        <Shortcut href="/templates" title="Mes modèles" subtitle="Réutilisez vos meilleurs formats" />
      </section>

      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-semibold">Derniers posts</h2>
          <Link href="/posts" className="text-sm text-brand hover:underline">
            Tout voir →
          </Link>
        </div>
        {recentPosts.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-500 text-sm mb-4">Aucune publication pour le moment.</p>
            <Link
              href="/posts/new"
              className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-dark"
            >
              Créer mon premier post
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentPosts.map(p => {
              const s = STATUS_STYLES[p.status] || { label: p.status, cls: STATUS_STYLES.DRAFT.cls };
              const dt = p.scheduledAt || p.publishedAt || p.createdAt;
              return (
                <li key={p.id} className="px-5 py-3 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                  <span className={`text-xs px-2 py-0.5 rounded-md font-medium shrink-0 ${s.cls}`}>{s.label}</span>
                  <Link href={`/posts/${p.id}`} className="flex-1 min-w-0 truncate text-sm">
                    {p.content || <span className="text-slate-400 italic">(sans titre)</span>}
                  </Link>
                  {dt && (
                    <span className="text-xs text-slate-500 shrink-0 hidden sm:inline">
                      {formatRelative(dt)}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, tone, href }: { label: string; value: number; tone: 'slate' | 'amber' | 'blue' | 'emerald'; href: string }) {
  const tones = {
    slate: 'text-slate-500',
    amber: 'text-amber-600 dark:text-amber-400',
    blue: 'text-blue-600 dark:text-blue-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
  };
  return (
    <Link
      href={href}
      className="block p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-brand/50 hover:shadow-sm transition"
    >
      <p className={`text-xs font-medium uppercase tracking-wider ${tones[tone]}`}>{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </Link>
  );
}

function OnboardingChecklist({
  progress,
}: {
  progress: OnboardingStatus['progress'];
}) {
  const items = [
    {
      done: progress.emailVerified,
      label: 'Confirmer votre adresse email',
      href: '/onboarding/verify',
    },
    {
      done: progress.accountConnected,
      label: 'Connecter un compte social',
      href: '/accounts',
    },
    {
      done: progress.firstPostCreated,
      label: 'Créer votre premier post',
      href: '/posts/new',
    },
  ];
  const remaining = items.filter((i) => !i.done).length;
  if (remaining === 0) return null;
  const totalDone = items.length - remaining;

  return (
    <section className="rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30 p-5">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h2 className="font-semibold text-blue-900 dark:text-blue-100">
            Finalisez la configuration de votre espace
          </h2>
          <p className="text-sm text-blue-800/80 dark:text-blue-200/80 mt-0.5">
            {totalDone} sur {items.length} étape{items.length > 1 ? 's' : ''} validée
            {totalDone > 1 ? 's' : ''}.
          </p>
        </div>
      </div>
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.href} className="flex items-center justify-between gap-3 text-sm">
            <span className={`flex items-center gap-2 ${it.done ? 'text-blue-800/60 line-through' : 'text-blue-900 dark:text-blue-100'}`}>
              <span
                className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${
                  it.done
                    ? 'bg-emerald-500 text-white'
                    : 'bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 text-blue-600'
                }`}
              >
                {it.done ? '✓' : ''}
              </span>
              {it.label}
            </span>
            {!it.done && (
              <Link
                href={it.href}
                className="text-sm font-medium text-blue-700 dark:text-blue-300 hover:underline"
              >
                Continuer →
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Shortcut({ href, title, subtitle }: { href: string; title: string; subtitle: string }) {
  return (
    <Link
      href={href}
      className="group block p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-brand transition"
    >
      <p className="font-semibold mb-1">{title}</p>
      <p className="text-sm text-slate-500">{subtitle}</p>
      <p className="mt-3 text-sm text-brand opacity-0 group-hover:opacity-100 transition">Aller →</p>
    </Link>
  );
}

function greet() {
  const h = new Date().getHours();
  if (h < 6) return 'Bonsoir';
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  const future = diff < 0;
  const abs = Math.abs(diff);
  if (abs < 60) return future ? 'dans quelques sec' : "à l'instant";
  if (abs < 3600) {
    const m = Math.round(abs / 60);
    return future ? `dans ${m} min` : `il y a ${m} min`;
  }
  if (abs < 86400) {
    const h = Math.round(abs / 3600);
    return future ? `dans ${h} h` : `il y a ${h} h`;
  }
  if (abs < 86400 * 7) {
    const days = Math.round(abs / 86400);
    return future ? `dans ${days} j` : `il y a ${days} j`;
  }
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}