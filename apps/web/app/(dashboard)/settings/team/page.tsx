'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Invitation {
  id: string;
  email: string;
  role: 'ADMIN' | 'EDITOR' | 'VIEWER';
  createdAt: string;
  expiresAt: string;
}

const ROLES: Invitation['role'][] = ['ADMIN', 'EDITOR', 'VIEWER'];

export default function TeamPage() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Invitation['role']>('EDITOR');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function refresh() {
    api<Invitation[]>('/invitations').then(setInvitations).catch(() => setInvitations([]));
  }
  useEffect(() => { refresh(); }, []);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api('/invitations', { method: 'POST', body: JSON.stringify({ email, role }) });
      setEmail('');
      refresh();
    } catch (err: any) {
      setError(err.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  async function revoke(id: string) {
    if (!confirm('Révoquer cette invitation ?')) return;
    await api(`/invitations/${id}`, { method: 'DELETE' });
    refresh();
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Équipe</h1>
        <p className="text-sm text-slate-500">Invitez des collaborateurs à rejoindre cet espace.</p>
      </div>

      <form onSubmit={invite} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
        <h2 className="font-semibold">Nouvelle invitation</h2>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            required
            placeholder="email@exemple.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-transparent"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Invitation['role'])}
            className="px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-transparent"
          >
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <button disabled={loading} className="px-5 py-2 rounded bg-brand text-white disabled:opacity-50">
            Inviter
          </button>
        </div>
      </form>

      <div>
        <h2 className="font-semibold mb-2">Invitations en attente</h2>
        {invitations.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune invitation en attente.</p>
        ) : (
          <ul className="border border-slate-200 dark:border-slate-800 rounded divide-y divide-slate-200 dark:divide-slate-800">
            {invitations.map(i => (
              <li key={i.id} className="p-3 flex items-center gap-3">
                <span className="font-mono text-sm flex-1 truncate">{i.email}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">{i.role}</span>
                <span className="text-xs text-slate-500">expire le {new Date(i.expiresAt).toLocaleDateString()}</span>
                <button onClick={() => revoke(i.id)} className="text-sm text-red-600 hover:underline">Révoquer</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
