'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface AuditEntry {
  id: string;
  action: string;
  target?: string;
  userId?: string;
  payload?: Record<string, unknown>;
  ip?: string;
  createdAt: string;
}

const ACTION_COLORS: Record<string, string> = {
  'post.published': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  'post.failed': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  'post.scheduled': 'bg-brand/15 text-brand',
  'post.draft.created': 'bg-slate-100 dark:bg-slate-800',
  'social.account.connected': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  'social.account.disconnected': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  'invitation.sent': 'bg-brand/15 text-brand',
  'invitation.accepted': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
};

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<AuditEntry[]>('/audit').then(setEntries).finally(() => setLoading(false));
  }, []);

  async function exportCsv() {
    const base = process.env.NEXT_PUBLIC_API_URL || '/api';
    const token = typeof window !== 'undefined' ? localStorage.getItem('community.token') : null;
    const res = await fetch(`${base}/audit/export.csv`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) { alert('Export failed'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <p>Chargement...</p>;

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Journal d'audit</h1>
          <p className="text-sm text-slate-500">
            Les 200 derniers événements de cet espace (publications, comptes connectés, invitations…).
          </p>
        </div>
        <button
          onClick={exportCsv}
          className="px-3 py-2 rounded border border-slate-300 dark:border-slate-700 hover:border-brand text-sm whitespace-nowrap"
        >
          Exporter CSV
        </button>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-slate-500">Aucun événement pour le moment.</p>
      ) : (
        <ul className="border border-slate-200 dark:border-slate-800 rounded divide-y divide-slate-200 dark:divide-slate-800">
          {entries.map(e => (
            <li key={e.id} className="p-3 flex items-start gap-3 text-sm">
              <span className="text-xs text-slate-500 w-32 shrink-0 font-mono">
                {new Date(e.createdAt).toLocaleString()}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${ACTION_COLORS[e.action] ?? 'bg-slate-100 dark:bg-slate-800'}`}>
                {e.action}
              </span>
              <div className="flex-1 min-w-0">
                {e.target && <p className="text-xs text-slate-500 truncate">target: {e.target}</p>}
                {e.payload && (
                  <pre className="text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-900 rounded p-1 mt-1 overflow-x-auto max-w-full">
                    {JSON.stringify(e.payload, null, 0)}
                  </pre>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
