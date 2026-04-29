import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Sécurité & conformité',
  description:
    'Hébergement européen, conformité RGPD, chiffrement permanent, journal d’audit, contrat DPA inclus. Vos comptes sociaux et vos contenus sont protégés par défaut.',
};

interface Pillar {
  title: string;
  text: string;
}

interface Block {
  title: string;
  lead?: string;
  pillars: Pillar[];
}

const blocks: Block[] = [
  {
    title: 'Vos données restent en Europe',
    lead: "Hébergement souverain, sans transfert hors Union européenne.",
    pillars: [
      {
        title: 'Datacenters France & Allemagne',
        text: "Toutes vos données — comptes connectés, contenus, statistiques — sont stockées dans des datacenters opérés en France et en Allemagne. Aucune donnée personnelle ne quitte l'Union européenne.",
      },
      {
        title: 'Aucun transfert hors UE',
        text: "Nous ne sous-traitons aucune partie du traitement de vos données vers des pays tiers. Pas de contournement, pas de zone grise — votre conformité reste simple à expliquer.",
      },
      {
        title: 'Sauvegardes chiffrées quotidiennes',
        text: "Vos données sont sauvegardées chaque jour, chiffrées au repos, et conservées dans la même zone géographique. Restauration possible à la demande.",
      },
    ],
  },
  {
    title: '100% conforme RGPD',
    lead: "Community a été conçu RGPD-natif, pas adapté après coup.",
    pillars: [
      {
        title: 'Contrat DPA inclus',
        text: "Le contrat de protection des données (DPA / accord de sous-traitance) est inclus dans nos conditions, ou signable en bilatéral sur demande. Aucun frais supplémentaire.",
      },
      {
        title: 'Droit d\'accès, rectification, effacement',
        text: "Vos utilisateurs peuvent demander à tout moment l'export ou la suppression de leurs données. Nous traitons les demandes RGPD sous 30 jours, gratuitement.",
      },
      {
        title: 'Minimisation des données',
        text: "Nous ne collectons que le strict nécessaire au fonctionnement du service. Pas de tracking commercial, pas de revente, pas d'usage publicitaire.",
      },
      {
        title: 'Délégué à la protection des données',
        text: "Un point de contact dédié à toute question RGPD : dpo@meoxa.app. Réponse sous 5 jours ouvrés.",
      },
    ],
  },
  {
    title: 'Sécurité technique',
    lead: "Vos accès et vos contenus sont protégés en permanence.",
    pillars: [
      {
        title: 'Chiffrement en permanence',
        text: "Toutes vos communications avec Community sont chiffrées (HTTPS/TLS). Vos accès aux réseaux sociaux et vos contenus sont chiffrés au repos dans nos bases.",
      },
      {
        title: 'Connexions officielles uniquement',
        text: "Vos comptes sociaux sont reliés exclusivement via les connexions certifiées par chaque réseau. Aucun mot de passe n'est jamais demandé ni stocké, et aucun risque de bannissement pour usage non conforme.",
      },
      {
        title: 'Espaces totalement cloisonnés',
        text: "Chaque espace (par marque ou par client) est isolé par défaut. Aucune fuite possible entre vos espaces — c'est la règle, pas l'exception.",
      },
      {
        title: 'Mots de passe & double authentification',
        text: "Politique de mots de passe robustes, double authentification (2FA) disponible sur tous les plans, sessions révocables à la demande.",
      },
    ],
  },
  {
    title: 'Gouvernance & traçabilité',
    lead: "Vous gardez la main sur qui fait quoi, quand, et avec quelles données.",
    pillars: [
      {
        title: "Journal d'audit par espace",
        text: "Toutes les actions sensibles sont tracées : connexions, publications, approbations, changements de plan, exports. Téléchargeable à tout moment, conservé 12 mois minimum.",
      },
      {
        title: 'Rôles & permissions adaptés',
        text: "Donnez à chaque utilisateur le bon niveau d'accès : propriétaire, administrateur, éditeur ou lecteur. Vos clients ne voient que ce qui leur est destiné.",
      },
      {
        title: "Connexion d'entreprise (SSO)",
        text: "Sur les plans Business et Enterprise, intégrez Community à votre annuaire d'entreprise pour gérer les accès depuis un point central.",
      },
      {
        title: 'Révocation immédiate',
        text: "Un utilisateur quitte votre équipe ? Révoquez ses accès en un clic. Tous ses jetons de session sont invalidés instantanément.",
      },
    ],
  },
  {
    title: 'Engagements de service',
    lead: "Une plateforme fiable, des engagements clairs.",
    pillars: [
      {
        title: 'Disponibilité 99,9%',
        text: "Nous nous engageons sur une disponibilité de 99,9% par mois. La page de statut publique est accessible à tout moment et reflète en temps réel l'état du service.",
      },
      {
        title: 'Notification des incidents',
        text: "En cas d'incident affectant vos données, nous vous notifions dans les 72 heures, comme l'exige le RGPD — souvent bien plus tôt en pratique.",
      },
      {
        title: 'Sauvegardes & restauration',
        text: "Sauvegardes quotidiennes chiffrées. Restauration possible sur les 30 derniers jours sur les plans payants, jusqu'à 90 jours sur Business et Enterprise.",
      },
      {
        title: 'Réversibilité totale',
        text: "Vos contenus, vos statistiques et vos paramètres sont exportables à tout moment. Si vous décidez de partir, vous repartez avec vos données — sans frais, sans friction.",
      },
    ],
  },
  {
    title: 'Plan Enterprise : exigences renforcées',
    lead: "Pour les organisations soumises à des obligations spécifiques.",
    pillars: [
      {
        title: 'Cloud privé entièrement dédié',
        text: "Une instance Community déployée dans un environnement totalement dédié à votre organisation, isolée du reste de notre infrastructure.",
      },
      {
        title: 'Engagements de service personnalisés',
        text: "Disponibilité, temps de réponse, fenêtres de maintenance — tout peut être adapté à vos contraintes métier.",
      },
      {
        title: 'Conformité renforcée sur demande',
        text: "Audits ISO 27001, SOC 2 ou sectoriels (santé, finance, secteur public) sur demande. Nous accompagnons votre service achats et votre RSSI dans la due diligence.",
      },
      {
        title: 'Customer Success dédié',
        text: "Un interlocuteur unique pour vos demandes — déploiement, support, évolutions, audits — avec des engagements de réponse dédiés.",
      },
    ],
  },
];

