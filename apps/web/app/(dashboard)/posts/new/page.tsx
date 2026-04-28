'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, apiUpload } from '@/lib/api';

interface Account {
  id: string;
  provider: string;
  displayName?: string;
}

interface Media {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

interface Template {
  id: string;
  name: string;
  content: string;
  thread: string[];
}

export default function NewPostPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [content, setContent] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [media, setMedia] = useState<Media[]>([]);
  const [uploading, setUploading] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [thread, setThread] = useState<string[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hasTwitter = [...selected].some((id) => {
    const a = accounts.find((acc) => acc.id === id);
    return a?.provider === 'TWITTER';
  });

  useEffect(() => {
    api<Account[]>('/social/accounts').then(setAccounts);
    api<Template[]>('/templates').then(setTemplates).catch(() => setTemplates([]));
    api<{ enabled: boolean }>('/ai/status').then((s) => setAiEnabled(s.enabled)).catch(() => {});
  }, []);

  function applyTemplate(id: string) {
    const t = templates.find((tmpl) => tmpl.id === id);
    if (!t) return;
    setContent(t.content);
    setThread(t.thread ?? []);
  }

  async function suggestHashtags() {
    if (!content.trim()) return;
    setAiBusy(true);
    try {
      const networks = [...selected]
        .map((id) => accounts.find((a) => a.id === id)?.provider)
        .filter((p): p is string => !!p);
      const res = await api<{ hashtags: string[] }>('/ai/hashtags', {
        method: 'POST',
        body: JSON.stringify({ content, networks }),
      });
      setContent((c) => `${c}\n\n${res.hashtags.join(' ')}`.trim());
    } catch (err: any) {
      alert(err.message || 'Erreur IA');
    } finally {
      setAiBusy(false);
    }
  }

  async function rewriteFor(network: string) {
    if (!content.trim()) return;
    const tone = prompt('Ton (professional, casual, enthusiastic, informative, witty) :', 'professional');
    if (!tone) return;
    setAiBusy(true);
    try {
      const res = await api<{ rewritten: string; thread?: string[] }>('/ai/rewrite', {
        method: 'POST',
        body: JSON.stringify({ content, network, tone }),
      });
      setContent(res.rewritten);
      if (res.thread) setThread(res.thread);
    } catch (err: any) {
      alert(err.message || 'Erreur IA');
    } finally {
      setAiBusy(false);
    }
  }

  function toggle(id: string) {
    setSelected((s) => {
      const ns = new Set(s);
      if (ns.has(id)) ns.delete(id); else ns.add(id);
      return ns;
    });
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const m = await apiUpload<Media>('/media', file);
      setMedia((prev) => [...prev, m]);
    } catch (err: any) {
      setError(err.message || 'Échec de l\'upload');
    } finally {
      setUploading(false);
      e.target.value = ''; // allow re-selecting the same file
    }
  }

