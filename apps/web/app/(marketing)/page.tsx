'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n';

export default function LandingPage() {
  const { t } = useI18n();
  return (
    <>
      <section className="px-4 py-24 max-w-6xl mx-auto text-center">
        <span className="inline-block px-3 py-1 text-xs rounded-full bg-brand/10 text-brand mb-6">
          {t.landing.badge}
        </span>
        <h1 className="text-5xl md:text-6xl font-bold leading-tight tracking-tight">
          {t.landing.titleA} <span className="text-brand">{t.landing.titleB}</span>.
        </h1>
        <p className="mt-6 text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
          {t.landing.subtitle}
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/register" className="px-6 py-3 rounded-lg bg-brand text-white font-medium hover:bg-brand-dark">
            {t.landing.ctaPrimary}
          </Link>
          <Link href="/features" className="px-6 py-3 rounded-lg border border-slate-300 dark:border-slate-700 hover:border-brand">
            {t.landing.ctaSecondary}
          </Link>
        </div>
        <p className="mt-4 text-sm text-slate-500">{t.landing.noCard}</p>
      </section>

      <section className="px-4 py-20 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">{t.landing.sectionTitle}</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <Feature title={t.landing.f1Title} text={t.landing.f1Text} />
          <Feature title={t.landing.f2Title} text={t.landing.f2Text} />
          <Feature title={t.landing.f3Title} text={t.landing.f3Text} />
          <Feature title={t.landing.f4Title} text={t.landing.f4Text} />
          <Feature title={t.landing.f5Title} text={t.landing.f5Text} />
          <Feature title={t.landing.f6Title} text={t.landing.f6Text} />
        </div>
      </section>

      <section className="px-4 py-20 bg-slate-100 dark:bg-slate-900">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">{t.landing.ctaTitle}</h2>
          <p className="text-slate-600 dark:text-slate-300 mb-8">{t.landing.ctaText}</p>
          <Link href="/register" className="inline-block px-8 py-3 rounded-lg bg-brand text-white font-medium hover:bg-brand-dark">
            {t.landing.ctaButton}
          </Link>
        </div>
      </section>
    </>
  );
}

function Feature({ title, text }: { title: string; text: string }) {
  return (
    <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400">{text}</p>
    </div>
  );
}
