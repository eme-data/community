'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';

type Provider = 'LINKEDIN' | 'FACEBOOK' | 'INSTAGRAM' | 'TIKTOK' | 'TWITTER';

interface ProviderConfig {
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
  description: string;
  portalUrl: string;
  fields: FieldDef[];
  steps: string[];
  scopes?: string;
}

const PROVIDERS: ProviderDef[] = [
  {
    key: 'LINKEDIN',
    label: 'LinkedIn',
    description: 'Pour publier sur les profils et pages LinkedIn de vos clients.',
    portalUrl: 'https://www.linkedin.com/developers/apps',
    fields: [
      { name: 'LINKEDIN_CLIENT_ID', label: 'Client ID' },
      { name: 'LINKEDIN_CLIENT_SECRET', label: 'Client Secret', secret: true },
      {
        name: 'LINKEDIN_REDIRECT_URI',
        label: 'Redirect URI',
        helper: 'Doit correspondre EXACTEMENT à l\'URL configurée dans la console LinkedIn.',
        defaultValue: (appUrl) => `${appUrl}/api/social/linkedin/callback`,
      },
    ],
    scopes: 'openid · profile · email · w_member_social',
    steps: [
      'Allez sur https://www.linkedin.com/developers/apps et cliquez "Create app".',
      'Renseignez le nom de votre app (ex: "Community"), l'éditeur (LinkedIn Page de votre entreprise), un logo, acceptez les conditions.',
      'Onglet Auth → ajoutez l\'URL de redirection ci-dessous (Redirect URI). Sans cette URL exacte, le login échouera.',
      'Onglet Products → demandez l\'accès à "Sign In with LinkedIn using OpenID Connect" (instantané) et "Share on LinkedIn" (instantané).',
      'Si vous voulez publier sur des pages d\'entreprise, demandez aussi "Community Management API" (validation manuelle 1-2 jours).',
      'Onglet Auth → copiez le Client ID et le Client Secret et collez-les ci-dessous. Sauvegardez.',
    ],
  },
  {
    key: 'FACEBOOK',
    label: 'Facebook & Instagram (Meta)',
    description: 'Une seule app Meta couvre Facebook (pages) et Instagram Business. Configurez ces variables une seule fois.',
    portalUrl: 'https://developers.facebook.com/apps',
    fields: [
      { name: 'META_APP_ID', label: 'App ID' },
      { name: 'META_APP_SECRET', label: 'App Secret', secret: true },
      {
        name: 'META_REDIRECT_URI',
        label: 'Redirect URI',
        defaultValue: (appUrl) => `${appUrl}/api/social/facebook/callback`,
      },
      {
        name: 'META_GRAPH_VERSION',
        label: 'Graph API version',
        helper: 'Optionnel. Par défaut v21.0.',
      },
    ],
    scopes: 'pages_show_list · pages_manage_posts · pages_read_engagement · instagram_basic · instagram_content_publish',
    steps: [
      'Allez sur https://developers.facebook.com/apps et cliquez "Create App".',
      'Choisissez le type "Business" → renseignez le nom et l\'email de contact.',
      'Dans le tableau de bord de l\'app, ajoutez les produits "Facebook Login for Business" et "Instagram".',
      'Facebook Login → Settings → ajoutez l\'URL de redirection ci-dessous (Valid OAuth Redirect URIs).',
      'Settings → Basic → copiez l\'App ID et l\'App Secret et collez-les ici.',
      'Pour publier en production : passez l\'app en mode "Live" et faites valider les permissions par Meta (App Review). En dev/test, ajoutez vos comptes test dans Roles → Test Users.',
      'Instagram : chaque compte connecté devra être un compte Instagram Business lié à une page Facebook.',
    ],
  },
  {
    key: 'INSTAGRAM',
    label: 'Instagram (auto-configuré via Meta)',
    description: 'Instagram utilise les mêmes credentials que Facebook ci-dessus. Pas de configuration séparée.',
    portalUrl: 'https://developers.facebook.com/apps',
    fields: [],
    steps: [
      'Aucune configuration séparée. Configurez les credentials Meta dans la section "Facebook & Instagram (Meta)" ci-dessus.',
      'Côté tenant : lors de la connexion d\'un compte Instagram, l\'utilisateur doit avoir un compte Instagram Business lié à une page Facebook qu\'il administre.',
    ],
  },
  {
    key: 'TIKTOK',
    label: 'TikTok',
    description: 'Pour publier des vidéos via la Content Posting API de TikTok.',
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
    steps: [
      'Inscrivez-vous comme développeur sur https://developers.tiktok.com/ (validation rapide).',
      'Cliquez "Create an app" → renseignez le nom, la description, l\'URL du site web (https://community.meoxa.app) et un logo.',
      'Onglet "Login Kit" → ajoutez l\'URL de redirection ci-dessous (Redirect URI).',
      'Onglet "Content Posting API" → activez et lisez les guidelines.',
      'Onglet "Manage" → copiez Client Key et Client Secret. Collez-les ci-dessous.',
      'TikTok exige une revue manuelle pour passer en production. En sandbox, ajoutez les comptes de vos testeurs dans la section "Testers".',
    ],
  },
  {
    key: 'TWITTER',
    label: 'X (Twitter)',
    description: 'Pour publier des tweets et threads. Note : la publication de tweets via API requiert le tier payant Basic ($100/mois) chez X.',
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
    steps: [
      'Allez sur https://developer.twitter.com/en/portal/dashboard et créez un projet + une app dans le projet.',
      'Dans User authentication settings → activez OAuth 2.0 → type "Confidential client" → permissions "Read and write".',
      'Ajoutez l\'URL de redirection ci-dessous (Callback URI / Redirect URL) et l\'URL de votre site (Website URL).',
      'Onglet "Keys and tokens" → générez les "OAuth 2.0 Client ID and Client Secret".',
      'Collez-les ci-dessous. Sauvegardez.',
      'Pour passer en production (réellement poster) : abonnez le projet au tier Basic ($100/mois) ou Pro chez X. Le tier Free permet l\'auth mais pas la publication.',
    ],
  },
];

