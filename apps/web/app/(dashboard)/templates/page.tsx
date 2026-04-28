'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Template {
  id: string;
  name: string;
  content: string;
  thread: string[];
  createdAt: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function refresh() {
    api<Template[]>('/templates').then(setTemplates);
  }
  useEffect(() => { refresh(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api('/templates', { method: 'POST', body: JSON.stringify({ name, content }) });
      setName('');
      setContent('');
      refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Supprimer ce template ?')) return;
    await api(`/templates/${id}`, { method: 'DELETE' });
    refresh();
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Templates</h1>
        <p className="text-sm text-slate-500">
          Réutilisez des trames de posts. Vous pouvez insérer des variables comme <code>{'{{brand}}'}</code> ou <code>{'{{date}}'}</code> et les remplacer dans le composer.
        </p>
      </div>

      <form onSubmit={create} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
        <h2 className="font-semibold">Nouveau template</h2>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <input
          required
          maxLength={120}
          placeholder="Nom du template (ex. lancement produit)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-transparent"
        />
        <textarea
          required
          rows={5}
          placeholder="Trame de post (placeholders : {{brand}}, {{date}}, {{name}}…)"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-transparent"
        />
        <button disabled={loading} className="px-5 py-2 rounded bg-brand text-white disabled:opacity-50">
          {loading ? 'Enregistrement...' : 'Créer'}
        </button>
      </form>

      <div>
        <h2 className="font-semibold mb-2">Templates existants</h2>
        {templates.length === 0 ? (
          <p className="text-sm text-slate-500">Aucun template pour le moment.</p>
        ) : (
          <ul className="space-y-3">
            {templates.map(t => (
              <li key={t.id} className="p-3 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold flex-1">{t.name}</p>
                  <button onClick={() => remove(t.id)} className="text-sm text-red-600 hover:underline">Supprimer</button>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap line-clamp-3">{t.content}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
