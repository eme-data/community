import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Intégrations & réseaux supportés',
  description:
    'Publiez sur LinkedIn, Facebook, Instagram, TikTok, X (Twitter) et Bluesky depuis une seule console. Connexion en un clic, format adapté automatiquement à chaque réseau.',
};

interface Network {
  slug: string;
  name: string;
  baseline: string;
  formats: string[];
  metrics: string[];
  highlight: string;
}

const networks: Network[] = [
  {
    slug: 'linkedin',
    name: 'LinkedIn',
    baseline: 'Le réseau professionnel par excellence — pour les marques B2B, les agences et les dirigeants.',
    formats: ['Posts texte', 'Posts avec images', 'Articles longs', 'Carrousels documents'],
    metrics: ['Likes', 'Commentaires', 'Réactions détaillées'],
    highlight:
      "Idéal pour la prise de parole d'entreprise et le personal branding. Programmez vos posts à l'heure optimale et suivez l'engagement par publication.",
  },
  {
    slug: 'facebook',
    name: 'Facebook',
    baseline: 'Pour vos pages d\'entreprise, vos communautés et votre communication grand public.',
    formats: ['Posts texte', 'Posts avec images', 'Liens enrichis', 'Vidéos'],
    metrics: ['Impressions', 'Portée', 'Clics', 'Réactions'],
    highlight:
      "Parfait pour animer vos pages clients. Statistiques détaillées par publication, planification multi-pages depuis un même calendrier.",
  },
  {
    slug: 'instagram',
    name: 'Instagram',
    baseline: 'Photos, carrousels et Reels — pour les marques qui investissent le visuel.',
    formats: ['Photos feed', 'Carrousels (jusqu\'à 10 médias)', 'Reels vidéo', 'Légendes longues'],
    metrics: ['Impressions', 'Portée', 'Likes', 'Commentaires', 'Partages'],
    highlight:
      "Publication directe depuis Community, pas de notification mobile à valider à la main. Hashtags suggérés par l'IA en fonction du contenu de l'image.",
  },
  {
    slug: 'tiktok',
    name: 'TikTok',
    baseline: 'La plateforme vidéo la plus dynamique pour toucher les nouvelles générations.',
    formats: ['Vidéos verticales', 'Description et hashtags', 'Programmation à l\'avance'],
    metrics: ['Statut de publication', 'Suivi automatique du traitement'],
    highlight:
      "Téléchargez votre vidéo, programmez la diffusion, Community s'occupe du reste. Suivi automatique jusqu'à la mise en ligne effective.",
  },
  {
    slug: 'x',
    name: 'X (Twitter)',
    baseline: 'Pour le temps réel, les threads et la prise de parole rapide.',
    formats: ['Tweets', 'Threads (suite de tweets)', 'Tweets avec médias'],
    metrics: ['Suivi des publications'],
    highlight:
      "Composez vos threads complets en une fois et programmez-les. Idéal pour les annonces, les retours d'événement et les prises de parole de dirigeants.",
  },
  {
    slug: 'bluesky',
    name: 'Bluesky',
    baseline: 'Le nouveau réseau ouvert qui monte — soyez présent dès maintenant pour prendre l\'avance.',
    formats: ['Posts texte', 'Posts avec images'],
    metrics: ['Suivi des publications'],
    highlight:
      "Connectez votre compte Bluesky et publiez en parallèle de vos autres réseaux. Une présence multi-plateformes sans effort supplémentaire.",
  },
];

const collabIntegrations = [
  {
    name: 'Slack',
    text: 'Recevez les demandes d\'approbation directement dans vos canaux Slack. Validez ou rejetez sans quitter votre messagerie.',
  },
  {
    name: 'Microsoft Teams',
    text: "Mêmes notifications, même fluidité, dans Teams. Adapté aux équipes Microsoft 365.",
  },
  {
    name: 'Outils BI & reporting',
    text: 'Exportez vos statistiques en CSV ou intégrez-les à Looker Studio, Power BI ou votre CRM pour vos reportings.',
  },
];

export default function IntegrationsPage() {
  return (
    <main className="px-4 py-16 max-w-5xl mx-auto">
      <header className="text-center max-w-3xl mx-auto mb-16">
        <span className="inline-block px-3 py-1 text-xs rounded-full bg-brand/10 text-brand mb-4">
          Intégrations
        </span>
        <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
          6 réseaux sociaux, branchés en un clic
        </h1>
        <p className="text-slate-600 dark:text-slate-300 text-lg">
          Connectez vos comptes via les connexions officielles de chaque plateforme. Le format est
          adapté automatiquement, vous publiez sans avoir à refaire le travail.
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-2 mb-20">
        {networks.map((n) => (
          <article
            key={n.slug}
            id={n.slug}
            className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
          >
            <div className="flex items-baseline justify-between mb-3 gap-3">
              <h2 className="text-2xl font-bold">{n.name}</h2>
              <span className="text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 font-medium">
                Disponible
              </span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">{n.baseline}</p>
            <p className="text-sm text-slate-700 dark:text-slate-300 mb-5">{n.highlight}</p>

            <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Formats supportés
                </p>
                <ul className="space-y-1">
                  {n.formats.map((f) => (
                    <li key={f} className="text-xs text-slate-600 dark:text-slate-400 flex gap-2">
                      <span className="text-brand">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Statistiques
                </p>
                <ul className="space-y-1">
                  {n.metrics.map((m) => (
                    <li key={m} className="text-xs text-slate-600 dark:text-slate-400 flex gap-2">
                      <span className="text-brand">✓</span>
                      <span>{m}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="mb-20">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            Branché à vos outils de collaboration
          </h2>
          <p className="text-slate-600 dark:text-slate-300">
            Community s'intègre là où votre équipe travaille déjà.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {collabIntegrations.map((c) => (
            <article
              key={c.name}
              className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            >
              <h3 className="font-semibold text-lg mb-2">{c.name}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">{c.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 mb-20">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold mb-3">Un réseau ou un outil manque à l'appel ?</h2>
          <p className="text-slate-600 dark:text-slate-300 mb-5">
            Nous ajoutons régulièrement de nouveaux réseaux et de nouvelles intégrations en fonction
            des demandes de nos clients. Dites-nous ce dont vous avez besoin — c'est probablement
            déjà sur notre feuille de route.
          </p>
          <a
            href="mailto:contact@meoxa.app?subject=Demande%20d%27int%C3%A9gration"
            className="inline-block px-6 py-3 rounded-lg bg-brand text-white font-medium hover:bg-brand-dark"
          >
            Suggérer une intégration
          </a>
        </div>
      </section>

      <div className="text-center pt-12 border-t border-slate-200 dark:border-slate-800">
        <h2 className="text-2xl font-bold mb-3">Connectez vos premiers réseaux en 2 minutes</h2>
        <p className="text-slate-600 dark:text-slate-300 mb-6">
          14 jours d'essai gratuit. Sans carte bancaire. Sans installation.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/register"
            className="px-6 py-3 rounded-lg bg-brand text-white font-medium hover:bg-brand-dark"
          >
            Démarrer mon essai
          </Link>
          <Link
            href="/pricing"
            className="px-6 py-3 rounded-lg border border-slate-300 dark:border-slate-700 hover:border-brand"
          >
            Voir les tarifs
          </Link>
        </div>
      </div>
    </main>
  );
}
