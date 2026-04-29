'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { setToken } from '@/lib/api';
import { TenantSwitcher } from './tenant-switcher';
import { NotificationBell } from './notification-bell';

interface NavItem {
  href: string;
  label: string;
  icon: string;
  match?: (path: string) => boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const HOME = 'M3 12 12 4l9 8|M5 10v10h14V10';
const CHART = 'M3 3v18h18|M7 15l4-4 4 3 5-7';
const CAL = 'M16 3v4M8 3v4M3 10h18';
const UP = 'M12 16V4M7 9l5-5 5 5|M5 20h14';
const LIST = 'M8 6h13M8 12h13M8 18h13';
const CHECK = 'M20 6L9 17l-5-5';
const BOOK = 'M6 4h12v17l-6-4-6 4z';
const SHARE = 'M9 11l6-3M9 13l6 3';
const TEAM = 'M2 21c0-3.5 3-6 7-6s7 2.5 7 6';
const SET = 'M12 1v3M12 20v3M4 12H1M23 12h-3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2';
const PAL = 'M12 3a9 9 0 0 0 0 18c1.5 0 2-1 2-2 0-1.5-1-2-1-3s1-2 2-2h2a4 4 0 0 0 4-4 9 9 0 0 0-9-7z';
const MIC = 'M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6';
const KEY = 'M11 13l9-9M16 8l3 3';
const BOLT = 'M13 2L4 14h7l-1 8 9-12h-7z';
const CARD = 'M3 10h18M7 15h3';
const SHIELD = 'M12 3l8 3v6c0 4.5-3 8.5-8 9-5-.5-8-4.5-8-9V6z|M9 12l2 2 4-4';
const HIST = 'M3 12a9 9 0 1 0 3-6.7|M3 4v5h5|M12 7v5l3 2';
const PLUS = 'M12 5v14M5 12h14';
const MENU = 'M4 6h16M4 12h16M4 18h16';
const CLOSE_X = 'M6 6l12 12M18 6L6 18';
const CHEV = 'M6 9l6 6 6-6';

function Icon({ d }: { d: string }) {
  const paths = d.split('|');
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {paths.map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}

const navGroups: NavGroup[] = [
  {
    label: 'Pilotage',
    items: [
      { href: '/dashboard', label: 'Tableau de bord', icon: HOME },
      { href: '/analytics', label: 'Analytics', icon: CHART },
    ],
  },
  {
    label: 'Création',
    items: [
      { href: '/posts/calendar', label: 'Calendrier', icon: CAL },
      { href: '/posts/import', label: 'Import CSV', icon: UP },
    ],
  },
  {
    label: 'Bibliothèque',
    items: [
      { href: '/posts', label: 'Publications', icon: LIST, match: (p) => p === '/posts' },
      { href: '/posts/pending', label: 'À approuver', icon: CHECK },
      { href: '/templates', label: 'Templates', icon: BOOK },
    ],
  },
  {
    label: 'Réseaux',
    items: [{ href: '/accounts', label: 'Comptes sociaux', icon: SHARE }],
  },
  {
    label: 'Paramètres',
    items: [
      { href: '/settings/team', label: 'Équipe', icon: TEAM },
      { href: '/settings/general', label: 'Général', icon: SET },
      { href: '/settings/branding', label: 'Branding', icon: PAL },
      { href: '/settings/brand-voice', label: 'Brand voice', icon: MIC },
      { href: '/settings/api-keys', label: 'Clés API', icon: KEY },
      { href: '/settings/webhooks', label: 'Webhooks', icon: BOLT },
      { href: '/settings/billing', label: 'Facturation', icon: CARD },
      { href: '/settings/security', label: 'Sécurité', icon: SHIELD },
      { href: '/settings/audit', label: 'Audit', icon: HIST },
    ],
  },
];

interface BrandedTenant {
  brandName?: string | null;
  logoMediaId?: string | null;
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [brand, setBrand] = useState<BrandedTenant | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setBrand((window as any).__community_tenant ?? null);
    const handler = (e: Event) => {
      setBrand(((e as CustomEvent).detail as BrandedTenant) ?? null);
    };
    window.addEventListener('community:tenant-changed', handler);
    return () => window.removeEventListener('community:tenant-changed', handler);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
  }, [path]);

