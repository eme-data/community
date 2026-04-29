import Link from 'next/link';

export function MarketingFooter() {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 mt-24">
      <div className="max-w-6xl mx-auto px-4 py-12 grid gap-8 md:grid-cols-5 text-sm">
        <div className="md:col-span-2">
          <p className="font-bold text-base mb-2">Community</p>
          <p className="text-slate-500 max-w-sm">
            La plateforme tout-en-un qui pilote la présence sociale des agences, équipes marketing
            et créateurs sur 6 réseaux — programmation, IA et statistiques inclus.
          </p>
          <p className="mt-4 inline-flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            Hébergé en Europe · 100% RGPD
          </p>
        </div>
        <div>
          <p className="font-medium mb-3">Produit</p>
          <ul className="space-y-2 text-slate-500">
            <li>
              <Link href="/features" className="hover:text-brand">
                Fonctionnalités
              </Link>
            </li>
            <li>
              <Link href="/integrations" className="hover:text-brand">
                Intégrations
              </Link>
            </li>
            <li>
              <Link href="/customers" className="hover:text-brand">
                Clients
              </Link>
            </li>
            <li>
              <Link href="/security" className="hover:text-brand">
                Sécurité
              </Link>
            </li>
            <li>
              <Link href="/pricing" className="hover:text-brand">
                Tarifs
              </Link>
            </li>
            <li>
              <Link href="/register" className="hover:text-brand">
                Essai gratuit
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-medium mb-3">Entreprise</p>
          <ul className="space-y-2 text-slate-500">
            <li>
              <a href="mailto:contact@meoxa.app" className="hover:text-brand">
                Contact commercial
              </a>
            </li>
            <li>
              <a href="mailto:support@meoxa.app" className="hover:text-brand">
                Support
              </a>
            </li>
            <li>
              <a href="mailto:security@meoxa.app" className="hover:text-brand">
                Sécurité
              </a>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-medium mb-3">Légal</p>
          <ul className="space-y-2 text-slate-500">
            <li>
              <Link href="/legal/terms" className="hover:text-brand">
                CGU
              </Link>
            </li>
            <li>
              <Link href="/legal/privacy" className="hover:text-brand">
                Confidentialité
              </Link>
            </li>
            <li>
              <a href="mailto:contact@meoxa.app?subject=Demande%20DPA" className="hover:text-brand">
                DPA
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-200 dark:border-slate-800 py-5 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-3 items-center justify-between text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Community by Meoxa. Tous droits réservés.</p>
          <p>Édité en France · TVA intracommunautaire sur facture</p>
        </div>
      </div>
    </footer>
  );
}
