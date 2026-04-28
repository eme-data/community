import Link from 'next/link';

const blocks = [
  {
    title: 'Composez une fois, publiez partout',
    text: "Rédigez votre message dans une interface unique et choisissez les comptes destinataires — chaque réseau reçoit le format adapté.",
  },
  {
    title: 'Programmation à la minute près',
    text: "Planifiez à l'avance ou publiez immédiatement. Notre worker BullMQ traite la file en arrière-plan avec retries automatiques.",
  },
  {
    title: 'Statut détaillé par cible',
    text: "Pour chaque post, voyez ce qui est passé sur LinkedIn, Facebook, Instagram, TikTok — avec le lien direct vers le post publié.",
  },
  {
    title: 'OAuth officiel sur chaque réseau',
    text: "Connexion directe avec les API officielles : LinkedIn Marketing, Meta Graph (Facebook + Instagram Business), TikTok Content Posting.",
  },
  {
    title: 'Multi-organisations',
    text: "Gérez plusieurs marques ou clients dans une seule installation. Chaque tenant a ses utilisateurs, ses comptes, ses droits.",
  },
  {
    title: 'Self-hosted, vos données',
    text: "Déployez sur votre propre serveur Ubuntu 24.04. Vos tokens OAuth et contenus restent chez vous, chiffrés.",
  },
];

export default function FeaturesPage() {
  return (
    <main className="px-4 py-16 max-w-5xl mx-auto">
      <h1 className="text-4xl font-bold mb-4">Fonctionnalités</h1>
      <p className="text-slate-600 dark:text-slate-300 mb-12 max-w-2xl">
        Une plateforme conçue pour les agences, freelances et équipes qui gèrent plusieurs marques sur les réseaux sociaux.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {blocks.map((b) => (
          <article key={b.title} className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <h2 className="font-semibold text-lg mb-2">{b.title}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">{b.text}</p>
          </article>
        ))}
      </div>

      <div className="text-center mt-16">
        <Link href="/register" className="px-6 py-3 rounded-lg bg-brand text-white font-medium hover:bg-brand-dark">
          Démarrer gratuitement
        </Link>
      </div>
    </main>
  );
}
