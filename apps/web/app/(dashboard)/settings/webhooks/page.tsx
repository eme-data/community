'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Webhook {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  lastDeliveryAt?: string;
  lastFailureAt?: string;
  createdAt: string;
}

interface Delivery {
  id: string;
  event: string;
  statusCode?: number;
  attempts: number;
  deliveredAt?: string;
  errorMessage?: string;
  createdAt: string;
}

export default function WebhooksPage() {
  const [items, setItems] = useState<Webhook[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [createdSecret, setCreatedSecret] = useState<{ id: string; secret: string } | null>(null);
  const [openDeliveries, setOpenDeliveries] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);

  // form state
  const [url, setUrl] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function refresh() {
    setLoading(true);
    api<Webhook[]>('/webhooks').then(setItems).finally(() => setLoading(false));
  }

  useEffect(() => {
    refresh();
    api<string[]>('/webhooks/events').then(setEvents);
  }, []);

  function toggle(ev: string) {
    setSelected((prev) =>
      prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev],
    );
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const created = await api<Webhook & { secret: string }>('/webhooks', {
        method: 'POST',
        body: JSON.stringify({ url, events: selected }),
      });
      setCreatedSecret({ id: created.id, secret: created.secret });
      setUrl('');
      setSelected([]);
      refresh();
    } catch (e: any) {
      setErr(e?.message || 'Création impossible');
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(w: Webhook) {
    await api(`/webhooks/${w.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ active: !w.active }),
    });
    refresh();
  }

  async function remove(id: string) {
    if (!confirm('Supprimer ce webhook ?')) return;
    await api(`/webhooks/${id}`, { method: 'DELETE' });
    refresh();
  }

  async function showDeliveries(id: string) {
    if (openDeliveries === id) {
      setOpenDeliveries(null);
      return;
    }
    setOpenDeliveries(id);
    const d = await api<Delivery[]>(`/webhooks/${id}/deliveries`);
    setDeliveries(d);
  }

  async function redeliver(id: string, deliveryId: string) {
    await api(`/webhooks/${id}/deliveries/${deliveryId}/redeliver`, { method: 'POST' });
    showDeliveries(id);
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Webhooks</h1>
        <p className="text-sm text-slate-500 mt-1">
          Reçois un POST signé HMAC-SHA256 sur ton URL à chaque événement (publication, échec, approbation…).
          Vérifie l'en-tête <code>X-Community-Signature</code> avec le secret affiché à la création.
        </p>
      </div>

      <form
        onSubmit={create}
        className="space-y-3 border rounded p-4 border-slate-200 dark:border-slate-800"
      >
        <div>
          <label className="text-sm font-medium">URL de réception</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/community-hook"
            required
            className="w-full mt-1 px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-transparent"
          />
        </div>
        <div>
          <p className="text-sm font-medium mb-1">Événements</p>
          <div className="flex flex-wrap gap-2">
            {events.map((ev) => (
              <label
                key={ev}
                className="text-xs px-2 py-1 border rounded cursor-pointer border-slate-300 dark:border-slate-700"
              >
                <input
                  type="checkbox"
                  className="mr-1"
                  checked={selected.includes(ev)}
                  onChange={() => toggle(ev)}
                />
                {ev}
              </label>
            ))}
          </div>
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button
          type="submit"
          disabled={busy || selected.length === 0}
          className="px-4 py-2 rounded bg-brand text-white text-sm disabled:opacity-50"
        >
          Créer
        </button>
      </form>

      {createdSecret && (
        <div className="border-2 border-amber-500 rounded p-3 bg-amber-50 dark:bg-amber-950/30 text-sm space-y-2">
          <p className="font-medium">Secret du webhook — copie-le maintenant, il ne sera plus jamais affiché :</p>
          <code className="block p-2 bg-white dark:bg-slate-900 rounded font-mono text-xs break-all">
            {createdSecret.secret}
          </code>
          <button
            className="text-xs text-brand hover:underline"
            onClick={() => setCreatedSecret(null)}
          >
            J'ai copié, masquer
          </button>
        </div>
      )}

      <h2 className="text-lg font-semibold pt-2">Webhooks configurés</h2>
      {loading ? (
        <p>Chargement…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-500">Aucun webhook configuré.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((w) => (
            <li
              key={w.id}
              className="border rounded p-3 border-slate-200 dark:border-slate-800"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm break-all">{w.url}</p>
                  <p className="text-xs text-slate-500 mt-1">{w.events.join(', ') || '— aucun événement'}</p>
                  <p className="text-xs text-slate-500">
                    {w.lastDeliveryAt
                      ? `Dernière livraison ${new Date(w.lastDeliveryAt).toLocaleString()}`
                      : 'Jamais livré'}
                    {w.lastFailureAt && ` · Dernier échec ${new Date(w.lastFailureAt).toLocaleString()}`}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded ${w.active ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800'}`}
                >
                  {w.active ? 'Actif' : 'Inactif'}
                </span>
              </div>
              <div className="flex gap-3 mt-3 text-xs">
                <button onClick={() => toggleActive(w)} className="text-brand hover:underline">
                  {w.active ? 'Désactiver' : 'Activer'}
                </button>
                <button onClick={() => showDeliveries(w.id)} className="text-brand hover:underline">
                  {openDeliveries === w.id ? 'Masquer' : 'Voir'} les livraisons
                </button>
                <button onClick={() => remove(w.id)} className="text-red-600 hover:underline">
                  Supprimer
                </button>
              </div>
              {openDeliveries === w.id && (
                <div className="mt-3 border-t pt-3 border-slate-200 dark:border-slate-800">
                  {deliveries.length === 0 ? (
                    <p className="text-xs text-slate-500">Aucune livraison.</p>
                  ) : (
                    <ul className="space-y-1 text-xs">
                      {deliveries.map((d) => (
                        <li key={d.id} className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${d.deliveredAt ? 'bg-emerald-500' : 'bg-red-500'}`}
                          />
                          <span className="font-mono">{d.event}</span>
                          <span>HTTP {d.statusCode ?? '—'}</span>
                          <span>{d.attempts} essai(s)</span>
                          <span className="text-slate-500">
                            {new Date(d.createdAt).toLocaleString()}
                          </span>
                          {d.errorMessage && (
                            <span className="text-red-600 truncate">{d.errorMessage}</span>
                          )}
                          <button
                            onClick={() => redeliver(w.id, d.id)}
                            className="ml-auto text-brand hover:underline"
                          >
                            Rejouer
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
