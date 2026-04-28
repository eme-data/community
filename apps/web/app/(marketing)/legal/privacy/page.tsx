export default function PrivacyPage() {
  return (
    <main className="px-4 py-16 max-w-3xl mx-auto prose prose-slate dark:prose-invert">
      <h1>Politique de confidentialité</h1>
      <p className="text-sm text-slate-500">Dernière mise à jour : à compléter par l'opérateur de l'instance.</p>

      <h2>Données collectées</h2>
      <ul>
        <li>Email, nom (pour votre compte)</li>
        <li>Mot de passe (stocké sous forme hashée — bcrypt)</li>
        <li>Tokens OAuth des réseaux sociaux connectés (chiffrés en base — AES-256-GCM)</li>
        <li>Contenus de vos publications, brouillons et calendrier</li>
        <li>Logs techniques (durée limitée)</li>
      </ul>

      <h2>Finalité</h2>
      <p>
        Les données sont utilisées exclusivement pour fournir le service : authentification,
        publication sur les réseaux sociaux que vous avez connectés, planification.
      </p>

      <h2>Hébergement</h2>
      <p>
        Cette instance est hébergée par l'opérateur indiqué en page d'accueil. Les
        données ne sont pas transférées à des tiers en dehors des appels nécessaires
        aux API des réseaux sociaux que vous avez choisis.
      </p>

      <h2>Conservation</h2>
      <p>
        Les données sont conservées tant que votre compte est actif. À la suppression
        d'un compte, les données associées sont effacées dans un délai raisonnable.
      </p>

      <h2>Droits</h2>
      <p>
        Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, de
        suppression et de portabilité de vos données. Contact :
        <a href="mailto:contact@meoxa.app"> contact@meoxa.app</a>.
      </p>

      <p className="text-sm text-slate-500">
        Ce texte est un modèle générique à compléter selon votre activité et votre juridiction.
      </p>
    </main>
  );
}