interface ProviderStatus {
  provider: string;
  configured: boolean;
  missing: string[];
}

export default function ProvidersPage() {
  const [me, setMe] = useState<{ isSuperAdmin?: boolean } | null>(null);
  const [configs, setConfigs] = useState<Record<string, ProviderConfig>>({});
  const [status, setStatus] = useState<Record<string, ProviderStatus>>({});
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);

  const appUrl = useMemo(() => {
    if (typeof window !== 'undefined') return window.location.origin;
    return 'https://community.meoxa.app';
  }, []);

  useEffect(() => {
    api<{ isSuperAdmin?: boolean }>('/users/me')
      .then(setMe)
      .catch(() => setMe({}));
  }, []);

  useEffect(() => {
    if (me?.isSuperAdmin === false) {
      setForbidden(true);
      setLoading(false);
      return;
    }
    if (!me?.isSuperAdmin) return;
    Promise.all([
      api<ProviderConfig[]>('/admin/providers').catch((e) => {
        if (e instanceof ApiError && e.status === 403) setForbidden(true);
        return [] as ProviderConfig[];
      }),
      api<ProviderStatus[]>('/social/providers/status').catch(() => [] as ProviderStatus[]),
    ])
      .then(([cfgs, st]) => {
        const cmap: Record<string, ProviderConfig> = {};
        for (const c of cfgs) cmap[c.provider] = c;
        setConfigs(cmap);
        const smap: Record<string, ProviderStatus> = {};
        for (const s of st) smap[s.provider] = s;
        setStatus(smap);
      })
      .finally(() => setLoading(false));
  }, [me]);

  if (forbidden) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <h1 className="text-2xl font-bold mb-3">Accès réservé</h1>
        <p className="text-slate-600 dark:text-slate-300 mb-6">
          La configuration des providers OAuth est réservée aux super-admins de la plateforme.
        </p>
        <Link href="/dashboard" className="text-brand hover:underline">
          Retour au tableau de bord
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Providers OAuth</h1>
        <p className="text-sm text-slate-500 mt-1 max-w-2xl">
          Configurez ici les credentials des apps OAuth que vous avez créées chez chaque réseau
          social (LinkedIn, Meta, TikTok, X). Tous vos clients utiliseront ces apps pour connecter
          leurs comptes — c'est <strong>vous, l'éditeur SaaS</strong>, qui créez ces apps une seule fois,
          pas vos clients.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-slate-500">Chargement...</p>
      ) : (
        <div className="space-y-6">
          {PROVIDERS.map((p) => (
            <ProviderCard
              key={p.key}
              def={p}
              config={configs[p.key]}
              status={status[p.key.toLowerCase()]}
              appUrl={appUrl}
              onSaved={(c) => setConfigs((prev) => ({ ...prev, [p.key]: c }))}
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
  onSaved,
}: {
  def: ProviderDef;
  config?: ProviderConfig;
  status?: ProviderStatus;
  appUrl: string;
  onSaved: (c: ProviderConfig) => void;
}) {
  const [open, setOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const f of def.fields) {
      initial[f.name] = config?.values?.[f.name] ?? f.defaultValue?.(appUrl) ?? '';
    }
    return initial;
  });

  const isConfigured = status?.configured;
  const missing = status?.missing ?? [];

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const encryptedKeys = def.fields.filter((f) => f.secret).map((f) => f.name);
      const out = await api<ProviderConfig>('/admin/providers', {
        method: 'POST',
        body: JSON.stringify({
          provider: def.key,
          values,
          encryptedKeys,
        }),
      });
      onSaved(out);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <header className="px-5 py-4 flex items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-lg">{def.label}</h2>
            {isConfigured ? (
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 font-medium">
                ✓ Configuré
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 font-medium">
                ⚠ À configurer
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">{def.description}</p>
        </div>
        {def.fields.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="text-sm text-brand hover:underline shrink-0"
          >
            {open ? 'Fermer' : isConfigured ? 'Modifier' : 'Configurer →'}
          </button>
        )}
      </header>

      {open && def.fields.length > 0 && (
        <form onSubmit={save} className="px-5 py-5 space-y-4 border-b border-slate-100 dark:border-slate-800">
          {def.scopes && (
            <p className="text-xs text-slate-500">
              <span className="font-medium">Permissions à demander : </span>
              <code className="font-mono">{def.scopes}</code>
            </p>
          )}
          {def.fields.map((f) => (
            <div key={f.name}>
              <label className="block text-sm font-medium mb-1">{f.label}</label>
              <input
                type={f.secret ? 'password' : 'text'}
                value={values[f.name] ?? ''}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [f.name]: e.target.value }))
                }
                placeholder={f.secret && config?.values?.[f.name] === '***' ? '*** (déjà configuré, laissez vide pour ne pas changer)' : f.defaultValue?.(appUrl) ?? ''}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono"
                autoComplete="off"
              />
              <p className="text-xs text-slate-500 mt-1">
                <code className="font-mono">{f.name}</code>
                {f.helper && ` — ${f.helper}`}
              </p>
            </div>
          ))}
          {missing.length > 0 && (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Variables encore manquantes : {missing.join(', ')}.
            </p>
          )}
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-dark disabled:opacity-50"
            >
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
            {saved && <span className="text-sm text-emerald-600">Configuration enregistrée ✓</span>}
          </div>
        </form>
      )}

      <div className="px-5 py-3 bg-slate-50 dark:bg-slate-950/30">
        <button
          type="button"
          onClick={() => setGuideOpen((o) => !o)}
          className="text-sm text-slate-700 dark:text-slate-300 hover:text-brand flex items-center gap-2"
        >
          <span>{guideOpen ? '▾' : '▸'}</span>
          Comment créer cette app chez {def.label} ?
        </button>
        {guideOpen && (
          <div className="mt-3 space-y-3 text-sm">
            <p>
              <a
                href={def.portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand hover:underline"
              >
                Ouvrir le portail développeur de {def.label} →
              </a>
            </p>
            <ol className="list-decimal pl-5 space-y-1.5 text-slate-700 dark:text-slate-300">
              {def.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
            {def.fields.find((f) => f.name.includes('REDIRECT')) && (
              <p className="text-xs text-slate-500 pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="font-medium">URL de redirection à utiliser : </span>
                <code className="font-mono break-all">
                  {def.fields.find((f) => f.name.includes('REDIRECT'))?.defaultValue?.(appUrl)}
                </code>
              </p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}