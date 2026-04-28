'use client';

import { useEffect, useState } from 'react';
import { api, apiUpload } from '@/lib/api';

interface Tenant {
  id: string;
  slug: string;
  name: string;
  brandName?: string | null;
  primaryColor?: string | null;
  logoMediaId?: string | null;
}

interface Media {
  id: string;
  filename: string;
}

export default function BrandingPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [brandName, setBrandName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#4f46e5');
  const [logoMediaId, setLogoMediaId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    api<Tenant>('/tenants/current').then((t) => {
      setTenant(t);
      setBrandName(t.brandName ?? '');
      setPrimaryColor(t.primaryColor ?? '#4f46e5');
      setLogoMediaId(t.logoMediaId ?? null);
    });
  }, []);

  async function onLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const m = await apiUpload<Media>('/media', f);
      setLogoMediaId(m.id);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api<Tenant>('/tenants/current', {
        method: 'PATCH',
        body: JSON.stringify({
          brandName: brandName.trim() || null,
          primaryColor: primaryColor || null,
          logoMediaId,
        }),
      });
      setTenant(updated);
      setSavedAt(Date.now());
      // The Theme injector picks the change up on the next dashboard load;
      // refresh now so the operator sees their branding immediately.
      if (typeof window !== 'undefined') window.location.reload();
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setBrandName('');
    setPrimaryColor('#4f46e5');
    setLogoMediaId(null);
  }

  if (!tenant) return <p>Chargement...</p>;

  const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api';
  const logoPreview = logoMediaId ? `${apiBase}/media/${logoMediaId}/raw` : null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Branding</h1>
        <p className="text-sm text-slate-500">
          Personnalisez l'apparence du dashboard pour cet espace.
          Les utilisateurs membres de ce tenant verront votre nom et votre logo
          dans la barre de navigation, et la couleur primaire des boutons.
        </p>
      </div>

      <form onSubmit={save} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nom affiché (brand name)</label>
          <input
            placeholder={tenant.name}
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-transparent"
          />
          <p className="text-xs text-slate-500 mt-1">
            Si vide, "Community" est utilisé.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Couleur primaire</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="h-10 w-16 rounded border border-slate-300 dark:border-slate-700"
            />
            <input
              type="text"
              pattern="#[0-9a-fA-F]{6}"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-transparent font-mono text-sm"
            />
            <span
              className="px-3 py-2 rounded text-white text-xs"
              style={{ backgroundColor: primaryColor }}
            >
              Aperçu bouton
            </span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Logo</label>
          {logoPreview && (
            <div className="mb-2 flex items-center gap-3">
              <img src={logoPreview} alt="" className="h-12 w-auto max-w-[200px] object-contain border border-slate-200 dark:border-slate-800 rounded p-1 bg-white" />
              <button type="button" onClick={() => setLogoMediaId(null)} className="text-sm text-red-600">
                Retirer
              </button>
            </div>
          )}
          <input
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            onChange={onLogoUpload}
            disabled={uploading}
            className="text-sm"
          />
          <p className="text-xs text-slate-500 mt-1">PNG/SVG transparent recommandé. Max 100 MB.</p>
        </div>

        <div className="flex items-center gap-3">
          <button disabled={saving || uploading} className="px-5 py-2 rounded bg-brand text-white disabled:opacity-50">
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
          <button type="button" onClick={reset} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-slate-100">
            Réinitialiser
          </button>
          {savedAt && Date.now() - savedAt < 4000 && (
            <span className="text-sm text-emerald-600">Enregistré ✓</span>
          )}
        </div>
      </form>
    </div>
  );
}
