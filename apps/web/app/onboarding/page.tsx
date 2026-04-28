'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface Status {
  progress: {
    emailVerified: boolean;
    accountConnected: boolean;
    firstPostCreated: boolean;
    completed: boolean;
  };
  mailEnabled: boolean;
}

export default function OnboardingEntryPage() {
  const router = useRouter();

  useEffect(() => {
    api<Status>('/onboarding/status')
      .then((s) => {
        if (s.progress.completed) router.replace('/dashboard');
        else if (!s.progress.emailVerified) router.replace('/onboarding/verify');
        else if (!s.progress.accountConnected) router.replace('/onboarding/connect');
        else router.replace('/onboarding/done');
      })
      .catch(() => router.replace('/login'));
  }, [router]);

  return <p className="text-center text-slate-500">Chargement...</p>;
}
