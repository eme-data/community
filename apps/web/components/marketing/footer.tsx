import Link from 'next/link';

export function MarketingFooter() {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 mt-24">
      <div className="max-w-6xl mx-auto px-4 py-10 grid gap-8 md:grid-cols-4 text-sm">
        <div>
          <p className="font-bold mb-2">Community</p>
          <p className="text-slate-500">Publication automatisée multi-réseaux.</p>
        </div>
        <div>
          <p className="font-medium mb-2">Produit</p>
          <ul className="space-y-1 text-slate-500">
            <li><Link href="/features" className="hover:text-brand">Fonctionnalités</Link></li>
            <li><Link href="/pricing" className="hover:text-brand">Tarifs</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-medium mb-2">Compte</p>
          <ul className="space-y-1 text-slate-500">
            <li><Link href="/login" className="hover:text-brand">Connexion</Link></li>
            <li><Link href="/register" className="hover:text-brand">S'inscrire</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-medium mb-2">Légal</p>
          <ul className="space-y-1 text-slate-500">
            <li><Link href="/legal/terms" className="hover:text-brand">CGU</Link></li>
            <li><Link href="/legal/privacy" className="hover:text-brand">Confidentialité</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-200 dark:border-slate-800 py-4 text-xs text-center text-slate-500">
        © {new Date().getFullYear()} Community. Tous droits réservés.
      </div>
    </footer>
  );
}