export default function SecurityPage() {
  return (
    <main className="px-4 py-16 max-w-5xl mx-auto">
      <header className="text-center max-w-3xl mx-auto mb-16">
        <span className="inline-block px-3 py-1 text-xs rounded-full bg-brand/10 text-brand mb-4">
          Sécurité & conformité
        </span>
        <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
          Vos comptes sociaux sont précieux. On les traite comme tels.
        </h1>
        <p className="text-slate-600 dark:text-slate-300 text-lg">
          Hébergement européen, conformité RGPD complète, chiffrement permanent, traçabilité totale.
          La sécurité n'est pas une option payante chez Community — c'est l'engagement par défaut,
          dès le plan gratuit.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs">
          <Badge>Hébergement Europe</Badge>
          <Badge>RGPD</Badge>
          <Badge>DPA inclus</Badge>
          <Badge>99,9% de disponibilité</Badge>
          <Badge>Chiffrement permanent</Badge>
          <Badge>SSO disponible</Badge>
        </div>
      </header>

      <div className="space-y-20">
        {blocks.map((b) => (
          <section key={b.title}>
            <div className="mb-8">
              <h2 className="text-2xl md:text-3xl font-bold mb-2">{b.title}</h2>
              {b.lead && <p className="text-slate-600 dark:text-slate-300">{b.lead}</p>}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {b.pillars.map((p) => (
                <article
                  key={p.title}
                  className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                >
                  <h3 className="font-semibold text-lg mb-2">{p.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{p.text}</p>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="mt-20 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 grid md:grid-cols-2 gap-8 items-center">
        <div>
          <h2 className="text-2xl font-bold mb-2">Une question de sécurité ou de conformité ?</h2>
          <p className="text-slate-600 dark:text-slate-300">
            Notre équipe sécurité répond aux audits, questionnaires RSSI et demandes d'achats en
            moins de 5 jours ouvrés. Documentation, DPA, attestations sur simple demande.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 md:justify-end">
          <a
            href="mailto:security@meoxa.app"
            className="inline-flex justify-center items-center px-6 py-3 rounded-lg bg-brand text-white font-medium hover:bg-brand-dark"
          >
            Contacter l'équipe sécurité
          </a>
          <a
            href="mailto:contact@meoxa.app?subject=Demande%20DPA"
            className="inline-flex justify-center items-center px-6 py-3 rounded-lg border border-slate-300 dark:border-slate-700 hover:border-brand"
          >
            Demander le DPA
          </a>
        </div>
      </section>

      <div className="text-center mt-20 pt-12 border-t border-slate-200 dark:border-slate-800">
        <h2 className="text-2xl font-bold mb-3">Prêt à démarrer en confiance ?</h2>
        <p className="text-slate-600 dark:text-slate-300 mb-6">
          14 jours gratuits, sans carte bancaire. Vos données restent à vous.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/register"
            className="px-6 py-3 rounded-lg bg-brand text-white font-medium hover:bg-brand-dark"
          >
            Démarrer mon essai gratuit
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

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      {children}
    </span>
  );
}
