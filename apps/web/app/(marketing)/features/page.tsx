import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Fonctionnalités',
  description:
    "Tout ce qu'il faut pour publier, programmer et analyser sur 6 réseaux depuis une seule console : espaces multi-marques, IA qui parle votre marque, validations en équipe et statistiques unifiées.",
};

interface Block {
  title: string;
  text: string;
  bullets?: string[];
}

interface Section {
  title: string;
  lead: string;
  blocks: Block[];
}

const sections: Section[] = [
  {
    title: 'Publier sans friction',
    lead: 'Une console unifiée qui adapte automatiquement votre contenu à chaque réseau.',
    blocks: [
      {
        title: 'Composer une fois, publier partout',
        text: "Rédigez votre message dans une interface unique. Chaque réseau reçoit la version adaptée — longueur, format d'image, hashtags spécifiques. Vous gagnez un temps fou.",
        bullets: ['LinkedIn', 'Facebook', 'Instagram (feed, Reels, carrousels)', 'TikTok', 'X', 'Bluesky'],
      },
      {
        title: 'Programmation à la minute',
        text: "Planifiez vos posts à la minute près ou publiez immédiatement. Vos publications partent à l'heure prévue, même quand un réseau est lent — un échec sur un canal ne bloque jamais les autres.",
      },
      {
        title: 'Calendrier partagé multi-marques',
        text: "Vue calendrier par espace, par compte ou globale. Glissez-déposez pour replanifier, dupliquez un post pour une autre marque, filtrez par réseau ou par statut.",
      },
      {
        title: 'Modèles & bibliothèque',
        text: "Créez des modèles de posts réutilisables, par marque ou partagés entre vos espaces. Vos meilleurs formats restent accessibles à toute l'équipe.",
      },
    ],
  },
  {
    title: 'Travailler en équipe',
    lead: "Collaborez en interne ou avec vos clients sans envoyer un seul email d'approbation.",
    blocks: [
      {
        title: 'Espaces multi-marques cloisonnés',
        text: "Chaque marque ou client a son propre espace : ses comptes, ses utilisateurs, son calendrier, ses statistiques. Aucune fuite entre les marques — c'est garanti par défaut.",
      },
      {
        title: 'Rôles adaptés à chaque profil',
        text: "Propriétaire, administrateur, éditeur, lecteur. Vos juniors proposent, vos seniors approuvent, vos clients consultent — chacun voit exactement ce qu'il doit voir.",
      },
      {
        title: 'Validation en un clic',
        text: "Posts en attente, file de relecture, approbation en un clic. Notifications dans Slack ou Teams : la validation arrive là où votre équipe travaille déjà.",
      },
      {
        title: 'Journal d\'audit complet',
        text: "Trace de toutes les actions importantes : connexions de comptes, publications, approbations, changements de plan. Téléchargeable à tout moment.",
      },
    ],
  },
  {
    title: "Mesurer et s'améliorer",
    lead: "Statistiques unifiées, actualisées automatiquement, comparables entre toutes vos marques.",
    blocks: [
      {
        title: 'Tableau de bord unique',
        text: "Impressions, portée, clics, likes, commentaires, partages — tout regroupé sur un seul écran et comparable entre réseaux. Plus besoin d'ouvrir 6 dashboards.",
      },
      {
        title: 'Actualisation automatique',
        text: "Chaque post est suivi automatiquement après publication. Vous voyez la dynamique de vos contenus sans avoir à actualiser quoi que ce soit.",
      },
      {
        title: 'Exports & intégrations',
        text: "Exports CSV par espace, intégrations avec vos outils BI ou CRM, données prêtes pour Looker Studio. Vos chiffres vivent là où vous travaillez.",
      },
    ],
  },
  {
    title: 'IA & accélération',
    lead: "Une IA qui connaît votre marque et écrit comme vous — pas comme tout le monde.",
    blocks: [
      {
        title: 'Voix de marque par espace',
        text: "Définissez votre ton, les mots à éviter, des exemples de posts réussis. L'IA s'adapte à chaque marque que vous gérez et reste fidèle à votre style.",
      },
      {
        title: 'Reformulation par ton',
        text: "Plus dynamique, plus institutionnel, plus court, plus engageant. Un clic, plusieurs propositions, vous gardez la main sur le résultat final.",
      },
      {
        title: 'Hashtags ciblés par réseau',
        text: "L'IA suggère des hashtags pertinents pour chaque réseau cible — fini le copier-coller maladroit entre LinkedIn et Instagram.",
      },
    ],
  },
  {
    title: 'Sécurité & confiance',
    lead: "Vos comptes et vos contenus sont précieux. On les traite comme tels.",
    blocks: [
      {
        title: 'Connexions officielles uniquement',
        text: "Vos comptes sont reliés via les connexions certifiées par chaque réseau. Aucun risque de bannissement, aucune méthode contournée.",
      },
      {
        title: 'Hébergement Europe',
        text: "Datacenters basés en France. Aucune donnée personnelle ne quitte l'Union européenne. Conformité RGPD native, DPA disponible sur simple demande.",
      },
      {
        title: 'Chiffrement permanent',
        text: "Vos accès et vos contenus sont chiffrés en permanence, vos espaces sont totalement séparés, et toutes les actions sont tracées.",
      },
      {
        title: 'Cloud privé (Enterprise)',
        text: "Si vous souhaitez un environnement totalement dédié à votre organisation, le plan Enterprise vous offre une instance privée, un accompagnement sur-mesure et un support prioritaire.",
      },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <main className="px-4 py-16 max-w-5xl mx-auto">
      <header className="text-center max-w-3xl mx-auto mb-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
          Tout ce qu'il faut pour piloter votre présence sociale
        </h1>
        <p className="text-slate-600 dark:text-slate-300 text-lg">
          Une plateforme conçue pour les agences, freelances et équipes marketing qui gèrent
          plusieurs marques sur les réseaux sociaux — sans y passer leurs journées.
        </p>
      </header>

      <div className="space-y-20">
        {sections.map((s) => (
          <section key={s.title}>
            <div className="mb-8">
              <h2 className="text-2xl md:text-3xl font-bold mb-2">{s.title}</h2>
              <p className="text-slate-600 dark:text-slate-300">{s.lead}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {s.blocks.map((b) => (
                <article
                  key={b.title}
                  className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                >
                  <h3 className="font-semibold text-lg mb-2">{b.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{b.text}</p>
                  {b.bullets && (
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {b.bullets.map((tag) => (
                        <li
                          key={tag}
                          className="text-xs px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                        >
                          {tag}
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="text-center mt-20 pt-12 border-t border-slate-200 dark:border-slate-800">
        <h2 className="text-2xl font-bold mb-3">Prêt à essayer ?</h2>
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
