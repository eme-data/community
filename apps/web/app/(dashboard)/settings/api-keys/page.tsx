'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface ApiKey {
  id: string;
  name: string;
  preview: string;
  scopes: string[];
  expiresAt?: string | null;
  revokedAt?: string | null;
  lastUsedAt?: string | null;
  createdAt: string;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [name, setName] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [scopes, setScopes] = useState<string[]>(['read', 'write']);
  const [createdRaw, setCreatedRaw] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function refresh() {
    api<ApiKey[]>('/api-keys').then(setKeys).catch(() => setKeys([]));
  }
  useEffect(() => { refresh(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ rawKey: string }>('/api-keys', {
        method: 'POST',
        body: JSON.stringify({
          name,
          scopes,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        }),
      });
      setCreatedRaw(res.rawKey);
      setName('');
      setExpiresAt('');
      refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function revoke(id: string) {
    if (!confirm('Révoquer cette clé ? Les intégrations qui l\'utilisent cesseront de fonctionner immédiatement.')) return;
    await api(`/api-keys/${id}`, { method: 'DELETE' });
    refresh();
  }

  function toggleScope(s: string) {
    setScopes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Clés API</h1>
        <p className="text-sm text-slate-500">
          Permettent à des outils tiers (Zapier, n8n, Make, ton CMS) de créer des publications via l'API.
          Envoyez-les avec le header <code>Authorization: Bearer apk_…</code>.
          Endpoints publics : <code>/api/posts</code>, <code>/api/media</code>, <code>/api/templates</code>.
        </p>
      </div>

      {createdRaw && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 rounded-lg p-4 space-y-2">
          <p className="font-semibold text-amber-900 dark:text-amber-200">Clé créée — copiez-la maintenant</p>
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Elle ne sera plus jamais affichée. Stockez-la dans un gestionnaire de secrets.
          </p>
          <code className="block bg-white dark:bg-slate-950 border border-amber-200 dark:border-amber-900/40 rounded px-3 py-2 font-mono text-sm break-all">
            {createdRaw}
          </code>
          <div className="flex gap-2">
            <button
              onClick={() => navigator.clipboard.writeText(createdRaw)}
              className="text-xs underline"
            >
              Copier
            </button>
            <button onClick={() => setCreatedRaw(null)} className="text-xs underline ml-auto">
              J'ai copié, masquer
            </button>
          </div>
        </div>
      )}

      <form onSubmit={create} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
        <h2 className="font-semibold">Nouvelle clé</h2>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <input
          required
          maxLength={120}
          placeholder="Nom (ex. Zapier production)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-transparent"
        />
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={scopes.includes('read')} onChange={() => toggleScope('read')} />
            read (liste posts/comptes/templates)
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={scopes.includes('write')} onChange={() => toggleScope('write')} />
            write (créer posts, uploader média)
          </label>
        </div>
        <div>
          <label className="block text-sm mb-1">Expiration (optionnelle)</label>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-transparent"
          />
        </div>
        <button disabled={loading} className="px-5 py-2 rounded bg-brand text-white disabled:opacity-50">
          {loading ? 'Création...' : 'Créer la clé'}
        </button>
      </form>

      <div>
        <h2 className="font-semibold mb-2">Clés existantes</h2>
        {keys.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune clé.</p>
        ) : (
          <ul className="border border-slate-200 dark:border-slate-800 rounded divide-y divide-slate-200 dark:divide-slate-800">
            {keys.map(k => (
              <li key={k.id} className="p-3 flex items-center gap-3 text-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {k.name}
                    {k.revokedAt && <span className="ml-2 text-red-600 text-xs">RÉVOQUÉE</span>}
                  </p>
                  <p className="text-xs text-slate-500 font-mono">{k.preview}…</p>
                  <p className="text-xs text-slate-500">
                    {k.scopes.join(', ')} · créée le {new Date(k.createdAt).toLocaleDateString()}
                    {k.expiresAt && ` · expire le ${new Date(k.expiresAt).toLocaleDateString()}`}
                    {k.lastUsedAt && ` · dernier usage le ${new Date(k.lastUsedAt).toLocaleString()}`}
                  </p>
                </div>
                {!k.revokedAt && (
                  <button onClick={() => revoke(k.id)} className="text-sm text-red-600 hover:underline">
                    Révoquer
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <details className="text-sm text-slate-600 dark:text-slate-400">
        <summary className="cursor-pointer font-medium">Exemple cURL</summary>
        <pre className="mt-2 p-3 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 overflow-x-auto text-xs">{`curl -X POST https://community.meoxa.app/api/posts \\
  -H "Authorization: Bearer apk_xxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "content": "Hello from Zapier",
    "accountIds": ["<social-account-id>"],
    "scheduledAt": "2026-05-01T09:00:00Z"
  }'`}</pre>
      </details>
    </div>
  );
}
