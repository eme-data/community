'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import clsx from 'clsx';

const links = [
  { href: '/features', label: 'Fonctionnalités' },
  { href: '/pricing', label: 'Tarifs' },
];

export function MarketingHeader() {
  const [authed, setAuthed] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setAuthed(!!localStorage.getItem('community.token'));
  }, []);

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-6">
        <Link href="/" className="font-bold text-lg">Community</Link>
        <nav className={clsx('flex-1 gap-6 text-sm hidden md:flex')}>
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-brand">{l.label}</Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {authed ? (
            <Link href="/dashboard" className="px-4 py-2 rounded bg-brand text-white text-sm">Tableau de bord</Link>
          ) : (
            <>
              <Link href="/login" className="px-3 py-2 text-sm hover:text-brand">Connexion</Link>
              <Link href="/register" className="px-4 py-2 rounded bg-brand text-white text-sm hover:bg-brand-dark">Démarrer gratuitement</Link>
            </>
          )}
          <button
            type="button"
            className="md:hidden ml-2 p-2"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
          >
            <span className="block w-5 h-0.5 bg-current mb-1" />
            <span className="block w-5 h-0.5 bg-current mb-1" />
            <span className="block w-5 h-0.5 bg-current" />
          </button>
        </div>
      </div>
      {open && (
        <nav className="md:hidden border-t border-slate-200 dark:border-slate-800 px-4 py-3 flex flex-col gap-3 text-sm">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>{l.label}</Link>
          ))}
        </nav>
      )}
    </header>
  );
}
