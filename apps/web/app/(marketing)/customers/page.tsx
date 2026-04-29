import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Clients & cas d\'usage',
  description:
    'Comment les agences, équipes marketing et freelances utilisent Community pour piloter la présence sociale de leurs marques. Cas d\'usage, témoignages et résultats.',
};

interface CaseStudy {
  segment: string;
  company: string;
  challenge: string;
  solution: string;
  result: { metric: string; label: string }[];
  quote: string;
  author: string;
  role: string;
}

const cases: CaseStudy[] = [
  {
    segment: 'Agence sociale',
    company: 'Agence indépendante · Paris',
    challenge:
      "12 clients à animer sur 4 réseaux chacun, 4 outils différents, des heures perdues à passer d'un onglet à l'autre et à courir après les validations Slack ou email.",
    solution:
      "Une console unique pour les 12 marques, un calendrier partagé, et les validations directement intégrées dans Slack. L'équipe rédige, le client valide en un clic, et la publication part automatiquement.",
    result: [
      { metric: '−66%', label: 'temps passé sur la production sociale' },
      { metric: '4 → 1', label: 'outils dans la stack' },
      { metric: '+30%', label: 'volume de posts pour le même effort' },
    ],
    quote:
      "On a divisé par 3 le temps passé à publier pour nos 12 clients. Le calendrier partagé et les validations dans Slack ont remplacé 4 outils chez nous.",
    author: 'Julie M.',
    role: 'Directrice d\'agence sociale',
  },
  {
    segment: 'Marque B2B',
    company: 'Scale-up B2B · 150 collaborateurs',
    challenge:
      "Une équipe contenu centrale, 5 marques produits à animer en parallèle, et l'impossibilité de séparer proprement les accès. Risque permanent de publier sur le mauvais compte.",
    solution:
      "Un espace par marque, avec ses propres comptes, ses propres utilisateurs et son propre calendrier. Chaque collaborateur ne voit que ce qui le concerne, sans que l'équipe centrale perde la vue d'ensemble.",
    result: [
      { metric: '5', label: 'marques pilotées en parallèle' },
      { metric: '0', label: 'publication sur le mauvais compte' },
      { metric: '−40%', label: 'temps de coordination interne' },
    ],
    quote:
      "Chaque marque a son propre espace, totalement séparé. Mon équipe ne voit que ce qui lui est assigné — c'était bloquant avec nos précédents outils.",
    author: 'Karim B.',
    role: 'Responsable contenu, scale-up B2B',
  },
  {
    segment: 'Freelance',
    company: 'Consultante indépendante · 8 marques',
    challenge:
      "Maintenir un rythme de publication régulier sur 8 marques clientes en travaillant seule, sans sacrifier la qualité ni le ton spécifique de chacune.",
    solution:
      "Une voix de marque dédiée à chaque espace, des hashtags adaptés à chaque réseau, et la programmation à plusieurs semaines à l'avance. Le temps de production est concentré sur les vraies idées créatives.",
    result: [
      { metric: '8', label: 'marques gérées en solo' },
      { metric: '+50%', label: 'temps disponible pour la création' },
      { metric: '0', label: 'oubli de publication en 6 mois' },
    ],
    quote:
      "L'IA respecte notre ton mieux que nos juniors leur première semaine. Les hashtags adaptés par réseau évitent les copier-coller maladroits.",
    author: 'Léa D.',
    role: 'Freelance · 8 marques',
  },
];

const moreQuotes = [
  {
    quote: "L'onboarding a pris 4 minutes. On publiait sur LinkedIn et Instagram à la pause déjeuner.",
    author: 'Thomas R.',
    role: 'Directeur marketing, ETI industrielle',
  },
  {
    quote:
      'Le workflow d\'approbation a réglé un vrai problème politique chez nous : plus de posts publiés sans validation directrice.',
    author: 'Sophie L.',
    role: 'Brand manager, retail',
  },
  {
    quote:
      "Les statistiques unifiées remplacent un reporting Excel hebdomadaire qui me prenait 2 heures. C'est devenu instantané.",
    author: 'Marc V.',
    role: 'Consultant indépendant',
  },
  {
    quote: "Le support répond en français en moins de 24h. Sur ce type d'outil, c'est rare et précieux.",
    author: 'Aurélie P.',
    role: 'Responsable communication, association',
  },
];

