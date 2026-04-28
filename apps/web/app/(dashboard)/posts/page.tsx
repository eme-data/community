'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface PostTarget {
  id: string;
  status: string;
  providerUrl?: string;
  errorMessage?: string;
  account: { provider: string; displayName?: string };
}
interface Post {
  id: string;
  content: string;
  status: string;
  scheduledAt?: string;
  publishedAt?: string;
  targets: PostTarget[];
}

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  function refresh() {
    setLoading(true);
    api<Post[]>('/posts').then(setPosts).finally(() => setLoading(false));
  }

  useEffect(() => { refresh(); }, []);

  async function publishNow(id: string) {
    await api(`/posts/${id}/publish`, { method: 'POST' });
    refresh();
  }

  async function cancel(id: string) {
    await api(`/posts/${id}/schedule`, { method: 'DELETE' });
    refresh();
  }

  if (loading) return <p>Chargement...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Publications</h1>
        <Link href="/posts/new" className="px-4 py-2 rounded bg-brand text-white">Nouveau post</Link>
      </div>

      <ul className="space-y-3">
        {posts.map(p => (
          <li key={p.id} className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">{p.status}</span>
              {p.scheduledAt && <span className="text-xs text-slate-500">prévu le {new Date(p.scheduledAt).toLocaleString()}</span>}
            </div>
            <p className="whitespace-pre-wrap">{p.content}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {p.targets.map(t => (
                <span key={t.id} className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800">
                  {t.account.provider} → {t.status}
                  {t.providerUrl && <a className="ml-1 underline" href={t.providerUrl} target="_blank">voir</a>}
                </span>
              ))}
            </div>
            {p.status !== 'PUBLISHED' && (
              <div className="mt-3 flex gap-2">
                <button onClick={() => publishNow(p.id)} className="px-3 py-1 rounded text-sm bg-emerald-600 text-white">Publier maintenant</button>
                {p.status === 'SCHEDULED' && (
                  <button onClick={() => cancel(p.id)} className="px-3 py-1 rounded text-sm border border-slate-300 dark:border-slate-700">Annuler</button>
                )}
              </div>
            )}
          </li>
        ))}
        {posts.length === 0 && (
          <li className="p-6 text-center text-sm text-slate-500 border border-dashed rounded">
            Aucune publication pour le moment.
          </li>
        )}
      </ul>
    </div>
  );
}
