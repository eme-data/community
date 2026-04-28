'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Recent {
  postId: string;
  content: string;
  publishedAt?: string;
  totals: { impressions: number; likes: number; comments: number };
  targets: { provider: string; providerUrl?: string }[];
}

export default function AnalyticsPage() {
  const [items, setItems] = useState<Recent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Recent[]>('/metrics/recent?limit=30')
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-slate-500 mt-1">
          Indicateurs récupérés à H+1, J+1, J+7 après publication. Disponibles selon les permissions de chaque réseau.
        </p>
      </div>

      {loading ? (
        <p>Chargement…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-500">
          Aucun post publié pour l'instant — les statistiques apparaîtront dès la première publication.
        </p>
      ) : (
        <div className="overflow-x-auto border rounded border-slate-200 dark:border-slate-800">
          <table className="w-full text-sm">
            <thead className="text-left bg-slate-50 dark:bg-slate-900">
              <tr>
                <th className="px-3 py-2">Post</th>
                <th className="px-3 py-2">Réseaux</th>
                <th className="px-3 py-2 text-right">Impressions</th>
                <th className="px-3 py-2 text-right">Likes</th>
                <th className="px-3 py-2 text-right">Commentaires</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.postId} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="px-3 py-2 max-w-md">
                    <p className="line-clamp-2">{it.content}</p>
                    {it.publishedAt && (
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(it.publishedAt).toLocaleString()}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {it.targets.map((t, i) => (
                      <span
                        key={i}
                        className="inline-block mr-1 mb-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800"
                      >
                        {t.provider}
                      </span>
                    ))}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{it.totals.impressions || '—'}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{it.totals.likes || '—'}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{it.totals.comments || '—'}</td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/analytics/${it.postId}`}
                      className="text-brand hover:underline text-xs"
                    >
                      Détail
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
