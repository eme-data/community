'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface BrandVoice {
  tone?: string;
  guidelines?: string;
  doNotMention?: string[];
  examples?: string[];
}

interface Tenant {
  id: string;
  name: string;
  brandVoice?: BrandVoice | null;
}

export default function BrandVoicePage() {
  const [tone, setTone] = useState('');
  const [guidelines, setGuidelines] = useState('');
  const [doNotMention, setDoNotMention] = useState('');
  const [examples, setExamples] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    api<Tenant>('/tenants/current').then((t) => {
      const bv = t.brandVoice ?? {};
      setTone(bv.tone ?? '');
      setGuidelines(bv.guidelines ?? '');
      setDoNotMention((bv.doNotMention ?? []).join(', '));
      setExamples(bv.examples ?? []);
    });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const brandVoice: BrandVoice = {
        tone: tone.trim() || undefined,
        guidelines: guidelines.trim() || undefined,
        doNotMention: doNotMention
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        examples: examples.filter((e) => e.trim().length > 0),
      };
      await api('/tenants/current', {
        method: 'PATCH',
        body: JSON.stringify({ brandVoice }),
      });
      setSavedAt(Date.now());
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Brand voice</h1>
        <p className="text-sm text-slate-500">
          Définit le ton et les règles de communication de l'espace. Ces consignes sont injectées
          dans toutes les requêtes IA (suggestion de hashtags, reformulation), pour que les contenus
          générés respectent l'identité de la marque.
        </p>
      </div>

      <form onSubmit={save} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Ton</label>
          <input
            placeholder="ex. chaleureux, expert, légèrement décalé"
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Consignes / charte</label>
          <textarea
            rows={5}
            placeholder="ex. Vouvoyer le lecteur. Privilégier les phrases courtes. Toujours citer la source. Pas d'emoji avant le 3e tweet d'un thread."
            value={guidelines}
            onChange={(e) => setGuidelines(e.target.value)}
            className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">À ne jamais mentionner</label>
          <input
            placeholder="ex. concurrent X, ancien produit Y, prix"
            value={doNotMention}
            onChange={(e) => setDoNotMention(e.target.value)}
            className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-transparent"
          />
          <p className="text-xs text-slate-500 mt-1">Séparé par des virgules.</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Exemples de posts représentatifs</label>
          <p className="text-xs text-slate-500 mb-2">
            Collez 1 à 3 publications passées qui incarnent bien la voix de la marque. L'IA s'en inspirera.
          </p>
          {examples.map((ex, i) => (
            <div key={i} className="flex gap-2 items-start mb-2">
              <textarea
                rows={3}
                value={ex}
                onChange={(e) => {
                  const next = [...examples];
                  next[i] = e.target.value;
                  setExamples(next);
                }}
                placeholder={`Exemple #${i + 1}`}
                className="flex-1 px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-transparent text-sm"
              />
              <button
                type="button"
                onClick={() => setExamples(examples.filter((_, j) => j !== i))}
                className="text-red-600 text-sm"
              >×</button>
            </div>
          ))}
          {examples.length < 3 && (
            <button
              type="button"
              onClick={() => setExamples([...examples, ''])}
              className="text-sm text-brand hover:underline"
            >
              + Ajouter un exemple
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button disabled={saving} className="px-5 py-2 rounded bg-brand text-white disabled:opacity-50">
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
          {savedAt && Date.now() - savedAt < 4000 && (
            <span className="text-sm text-emerald-600">Enregistré ✓</span>
          )}
        </div>
      </form>
    </div>
  );
}
