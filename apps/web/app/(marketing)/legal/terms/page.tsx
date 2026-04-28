export default function TermsPage() {
  return (
    <main className="px-4 py-16 max-w-3xl mx-auto prose prose-slate dark:prose-invert">
      <h1>Conditions générales d'utilisation</h1>
      <p className="text-sm text-slate-500">Dernière mise à jour : à compléter par l'opérateur de l'instance.</p>

      <h2>1. Objet</h2>
      <p>
        Les présentes conditions régissent l'utilisation de l'application Community
        déployée par l'opérateur sur son infrastructure. Community permet la publication
        et la programmation de contenus sur des réseaux sociaux tiers.
      </p>

      <h2>2. Comptes</h2>
      <p>
        L'inscription est ouverte à toute personne majeure ou agissant pour le compte
        d'une organisation. L'utilisateur s'engage à fournir des informations exactes et
        à protéger ses identifiants.
      </p>

      <h2>3. Réseaux sociaux tiers</h2>
      <p>
        Community se connecte aux API officielles de LinkedIn, Meta (Facebook,
        Instagram) et TikTok via OAuth. L'utilisateur reste responsable du respect des
        conditions d'utilisation propres à chaque réseau.
      </p>

      <h2>4. Disponibilité</h2>
      <p>
        L'opérateur fait ses meilleurs efforts pour assurer la disponibilité du service
        mais ne peut garantir une absence totale d'interruption.
      </p>

      <h2>5. Responsabilité du contenu</h2>
      <p>
        L'utilisateur est seul responsable des contenus qu'il publie. L'opérateur se
        réserve le droit de suspendre un compte en cas d'usage manifestement illicite.
      </p>

      <h2>6. Données personnelles</h2>
      <p>
        Voir la <a href="/legal/privacy">politique de confidentialité</a>.
      </p>

      <h2>7. Modifications</h2>
      <p>
        Les présentes CGU peuvent être modifiées. Les utilisateurs en sont informés via
        l'interface.
      </p>

      <p className="text-sm text-slate-500">
        Ce texte est un modèle générique à adapter à votre activité, juridiction et plan tarifaire.
      </p>
    </main>
  );
}
