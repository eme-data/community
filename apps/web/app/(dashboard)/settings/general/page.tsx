'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, setToken } from '@/lib/api';

interface Tenant {
  id: string;
  slug: string;
  name: string;
  requireApproval: boolean;
}

export default function GeneralSettingsPage() {
  const router = useRouter();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [name, setName] = useState('');
  const [requireApproval, setRequireApproval] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<Tenant>('/tenants/current').then((t) => {
      setTenant(t);
      setName(t.name);
      setRequireApproval(t.requireApproval);
    });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api<Tenant>('/tenants/current', {
        method: 'PATCH',
        body: JSON.stringify({ name, requireApproval }),
      });
      setTenant(updated);
    } finally {
      setSaving(false);
    }
  }

  async function deleteTenant() {
    if (!tenant) return;
    const c = prompt(`Tapez le slug "${tenant.slug}" pour confirmer la suppression définitive de cet espace :`);
    if (c !== tenant.slug) {
      alert('Confirmation incorrecte.');
      return;
    }
    try {
      await api('/tenants/current', { method: 'DELETE', body: JSON.stringify({ confirmation: c }) });
      setToken(null);
      router.push('/');
    } catch (err: any) {
      alert(err.message);
    }
  }

  if (!tenant) return <p>Chargement...</p>;

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Paramètres généraux</h1>

      <form onSubmit={save} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nom de l'espace</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-transparent"
          />
          <p className="text-xs text-slate-500 mt-1">Slug : <code>{tenant.slug}</code> (non modifiable)</p>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={requireApproval}
              onChange={(e) => setRequireApproval(e.target.checked)}
              className="mt-1"
            />
            <div>
              <p className="font-medium text-sm">Pré-validation des publications</p>
              <p className="text-xs text-slate-500">
                Les posts soumis par un utilisateur en rôle <code>EDITOR</code> passent par <code>EN ATTENTE</code> et doivent être approuvés par un OWNER ou ADMIN avant d'être mis en file de publication. Les OWNER/ADMIN ne sont pas concernés.
              </p>
            </div>
          </label>
        </div>

        <button disabled={saving} className="px-5 py-2 rounded bg-brand text-white disabled:opacity-50">
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </form>

      <div className="border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10 rounded-lg p-4 space-y-2">
        <h2 className="font-semibold text-red-700 dark:text-red-300">Zone dangereuse</h2>
        <p className="text-sm text-slate-700 dark:text-slate-300">
          Supprimer cet espace effacera définitivement tous les comptes connectés, posts, médias et journaux d'audit.
          Cette action est irréversible.
        </p>
        <button onClick={deleteTenant} className="px-4 py-2 rounded bg-red-600 text-white text-sm">
          Supprimer l'espace
        </button>
      </div>
    </div>
  );
}
