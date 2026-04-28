'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';
import { setToken } from '@/lib/api';
import { TenantSwitcher } from './tenant-switcher';

const links = [
  { href: '/dashboard', label: 'Tableau de bord' },
  { href: '/posts', label: 'Publications' },
  { href: '/posts/calendar', label: 'Calendrier' },
  { href: '/posts/new', label: 'Nouveau post' },
  { href: '/accounts', label: 'Comptes sociaux' },
];

export function Nav() {
  const path = usePathname();
  const router = useRouter();

  function logout() {
    setToken(null);
    router.push('/login');
  }

  return (
    <nav className="border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/70 backdrop-blur sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-6">
        <Link href="/dashboard" className="font-bold">Community</Link>
        <ul className="flex gap-4 text-sm">
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
