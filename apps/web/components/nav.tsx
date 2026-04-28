'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';
import { setToken } from '@/lib/api';
import { TenantSwitcher } from './tenant-switcher';

const links = [
  { href: '/dashboard', label: 'Tableau de bord' },
  { href: '/posts', label: 'Publications' },
  { href: '/posts/pending', label: 'À approuver' },
  { href: '/posts/calendar', label: 'Calendrier' },
  { href: '/posts/new', label: 'Nouveau post' },
  { href: '/posts/import', label: 'Import CSV' },
  { href: '/templates', label: 'Templates' },
  { href: '/accounts', label: 'Comptes sociaux' },
  { href: '/settings/team', label: 'Équipe' },
  { href: '/settings/general', label: 'Général' },
  { href: '/settings/branding', label: 'Branding' },
  { href: '/settings/brand-voice', label: 'Brand voice' },
  { href: '/settings/api-keys', label: 'Clés API' },
  { href: '/settings/billing', label: 'Facturation' },
  { href: '/settings/security', label: 'Sécurité' },
  { href: '/settings/audit', label: 'Audit' },
];

interface BrandedTenant {
  brandName?: string | null;
  logoMediaId?: string | null;
}

export function Nav() {
  const path = usePathname();
  const router = useRouter();
  const [brand, setBrand] = useState<BrandedTenant | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setBrand((window as any).__community_tenant ?? null);
    const handler = (e: Event) => {
      setBrand(((e as CustomEvent).detail as BrandedTenant) ?? null);
    };
    window.addEventListener('community:tenant-changed', handler);
    return () => window.removeEventListener('community:tenant-changed', handler);
  }, []);

  function logout() {
    setToken(null);
    router.push('/login');
  }

  const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api';
  const logoUrl = brand?.logoMediaId ? `${apiBase}/media/${brand.logoMediaId}/raw` : null;
  const brandLabel = brand?.brandName || 'Community';

  return (
    <nav className="border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/70 backdrop-blur sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-6">
        <Link href="/dashboard" className="font-bold flex items-center gap-2">
          {logoUrl && <img src={logoUrl} alt="" className="h-7 w-auto max-w-[120px] object-contain" />}
          <span>{brandLabel}</span>
        </Link>
        <ul className="flex gap-4 text-sm flex-wrap">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className={clsx(
                  'hover:text-brand',
                  path === l.href && 'text-brand font-medium',
                )}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="ml-auto flex items-center gap-3">
          <TenantSwitcher />
          <button onClick={logout} className="text-sm text-slate-500 hover:text-red-600">
            Déconnexion
          </button>
        </div>
      </div>
    </nav>
  );
}
