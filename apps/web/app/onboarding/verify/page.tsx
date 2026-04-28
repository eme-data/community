'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Stepper } from '@/components/onboarding/stepper';

const STEPS = [
  { key: 'verify', label: 'Email' },
  { key: 'connect', label: 'Réseaux' },
  { key: 'done', label: 'Fini' },
];

function VerifyInner() {
  const router = useRouter();
  const params = useSearchParams();
  const tokenFromLink = params.get('token');

  const [email, setEmail] = useState<string | null>(null);
  const [mailEnabled, setMailEnabled] = useState(false);
  const [resentAt, setResentAt] = useState<number | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If a token came in via the email link, consume it (works even without auth).
  useEffect(() => {
    if (!tokenFromLink) return;
    setVerifying(true);
    api('/onboarding/email/verify', {
      method: 'POST',
      body: JSON.stringify({ token: tokenFromLink }),
    })
      .then(() => {
        setVerified(true);
        // If the user is also logged in, push them forward.
        if (typeof window !== 'undefined' && localStorage.getItem('community.token')) {
          setTimeout(() => router.replace('/onboarding/connect'), 1200);
        }
      })
      .catch((err) => setError(err.message || 'Lien invalide ou expiré'))
      .finally(() => setVerifying(false));
  }, [tokenFromLink, router]);

  // Otherwise (no token in URL), check the user's current status.
  useEffect(() => {
    if (tokenFromLink) return;
    api<{ user: { email: string }; mailEnabled: boolean; progress: { emailVerified: boolean } }>(
      '/onboarding/status',
    ).then((s) => {
      setEmail(s.user.email);
      setMailEnabled(s.mailEnabled);
      if (s.progress.emailVerified) router.replace('/onboarding/connect');
    });
  }, [tokenFromLink, router]);

  async function resend() {
    setError(null);
    const res = await api<{ autoVerified?: boolean }>('/onboarding/email/send', { method: 'POST' });
    if (res?.autoVerified) {
      router.replace('/onboarding/connect');
      return;
    }
    setResentAt(Date.now());
  }

  if (tokenFromLink) {
    return (
      <div className="text-center py-10">
        {verifying && <p>Vérification du lien...</p>}
        {!verifying && verified && (
          <>
            <p className="text-2xl font-bold mb-2">Email confirmé ✓</p>
            <p className="text-slate-600 dark:text-slate-300">Vous pouvez fermer cet onglet et revenir à la configuration.</p>
          </>
        )}
        {!verifying && error && <p className="text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <Stepper steps={STEPS} currentKey="verify" />
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8">
        <h1 className="text-2xl font-bold mb-2">Confirmez votre email</h1>
        <p className="text-slate-600 dark:text-slate-300 mb-6">
          {mailEnabled ? (
            <>Nous avons envoyé un lien à <strong>{email}</strong>. Cliquez dessus pour activer votre compte.</>
          ) : (
            <>L'envoi d'email n'est pas configuré sur cette instance — votre adresse est validée automatiquement.</>
          )}
        </p>

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={resend} className="px-5 py-2 rounded-lg bg-brand text-white hover:bg-brand-dark">
            {mailEnabled ? 'Renvoyer le lien' : 'Continuer'}
          </button>
          {resentAt && <p className="text-sm text-slate-500 self-center">Lien renvoyé.</p>}
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<p>Chargement...</p>}>
      <VerifyInner />
    </Suspense>
  );
}
