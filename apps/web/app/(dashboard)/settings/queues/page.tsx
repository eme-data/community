'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';

type QueueName = 'post-publish' | 'post-metrics' | 'webhook-delivery';

interface QueueOverview {
  name: QueueName;
  counts: Record<string, number>;
}

interface FailedJob {
  id: string;
  name: string;
  data: any;
  attemptsMade: number;
  failedReason?: string;
  stacktrace?: string[];
  timestamp: number;
  finishedOn?: number;
}

const QUEUE_LABELS: Record<QueueName, string> = {
  'post-publish': 'Publication des posts',
  'post-metrics': 'Récupération des metrics',
  'webhook-delivery': 'Livraison webhooks',
};

export default function QueuesPage() {
  const [me, setMe] = useState<{ isSuperAdmin?: boolean } | null>(null);
  const [overview, setOverview] = useState<QueueOverview[]>([]);
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<QueueName>('post-publish');
  const [failed, setFailed] = useState<FailedJob[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    api<{ isSuperAdmin?: boolean }>('/users/me')
      .then(setMe)
      .catch(() => setMe({}));
  }, []);

  useEffect(() => {
    if (!me) return;
    if (!me.isSuperAdmin) {
      setForbidden(true);
      setLoading(false);
      return;
    }
    refresh();
  }, [me]);

  useEffect(() => {
    if (!me?.isSuperAdmin) return;
    loadFailed(selected);
  }, [selected, me]);

  async function refresh() {
    try {
      const data = await api<QueueOverview[]>('/admin/queues');
      setOverview(data);
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) setForbidden(true);
    } finally {
      setLoading(false);
    }
  }

  async function loadFailed(name: QueueName) {
    try {
      const jobs = await api<FailedJob[]>(`/admin/queues/${name}/failed?limit=50`);
      setFailed(jobs);
    } catch {
      setFailed([]);
    }
  }

  async function retry(jobId: string) {
    setBusyId(jobId);
    try {
      await api(`/admin/queues/${selected}/failed/${jobId}/retry`, { method: 'POST' });
      await Promise.all([refresh(), loadFailed(selected)]);
    } finally {
      setBusyId(null);
    }
  }

  async function remove(jobId: string) {
    if (!confirm('Supprimer définitivement ce job échoué ?')) return;
    setBusyId(jobId);
    try {
      await api(`/admin/queues/${selected}/failed/${jobId}`, { method: 'DELETE' });
      await Promise.all([refresh(), loadFailed(selected)]);
    } finally {
      setBusyId(null);
    }
  }

  if (forbidden) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <h1 className="text-2xl font-bold mb-3">Accès réservé</h1>
        <p className="text-slate-600 dark:text-slate-300 mb-6">
          La gestion des files de jobs est réservée aux super-admins.
        </p>
        <Link href="/dashboard" className="text-brand hover:underline">
          Retour au tableau de bord
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Files &amp; jobs</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Surveillez les files BullMQ et rejouez les jobs en échec (publication, metrics,
            webhooks). Les jobs définitivement échoués restent ici pour inspection.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            refresh();
            loadFailed(selected);
          }}
          className="text-sm px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          Rafraîchir
        </button>
      </header>

      {loading ? (
        <p className="text-sm text-slate-500">Chargement...</p>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            {overview.map((q) => (
              <button
                key={q.name}
                type="button"
                onClick={() => setSelected(q.name)}
                className={`text-left rounded-xl border p-4 transition ${
                  selected === q.name
                    ? 'border-brand bg-brand/5'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                }`}
              >
                <div className="font-semibold">{QUEUE_LABELS[q.name]}</div>
                <div className="text-xs text-slate-500 font-mono mt-0.5">{q.name}</div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <Counter label="En attente" value={q.counts.waiting} />
                  <Counter label="Actifs" value={q.counts.active} />
                  <Counter label="Différés" value={q.counts.delayed} />
                  <Counter
                    label="Échoués"
                    value={q.counts.failed}
                    accent={q.counts.failed > 0 ? 'red' : undefined}
                  />
                </dl>
              </button>
            ))}
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">
              Jobs échoués · {QUEUE_LABELS[selected]}
            </h2>
            {failed.length === 0 ? (
              <p className="text-sm text-slate-500">Aucun job échoué dans cette file.</p>
            ) : (
              <div className="space-y-3">
                {failed.map((j) => (
                  <article
                    key={j.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"
                  >
                    <header className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-sm font-mono text-slate-500">#{j.id}</div>
                        <div className="font-medium">{j.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {j.attemptsMade} tentative{j.attemptsMade > 1 ? 's' : ''} · échec à{' '}
                          {j.finishedOn ? new Date(j.finishedOn).toLocaleString('fr-FR') : '?'}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={busyId === j.id}
                          onClick={() => retry(j.id)}
                          className="text-sm px-3 py-1.5 rounded-lg bg-brand text-white hover:bg-brand-dark disabled:opacity-50"
                        >
                          Rejouer
                        </button>
                        <button
                          type="button"
                          disabled={busyId === j.id}
                          onClick={() => remove(j.id)}
                          className="text-sm px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
                        >
                          Supprimer
                        </button>
                      </div>
                    </header>
                    {j.failedReason && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-3 font-mono">
                        {j.failedReason}
                      </p>
                    )}
                    <details className="mt-2">
                      <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">
                        Voir le payload
                      </summary>
                      <pre className="text-xs font-mono mt-2 p-2 bg-slate-50 dark:bg-slate-950 rounded overflow-x-auto">
                        {JSON.stringify(j.data, null, 2)}
                      </pre>
                    </details>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Counter({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | undefined;
  accent?: 'red';
}) {
  return (
    <>
      <dt className="text-slate-500">{label}</dt>
      <dd
        className={`text-right font-mono ${
          accent === 'red' && (value ?? 0) > 0 ? 'text-red-600 dark:text-red-400 font-semibold' : ''
        }`}
      >
        {value ?? 0}
      </dd>
    </>
  );
}