const segments = [
  {
    title: 'Agences & community managers',
    text: 'Centralisez 5, 10 ou 50 clients. Facturez à la valeur, plus au temps perdu à jongler entre les outils.',
    cta: 'Voir le cas Agence',
    href: '#case-agency',
  },
  {
    title: 'Marques & équipes marketing',
    text: 'Une plateforme commune pour vos équipes pays, produit et région. Un calendrier, des validations, des résultats.',
    cta: 'Voir le cas Marque',
    href: '#case-brand',
  },
  {
    title: 'Freelances & créateurs',
    text: 'Gardez un rythme de publication régulier sans y penser. La programmation et l\'IA travaillent pendant que vous créez.',
    cta: 'Voir le cas Freelance',
    href: '#case-freelance',
  },
];

const caseAnchors = ['case-agency', 'case-brand', 'case-freelance'];

export default function CustomersPage() {
  return (
    <main className="px-4 py-16 max-w-5xl mx-auto">
      <header className="text-center max-w-3xl mx-auto mb-16">
        <span className="inline-block px-3 py-1 text-xs rounded-full bg-brand/10 text-brand mb-4">
          Clients & cas d'usage
        </span>
        <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
          Comment nos clients pilotent leur présence sociale
        </h1>
        <p className="text-slate-600 dark:text-slate-300 text-lg">
          Agences, équipes marketing, freelances — découvrez comment Community remplace 3 à 5 outils
          et libère plusieurs heures par semaine, sur des cas concrets.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3 mb-20">
        {segments.map((s) => (
          <a
            key={s.title}
            href={s.href}
            className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-brand transition"
          >
            <h2 className="font-semibold text-lg mb-2">{s.title}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{s.text}</p>
            <span className="text-sm text-brand font-medium">{s.cta} →</span>
          </a>
        ))}
      </section>

      <div className="space-y-16">
        {cases.map((c, i) => (
          <section
            key={c.author}
            id={caseAnchors[i]}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
          >
            <div className="p-8 md:p-10">
              <div className="flex flex-wrap items-center gap-3 mb-4 text-xs">
                <span className="px-2 py-1 rounded bg-brand/10 text-brand font-medium">
                  {c.segment}
                </span>
                <span className="text-slate-500">{c.company}</span>
              </div>
              <div className="grid gap-8 md:grid-cols-3 mb-8">
                <div>
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Le défi
                  </h3>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{c.challenge}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    La réponse Community
                  </h3>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{c.solution}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Les résultats
                  </h3>
                  <ul className="space-y-2">
                    {c.result.map((r) => (
                      <li key={r.label}>
                        <p className="text-2xl font-bold text-brand leading-none">{r.metric}</p>
                        <p className="text-xs text-slate-500 mt-1">{r.label}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <figure className="border-t border-slate-200 dark:border-slate-800 pt-6">
                <blockquote className="text-base text-slate-700 dark:text-slate-300 italic">
                  “{c.quote}”
                </blockquote>
                <figcaption className="mt-3 text-sm">
                  <span className="font-semibold">{c.author}</span>
                  <span className="text-slate-500"> — {c.role}</span>
                </figcaption>
              </figure>
            </div>
          </section>
        ))}
      </div>

      <section className="mt-20">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
          Et bien d'autres équipes nous font confiance
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {moreQuotes.map((q) => (
            <figure
              key={q.author}
              className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            >
              <blockquote className="text-sm text-slate-700 dark:text-slate-300">“{q.quote}”</blockquote>
              <figcaption className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-sm">
                <span className="font-semibold">{q.author}</span>
                <span className="text-slate-500"> — {q.role}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <p className="mt-8 text-center text-xs text-slate-500 max-w-2xl mx-auto">
        Témoignages anonymisés à la demande de nos clients pour des raisons de confidentialité
        contractuelle. Versions complètes (avec logos et métriques détaillées) disponibles sur
        demande pour vos comités d'achat.
      </p>

      <div className="text-center mt-20 pt-12 border-t border-slate-200 dark:border-slate-800">
        <h2 className="text-2xl font-bold mb-3">Devenez le prochain cas client</h2>
        <p className="text-slate-600 dark:text-slate-300 mb-6">
          14 jours gratuits, sans carte bancaire. Vous gardez vos données.
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
