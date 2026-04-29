'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';

type Provider = 'LINKEDIN' | 'FACEBOOK' | 'INSTAGRAM' | 'TIKTOK' | 'TWITTER' | 'YOUTUBE';

interface TenantProviderConfig {
  provider: Provider;
  values: Record<string, string>;
  encryptedKeys: string[];
  isActive: boolean;
  updatedAt: string;
}

interface FieldDef {
  name: string;
  label: string;
  helper?: string;
  secret?: boolean;
  defaultValue?: (appUrl: string) => string;
}

interface ProviderDef {
  key: Provider;
  label: string;
  blurb: string;
  portalUrl: string;
  fields: FieldDef[];
  scopes?: string;
  setupSummary: string;
}

const PROVIDERS: ProviderDef[] = [
  {
    key: 'LINKEDIN',
    label: 'LinkedIn',
    blurb: "Pour publier sur les profils et pages LinkedIn de votre organisation.",
    portalUrl: 'https://www.linkedin.com/developers/apps',
    fields: [
      { name: 'LINKEDIN_CLIENT_ID', label: 'Client ID' },
      { name: 'LINKEDIN_CLIENT_SECRET', label: 'Client Secret', secret: true },
      {
        name: 'LINKEDIN_REDIRECT_URI',
        label: 'Redirect URI',
        defaultValue: (appUrl) => `${appUrl}/api/social/linkedin/callback`,
      },
    ],
    scopes: 'openid · profile · email · w_member_social',
    setupSummary:
      "Créez une app sur le portail dev LinkedIn, ajoutez la Redirect URI ci-dessous, et collez Client ID + Client Secret.",
  },
  {
    key: 'FACEBOOK',
    label: 'Facebook & Instagram (Meta)',
    blurb:
      'Une seule app Meta couvre Facebook (pages) et Instagram Business. Cette config remplace les deux providers à la fois.',
    portalUrl: 'https://developers.facebook.com/apps',
    fields: [
      { name: 'META_APP_ID', label: 'App ID' },
      { name: 'META_APP_SECRET', label: 'App Secret', secret: true },
      {
        name: 'META_REDIRECT_URI',
        label: 'Redirect URI',
        defaultValue: (appUrl) => `${appUrl}/api/social/facebook/callback`,
      },
    ],
    scopes:
      'pages_show_list · pages_manage_posts · pages_read_engagement · instagram_basic · instagram_content_publish',
    setupSummary:
      "Créez une app Meta Business, activez Facebook Login + Instagram, ajoutez la Redirect URI, et collez App ID + App Secret.",
  },
  {
    key: 'TIKTOK',
    label: 'TikTok',
    blurb: 'Pour publier des vidéos via la Content Posting API.',
    portalUrl: 'https://developers.tiktok.com/apps',
    fields: [
      { name: 'TIKTOK_CLIENT_KEY', label: 'Client Key' },
      { name: 'TIKTOK_CLIENT_SECRET', label: 'Client Secret', secret: true },
      {
        name: 'TIKTOK_REDIRECT_URI',
        label: 'Redirect URI',
        defaultValue: (appUrl) => `${appUrl}/api/social/tiktok/callback`,
      },
    ],
    scopes: 'user.info.basic · video.upload · video.publish',
    setupSummary:
      "Inscrivez-vous comme dev TikTok, créez une app, activez Login Kit + Content Posting API, ajoutez la Redirect URI, et collez Client Key + Secret.",
  },
  {
    key: 'TWITTER',
    label: 'X (Twitter)',
    blurb:
      "Pour publier des tweets et threads. Note : la publication via API requiert l'abonnement Basic chez X (10$/mois).",
    portalUrl: 'https://developer.twitter.com/en/portal/dashboard',
    fields: [
      { name: 'TWITTER_CLIENT_ID', label: 'Client ID' },
      { name: 'TWITTER_CLIENT_SECRET', label: 'Client Secret', secret: true },
      {
        name: 'TWITTER_REDIRECT_URI',
        label: 'Redirect URI / Callback URL',
        defaultValue: (appUrl) => `${appUrl}/api/social/twitter/callback`,
      },
    ],
    scopes: 'tweet.read · tweet.write · users.read · offline.access',
    setupSummary:
      "Créez un projet + une app sur le X dev portal, activez OAuth 2.0 confidential client read+write, ajoutez la Redirect URI.",
  },
  {
    key: 'YOUTUBE',
    label: 'YouTube',
    blurb:
      "Pour publier des vidéos / Shorts via la YouTube Data API. Une vidéo verticale ≤ 60s avec #Shorts est reconnue comme Short.",
    portalUrl: 'https://console.cloud.google.com/apis/credentials',
    fields: [
      { name: 'YOUTUBE_CLIENT_ID', label: 'Client ID' },
      { name: 'YOUTUBE_CLIENT_SECRET', label: 'Client Secret', secret: true },
      {
        name: 'YOUTUBE_REDIRECT_URI',
        label: 'Redirect URI',
        defaultValue: (appUrl) => `${appUrl}/api/social/youtube/callback`,
      },
    ],
    scopes: 'youtube.upload · youtube.readonly',
    setupSummary:
      "Activez la YouTube Data API v3 dans Google Cloud, configurez l'OAuth consent screen, créez un OAuth Client Web, ajoutez la Redirect URI.",
  },
];

interface ProviderStatus {
  provider: string;
  configured: boolean;
  missing: string[];
  usingTenantOverride: boolean;
}