  useEffect(() => {
    if (!userMenuOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [userMenuOpen]);

  function logout() {
    setToken(null);
    router.push('/login');
  }

  const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api';
  const logoUrl = brand?.logoMediaId ? `${apiBase}/media/${brand.logoMediaId}/raw` : null;
  const brandLabel = brand?.brandName || 'Community';

  function isActive(item: NavItem) {
    if (item.match) return item.match(path);
    if (path === item.href) return true;
    return path.startsWith(item.href + '/');
  }

  const SidebarBody = (
    <>
      <div className="px-3 pt-4">
        <Link
          href="/posts/new"
          className="flex items-center justify-center gap-2 w-full h-10 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-dark transition shadow-sm"
        >
          <Icon d={PLUS} />
          Nouveau post
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={clsx(
                      'flex items-center gap-3 px-3 h-9 rounded-lg text-sm transition',
                      isActive(item)
                        ? 'bg-brand/10 text-brand font-medium'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
                    )}
                  >
                    <span className={clsx('shrink-0', isActive(item) ? 'text-brand' : 'text-slate-400')}>
                      <Icon d={item.icon} />
                    </span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="h-14 px-5 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="h-7 w-auto max-w-[120px] object-contain" />
          ) : (
            <div className="h-7 w-7 rounded-md bg-brand text-white grid place-items-center font-bold text-xs">
              {brandLabel.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="font-semibold tracking-tight truncate">{brandLabel}</span>
        </div>
        {SidebarBody}
      </aside>

      {mobileOpen && (
        <>
          <div className="lg:hidden fixed inset-0 bg-slate-950/50 z-40" onClick={() => setMobileOpen(false)} aria-hidden />
          <aside className="lg:hidden fixed top-0 left-0 bottom-0 w-72 z-50 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col">
            <div className="h-14 px-5 flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800">
              <span className="font-semibold tracking-tight truncate">{brandLabel}</span>
              <button type="button" onClick={() => setMobileOpen(false)} aria-label="Fermer" className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800">
                <Icon d={CLOSE_X} />
              </button>
            </div>
            {SidebarBody}
          </aside>
        </>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-30">
          <div className="h-full px-4 lg:px-6 flex items-center gap-3">
            <button type="button" onClick={() => setMobileOpen(true)} aria-label="Ouvrir le menu" className="lg:hidden p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800">
              <Icon d={MENU} />
            </button>

            <div className="flex-1 min-w-0">
              <TenantSwitcher />
            </div>

            <NotificationBell />

            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((o) => !o)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
              >
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-brand to-brand-dark text-white grid place-items-center text-xs font-semibold">
                  {brandLabel.charAt(0).toUpperCase()}
                </div>
                <Icon d={CHEV} />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg overflow-hidden z-40">
                  <div className="px-3 py-2.5 border-b border-slate-200 dark:border-slate-800">
                    <p className="text-xs text-slate-500">Espace actuel</p>
                    <p className="text-sm font-medium truncate">{brandLabel}</p>
                  </div>
                  <Link href="/settings/general" className="block px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
                    Paramètres
                  </Link>
                  <Link href="/settings/billing" className="block px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
                    Facturation
                  </Link>
                  <button
                    type="button"
                    onClick={logout}
                    className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 border-t border-slate-200 dark:border-slate-800"
                  >
                    Déconnexion
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 lg:px-8 py-6 lg:py-8 max-w-6xl mx-auto w-full">{children}</main>
      </div>
    </div>
  );
}