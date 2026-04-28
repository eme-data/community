'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Tenant { id: string; slug: string; name: string }
interface Post { id: string; content: string; status: string; scheduledAt?: string; publishedAt?: string }

export default function DashboardPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api<Tenant>('/tenants/current'), api<Post[]>('/posts')])
      .then(([t, p]) => { setTenant(t); setPosts(p); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Chargement...</p>;

  const scheduled = posts.filter(p => p.status === 'SCHEDULED').length;
  const published = posts.filter(p => p.status === 'PUBLISHED').length;
  const drafts = posts.filter(p => p.status === 'DRAFT').length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">{tenant?.name}</h1>
        <p className="text-sm text-slate-500">Espace : {tenant?.slug}</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card label="Brouillons" value={drafts} />
        <Card label="Programmés" value={scheduled} />
        <Card label="Publiés" value={published} />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">Derniers posts</h2>
        <ul className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded">
          {posts.slice(0, 8).map(p => (
            <li key={p.id} className="p-3 flex items-center gap-3">
              <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">{p.status}</span>
              <span className="truncate flex-1">{p.content}</span>
            </li>
          ))}
          {posts.length === 0 && (
            <li className="p-6 text-center text-sm text-slate-500">
              Aucune publication. <Link href="/posts/new" className="underline">Créer la première</Link>.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}
