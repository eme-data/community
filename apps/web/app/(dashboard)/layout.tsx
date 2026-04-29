'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardShell } from '@/components/dashboard-shell';
import { ThemeInjector } from '@/components/theme-injector';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem('community.token')) router.push('/login');
  }, [router]);

  return (
    <>
      <ThemeInjector />
      <DashboardShell>{children}</DashboardShell>
    </>
  );
}