  function removeMedia(id: string) {
    setMedia((prev) => prev.filter((m) => m.id !== id));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selected.size === 0) {
      setError('Sélectionnez au moins un compte');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api('/posts', {
        method: 'POST',
        body: JSON.stringify({
          content,
          accountIds: [...selected],
          mediaIds: media.map((m) => m.id),
          thread: thread.filter((t) => t.trim().length > 0),
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        }),
      });
      router.push('/posts');
    } catch (err: any) {
      setError(err.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Nouveau post</h1>
      {error && <p className="text-red-600 text-sm">{error}</p>}

      {templates.length > 0 && (
        <div>
          <label className="block text-sm font-medium mb-1">Charger un template</label>
          <select
            onChange={(e) => { if (e.target.value) applyTemplate(e.target.value); }}
            defaultValue=""
            className="px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-transparent text-sm"
          >
            <option value="">— sélectionner —</option>
            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      )}

      <textarea
        required
        rows={6}
        placeholder="Contenu du post..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-transparent"
      />

      {aiEnabled && content.length > 5 && (
        <div className="flex flex-wrap gap-2 -mt-2">
          <button
            type="button"
            onClick={suggestHashtags}
            disabled={aiBusy}
            className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-700 hover:border-brand disabled:opacity-50"
          >
            ✨ Suggérer des hashtags
          </button>
          <button
            type="button"
            onClick={() => rewriteFor('LINKEDIN')}
            disabled={aiBusy}
            className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-700 hover:border-brand disabled:opacity-50"
          >
            ✨ Reformuler pour LinkedIn
          </button>
          <button
            type="button"
            onClick={() => rewriteFor('INSTAGRAM')}
            disabled={aiBusy}
            className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-700 hover:border-brand disabled:opacity-50"
          >
            ✨ Reformuler pour Instagram
          </button>
          <button
            type="button"
            onClick={() => rewriteFor('TWITTER')}
            disabled={aiBusy}
            className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-700 hover:border-brand disabled:opacity-50"
          >
            ✨ Reformuler pour X
          </button>
          <button
            type="button"
            onClick={() => rewriteFor('THREAD')}
            disabled={aiBusy}
            className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-700 hover:border-brand disabled:opacity-50"
          >
            ✨ Convertir en thread X
          </button>
          {aiBusy && <span className="text-xs text-slate-500 self-center">IA en cours...</span>}
        </div>
      )}

      <div className="space-y-2">
        <label className="block text-sm font-medium">Médias (images / vidéos)</label>
        <input
          type="file"
          accept="image/*,video/*"
          onChange={onUpload}
          disabled={uploading}
          className="text-sm"
        />
        {uploading && <p className="text-xs text-slate-500">Upload en cours...</p>}
        {media.length > 0 && (
          <ul className="grid grid-cols-3 gap-2">
            {media.map((m) => (
              <li key={m.id} className="relative">
                {m.mimeType.startsWith('image/') ? (
                  <img
                    src={`${process.env.NEXT_PUBLIC_API_URL || '/api'}/media/${m.id}/raw`}
                    alt={m.filename}
                    className="w-full h-24 object-cover rounded border border-slate-200 dark:border-slate-800"
                  />
                ) : (
                  <div className="w-full h-24 rounded border border-slate-200 dark:border-slate-800 flex items-center justify-center text-xs text-slate-500">
                    {m.filename}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeMedia(m.id)}
                  className="absolute top-1 right-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-slate-500">Instagram requiert au moins une image/vidéo. TikTok exige une vidéo.</p>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Cibler les comptes</legend>
        {accounts.length === 0 && (
          <p className="text-sm text-slate-500">Aucun compte connecté. Allez dans la page « Comptes sociaux ».</p>
        )}
        {accounts.map(a => (
          <label key={a.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.has(a.id)}
              onChange={() => toggle(a.id)}
            />
            <span className="font-medium">{a.provider}</span>
            <span className="text-slate-500">{a.displayName}</span>
          </label>
        ))}
      </fieldset>

      {hasTwitter && (
        <div className="space-y-2">
          <label className="block text-sm font-medium">Thread X (optionnel)</label>
          <p className="text-xs text-slate-500">
            Tweets supplémentaires postés en réponse au premier. Ignoré par les autres réseaux.
          </p>
          {thread.map((t, i) => (
            <div key={i} className="flex gap-2 items-start">
              <textarea
                rows={2}
                maxLength={280}
                value={t}
                onChange={(e) => {
                  const next = [...thread];
                  next[i] = e.target.value;
                  setThread(next);
                }}
                placeholder={`Tweet #${i + 2}`}
                className="flex-1 px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-transparent text-sm"
              />
              <button
                type="button"
                onClick={() => setThread(thread.filter((_, j) => j !== i))}
                className="text-red-600 text-sm"
              >×</button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setThread([...thread, ''])}
            className="text-sm text-brand hover:underline"
          >
            + Ajouter un tweet
          </button>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Programmer (optionnel)</label>
        <input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          className="px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-transparent"
        />
      </div>

      <button
        disabled={loading}
        className="px-6 py-2 rounded bg-brand text-white disabled:opacity-50"
      >
        {loading ? 'Enregistrement...' : scheduledAt ? 'Programmer' : 'Enregistrer en brouillon'}
      </button>
    </form>
  );
}
