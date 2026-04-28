'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = localStorage.getItem('community.token');
    // The /verify page can be opened from an email link without a token (we
    // accept the verify call publicly), so don't force-redirect from it.
    if (!t && !path?.startsWith('/onboarding/verify')) router.push('/login');
  }, [router, path]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center">
          <Link href="/" className="font-bold">Community</Link>
          <span className="ml-3 text-sm text-slate-500">Configuration</span>
        </div>
      </header>
      <main className="flex-1 px-4 py-10 max-w-3xl mx-auto w-full">{children}</main>
    </div>
  );
}
