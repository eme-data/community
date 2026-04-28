'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Stepper } from '@/components/onboarding/stepper';

const STEPS = [
  { key: 'verify', label: 'Email' },
  { key: 'connect', label: 'Réseaux' },
  { key: 'done', label: 'Fini' },
];

export default function OnboardingDonePage() {
  const router = useRouter();

  async function finish(target: '/dashboard' | '/posts/new') {
    await api('/onboarding/complete', { method: 'POST' });
    router.push(target);
  }

  return (
    <div>
      <Stepper steps={STEPS} currentKey="done" />
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center">
        <p className="text-5xl mb-4">🎉</p>
        <h1 className="text-2xl font-bold mb-2">Tout est prêt !</h1>
        <p className="text-slate-600 dark:text-slate-300 mb-8">
          Votre espace est configuré. Vous pouvez créer votre première publication ou explorer le tableau de bord.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => finish('/posts/new')}
            className="px-6 py-3 rounded-lg bg-brand text-white hover:bg-brand-dark"
          >
            Créer mon premier post
          </button>
          <button
            onClick={() => finish('/dashboard')}
            className="px-6 py-3 rounded-lg border border-slate-300 dark:border-slate-700 hover:border-brand"
          >
            Aller au tableau de bord
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-6">
          Besoin d'aide ? <Link href="/features" className="underline">Consulter les fonctionnalités</Link>
        </p>
      </div>
    </div>
  );
}
