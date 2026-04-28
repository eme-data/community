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

export default function NewPostPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [content, setContent] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [media, setMedia] = useState<Media[]>([]);
  const [uploading, setUploading] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api<Account[]>('/social/accounts').then(setAccounts);
  }, []);

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

      <textarea
        required
        rows={6}
        placeholder="Contenu du post..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-transparent"
      />

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
