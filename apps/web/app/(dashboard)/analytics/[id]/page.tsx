'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

interface PostMetrics {
  postId: string;
  totals: {
    impressions: number;
    reach: number;
    likes: number;
    comments: number;
    shares: number;
    clicks: number;
  };
  perTarget: {
    targetId: string;
    provider: string;
    displayName?: string;
    providerUrl?: string;
    history: {
      fetchedAt: string;
      impressions?: number;
      reach?: number;
      likes?: number;
      comments?: number;
      shares?: number;
      clicks?: number;
    }[];
  }[];
}

export default function AnalyticsDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [data, setData] = useState<PostMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api<PostMetrics>(`/metrics/posts/${id}`)
      .then(setData)
      .catch((e) => setErr(e?.message || 'Erreur'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p>Chargement…</p>;
  if (err) return <p className="text-red-600">{err}</p>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <Link href="/analytics" className="text-sm text-brand hover:underline">
        ← Retour aux analytics
      </Link>
      <h1 className="text-2xl font-bold">Performance du post</h1>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {(
          [
            ['Impressions', data.totals.impressions],
            ['Portée', data.totals.reach],
            ['Likes', data.totals.likes],
            ['Commentaires', data.totals.comments],
            ['Partages', data.totals.shares],
            ['Clics', data.totals.clicks],
          ] as [string, number][]
        ).map(([label, v]) => (
          <div
            key={label}
            className="p-3 border rounded border-slate-200 dark:border-slate-800"
          >
            <p className="text-xs text-slate-500">{label}</p>
            <p className="text-2xl font-semibold tabular-nums">{v || 0}</p>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-semibold pt-2">Par réseau</h2>
      <div className="space-y-4">
        {data.perTarget.map((t) => (
          <div key={t.targetId} className="border rounded border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium">
                {t.provider} {t.displayName ? `· ${t.displayName}` : ''}
              </p>
              {t.providerUrl && (
                <a
                  href={t.providerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-brand hover:underline"
                >
                  Voir le post
                </a>
              )}
            </div>
            {t.history.length === 0 ? (
              <p className="text-sm text-slate-500">
                Aucune métrique disponible (le réseau ne les expose pas avec ce niveau de permission).
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-slate-500">
                  <tr>
                    <th className="py-1">Mesuré le</th>
                    <th className="py-1 text-right">Impressions</th>
                    <th className="py-1 text-right">Portée</th>
                    <th className="py-1 text-right">Likes</th>
                    <th className="py-1 text-right">Commentaires</th>
                    <th className="py-1 text-right">Clics</th>
                  </tr>
                </thead>
                <tbody>
                  {t.history.map((h, i) => (
                    <tr key={i} className="border-t border-slate-200 dark:border-slate-800">
                      <td className="py-1">{new Date(h.fetchedAt).toLocaleString()}</td>
                      <td className="py-1 text-right tabular-nums">{h.impressions ?? '—'}</td>
                      <td className="py-1 text-right tabular-nums">{h.reach ?? '—'}</td>
                      <td className="py-1 text-right tabular-nums">{h.likes ?? '—'}</td>
                      <td className="py-1 text-right tabular-nums">{h.comments ?? '—'}</td>
                      <td className="py-1 text-right tabular-nums">{h.clicks ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
