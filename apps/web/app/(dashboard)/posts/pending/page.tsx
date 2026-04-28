'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Post {
  id: string;
  content: string;
  thread: string[];
  status: string;
  scheduledAt?: string;
  authorUserId: string;
  createdAt: string;
  targets: { account: { provider: string; displayName?: string } }[];
}

export default function PendingPostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  function refresh() {
    setLoading(true);
    api<Post[]>('/posts/pending').then(setPosts).finally(() => setLoading(false));
  }
  useEffect(() => { refresh(); }, []);

  async function approve(id: string) {
    try {
      await api(`/posts/${id}/approve`, { method: 'POST' });
      refresh();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function reject(id: string) {
    const reason = prompt('Motif du rejet (optionnel) :') ?? '';
    try {
      await api(`/posts/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) });
      refresh();
    } catch (err: any) {
      alert(err.message);
    }
  }

  if (loading) return <p>Chargement...</p>;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Publications en attente d'approbation</h1>
        <p className="text-sm text-slate-500">Vous voyez les posts soumis par les éditeurs avant leur mise en file de publication.</p>
      </header>

      {posts.length === 0 ? (
        <p className="text-sm text-slate-500 p-6 text-center border border-dashed rounded">
          Aucune publication en attente.
        </p>
      ) : (
        <ul className="space-y-3">
          {posts.map(p => (
            <li key={p.id} className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2 mb-2 text-xs text-slate-500">
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">EN ATTENTE</span>
                <span>soumis le {new Date(p.createdAt).toLocaleString()}</span>
                {p.scheduledAt && <span>· programmé pour le {new Date(p.scheduledAt).toLocaleString()}</span>}
              </div>
              <p className="whitespace-pre-wrap mb-2">{p.content}</p>
              {p.thread?.length > 0 && (
                <details className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                  <summary className="cursor-pointer">+ {p.thread.length} tweets en thread</summary>
                  <ol className="list-decimal pl-5 mt-1 space-y-1">
                    {p.thread.map((t, i) => <li key={i} className="whitespace-pre-wrap">{t}</li>)}
                  </ol>
                </details>
              )}
              <div className="flex flex-wrap gap-1 text-xs mb-3">
                {p.targets.map((t, i) => (
                  <span key={i} className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800">
                    {t.account.provider} {t.account.displayName ?? ''}
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => approve(p.id)} className="px-4 py-1.5 rounded bg-emerald-600 text-white text-sm">Approuver</button>
                <button onClick={() => reject(p.id)} className="px-4 py-1.5 rounded bg-red-600 text-white text-sm">Rejeter</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-slate-500">
        <Link href="/settings/general" className="underline">Paramètres généraux</Link> pour activer/désactiver la pré-validation.
      </p>
    </div>
  );
}
