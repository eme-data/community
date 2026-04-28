'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Nav } from '@/components/nav';
import { ThemeInjector } from '@/components/theme-injector';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem('community.token')) router.push('/login');
  }, [router]);

  return (
    <div>
      <ThemeInjector />
      <Nav />
      <main className="max-w-6xl mx-auto p-6">{children}</main>
    </div>
  );
}