export default function TenantOAuthProvidersPage() {
  const [configs, setConfigs] = useState<Record<string, TenantProviderConfig>>({});
  const [status, setStatus] = useState<Record<string, ProviderStatus>>({});
  const [loading, setLoading] = useState(true);

  const appUrl = useMemo(() => {
    if (typeof window !== 'undefined') return window.location.origin;
    return 'https://community.meoxa.app';
  }, []);

  function refresh() {
    setLoading(true);
    Promise.all([
      api<TenantProviderConfig[]>('/tenant-providers').catch(() => [] as TenantProviderConfig[]),
      api<ProviderStatus[]>('/social/providers/status').catch(() => [] as ProviderStatus[]),
    ])
      .then(([cfgs, st]) => {
        const cmap: Record<string, TenantProviderConfig> = {};
        for (const c of cfgs) cmap[c.provider] = c;
        setConfigs(cmap);
        const smap: Record<string, ProviderStatus> = {};
        for (const s of st) smap[s.provider] = s;
        setStatus(smap);
      })
      .finally(() => setLoading(false));
  }
  useEffect(() => { refresh(); }, []);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Mes apps OAuth</h1>
        <p className="text-sm text-slate-500 mt-1 max-w-3xl">
          Par défaut, Community utilise les apps OAuth configurées par l&apos;équipe plateforme.
          Vous pouvez à tout moment <strong>fournir vos propres credentials OAuth</strong> ici —
          ils prendront la priorité pour votre espace uniquement. Pratique si vous voulez utiliser
          votre propre app LinkedIn (limites de débit dédiées, branding « Connecté à
          [VotreOrg] » sur l&apos;écran d&apos;auth, etc.) ou si la plateforme n&apos;a pas encore
          configuré ce réseau.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-slate-500">Chargement...</p>
      ) : (
        <div className="space-y-5">
          {PROVIDERS.map((p) => (
            <ProviderCard
              key={p.key}
              def={p}
              config={configs[p.key]}
              status={status[p.key.toLowerCase()]}
              appUrl={appUrl}
              onChanged={refresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProviderCard({
  def,
  config,
  status,
  appUrl,
  onChanged,
}: {
  def: ProviderDef;
  config?: TenantProviderConfig;
  status?: ProviderStatus;
  appUrl: string;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const f of def.fields) {
      initial[f.name] = config?.values?.[f.name] ?? f.defaultValue?.(appUrl) ?? '';
    }
    return initial;
  });

  const usingOverride = status?.usingTenantOverride ?? false;
  const platformConfigured = (status?.configured && !usingOverride) ?? false;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const encryptedKeys = def.fields.filter((f) => f.secret).map((f) => f.name);
      await api('/tenant-providers', {
        method: 'POST',
        body: JSON.stringify({ provider: def.key, values, encryptedKeys }),
      });
      setSaved(true);
      onChanged();
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    if (!confirm(`Repasser sur les credentials plateforme pour ${def.label} ?`)) return;
    try {
      await api(`/tenant-providers/${def.key}`, { method: 'DELETE' });
      onChanged();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur');
    }
  }

  return (
    <article className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <header className="px-5 py-4 flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-semibold">{def.label}</h2>
            {usingOverride ? (
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 font-medium">
                ✓ Mes credentials
              </span>
            ) : platformConfigured ? (
              <span className="text-xs px-2 py-0.5 rounded bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-medium">
                Plateforme
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 font-medium">
                ⚠ Aucune config
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">{def.blurb}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          {usingOverride && (
            <button
              type="button"
              onClick={reset}
              className="text-sm text-red-600 dark:text-red-400 hover:underline"
            >
              Réinitialiser
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="text-sm text-brand hover:underline"
          >
            {open ? 'Fermer' : usingOverride ? 'Modifier' : 'Utiliser mon app →'}
          </button>
        </div>
      </header>

      {open && (
        <form onSubmit={save} className="px-5 py-5 space-y-4">
          <div className="rounded-lg bg-slate-50 dark:bg-slate-950/40 px-4 py-3 text-sm">
            <p className="font-medium mb-1">Comment obtenir ces valeurs</p>
            <p className="text-slate-600 dark:text-slate-400">{def.setupSummary}</p>
            <p className="mt-2">
              <a
                href={def.portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand hover:underline"
              >
                Ouvrir le portail développeur de {def.label} →
              </a>
            </p>
          </div>

          {def.scopes && (
            <p className="text-xs text-slate-500">
              <span className="font-medium">Permissions à demander : </span>
              <code className="font-mono">{def.scopes}</code>
            </p>
          )}

          {def.fields.map((f) => {
            const placeholder =
              f.secret && config?.values?.[f.name] === '***'
                ? '*** (déjà configuré, laissez vide pour ne pas changer)'
                : f.defaultValue?.(appUrl) ?? '';
            return (
              <div key={f.name}>
                <label className="block text-sm font-medium mb-1">{f.label}</label>
                <input
                  type={f.secret ? 'password' : 'text'}
                  value={values[f.name] ?? ''}
                  onChange={(e) => setValues((prev) => ({ ...prev, [f.name]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono"
                  autoComplete="off"
                />
                <p className="text-xs text-slate-500 mt-1">
                  <code className="font-mono">{f.name}</code>
                  {f.helper ? ` — ${f.helper}` : ''}
                </p>
              </div>
            );
          })}

          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-dark disabled:opacity-50"
            >
              {saving ? 'Sauvegarde...' : usingOverride ? 'Mettre à jour' : 'Activer mon app'}
            </button>
            {saved && <span className="text-sm text-emerald-600">Configuration enregistrée ✓</span>}
          </div>
        </form>
      )}
    </article>
  );
}
