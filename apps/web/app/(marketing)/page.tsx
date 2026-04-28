import Link from 'next/link';

export default function LandingPage() {
  return (
    <>
      <section className="px-4 py-24 max-w-6xl mx-auto text-center">
        <span className="inline-block px-3 py-1 text-xs rounded-full bg-brand/10 text-brand mb-6">
          Multi-tenant · Auto-hébergé · Open
        </span>
        <h1 className="text-5xl md:text-6xl font-bold leading-tight tracking-tight">
          Publiez partout, <span className="text-brand">en un seul geste</span>.
        </h1>
        <p className="mt-6 text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
          Programmez et automatisez vos publications sur LinkedIn, Facebook, Instagram et TikTok depuis une seule interface — pour vous ou pour vos clients.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/register" className="px-6 py-3 rounded-lg bg-brand text-white font-medium hover:bg-brand-dark">
            Démarrer gratuitement
          </Link>
          <Link href="/features" className="px-6 py-3 rounded-lg border border-slate-300 dark:border-slate-700 hover:border-brand">
            Voir les fonctionnalités
          </Link>
        </div>
        <p className="mt-4 text-sm text-slate-500">Sans carte bancaire · Inscription en 30 secondes</p>
      </section>

      <section className="px-4 py-20 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">Tout ce qu'il faut pour gérer plusieurs marques</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <Feature
            title="Multi-tenant natif"
            text="Créez un espace par client ou par marque, avec ses propres comptes connectés et son calendrier."
          />
          <Feature
            title="4 réseaux + extensible"
            text="LinkedIn, Facebook, Instagram, TikTok. Architecture providers : ajoutez X, YouTube, Bluesky…"
          />
          <Feature
            title="Programmation fiable"
            text="File d'attente Redis/BullMQ, retry exponentiel, statut par cible : un échec d'un réseau ne bloque pas les autres."
          />
          <Feature
            title="Sécurité bout-en-bout"
            text="Tokens OAuth chiffrés en base (AES-256-GCM), JWT, bcrypt. Vous restez propriétaire de la donnée."
          />
          <Feature
            title="Auto-hébergé"
            text="Une commande sur Ubuntu 24.04, Docker Compose, HTTPS automatique via Caddy. Pas de SaaS imposé."
          />
          <Feature
            title="Onboarding autonome"
            text="Vos clients s'inscrivent seuls, vérifient leur email, connectent leurs comptes — sans intervention."
          />
        </div>
      </section>

      <section className="px-4 py-20 bg-slate-100 dark:bg-slate-900">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Prêt à essayer ?</h2>
          <p className="text-slate-600 dark:text-slate-300 mb-8">Créez votre espace, connectez vos comptes, programmez votre premier post — en moins de 5 minutes.</p>
          <Link href="/register" className="inline-block px-8 py-3 rounded-lg bg-brand text-white font-medium hover:bg-brand-dark">
            Créer mon espace
          </Link>
        </div>
      </section>
    </>
  );
}

function Feature({ title, text }: { title: string; text: string }) {
  return (
    <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400">{text}</p>
    </div>
  );
}
