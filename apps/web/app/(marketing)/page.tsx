'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useI18n } from '@/lib/i18n';

export default function LandingPage() {
  const { t } = useI18n();
  return (
    <>
      {/* HERO */}
      <section className="px-4 pt-20 pb-16 max-w-6xl mx-auto text-center">
        <span className="inline-block px-3 py-1 text-xs rounded-full bg-brand/10 text-brand mb-6">
          {t.landing.badge}
        </span>
        <h1 className="text-5xl md:text-6xl font-bold leading-[1.05] tracking-tight">
          {t.landing.titleA}
          <br />
          <span className="text-brand">{t.landing.titleB}</span>
        </h1>
        <p className="mt-6 text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
          {t.landing.subtitle}
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/register"
            className="px-6 py-3 rounded-lg bg-brand text-white font-medium hover:bg-brand-dark"
          >
            {t.landing.ctaPrimary}
          </Link>
          <Link
            href="/pricing"
            className="px-6 py-3 rounded-lg border border-slate-300 dark:border-slate-700 hover:border-brand"
          >
            {t.landing.ctaSecondary}
          </Link>
        </div>
        <p className="mt-4 text-sm text-slate-500">{t.landing.noCard}</p>
      </section>

      {/* TRUST BAR */}
      <section className="px-4 pb-16 max-w-6xl mx-auto">
        <p className="text-center text-xs uppercase tracking-wider text-slate-500 mb-8">
          {t.landing.trustTitle}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <Stat value="6" label={t.landing.trustStat1} />
          <Stat value="< 5 min" label={t.landing.trustStat2} />
          <Stat value="100%" label={t.landing.trustStat3} />
          <Stat value="99,9%" label={t.landing.trustStat4} />
        </div>
        <p className="mt-10 text-center text-xs text-slate-500">{t.landing.trustNote}</p>
      </section>

      {/* BENEFITS */}
      <section className="px-4 py-20 max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">{t.landing.sectionTitle}</h2>
          <p className="text-slate-600 dark:text-slate-300">{t.landing.sectionLead}</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <Feature title={t.landing.f1Title} text={t.landing.f1Text} />
          <Feature title={t.landing.f2Title} text={t.landing.f2Text} />
          <Feature title={t.landing.f3Title} text={t.landing.f3Text} />
          <Feature title={t.landing.f4Title} text={t.landing.f4Text} />
          <Feature title={t.landing.f5Title} text={t.landing.f5Text} />
          <Feature title={t.landing.f6Title} text={t.landing.f6Text} />
        </div>
      </section>

      {/* USE CASES */}
      <section className="px-4 py-20 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">{t.landing.useCasesTitle}</h2>
            <p className="text-slate-600 dark:text-slate-300">{t.landing.useCasesLead}</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <UseCase title={t.landing.uc1Title} text={t.landing.uc1Text} />
            <UseCase title={t.landing.uc2Title} text={t.landing.uc2Text} />
            <UseCase title={t.landing.uc3Title} text={t.landing.uc3Text} />
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="px-4 py-20 max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          {t.landing.socialProofTitle}
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          <Testimonial quote={t.landing.t1Quote} name={t.landing.t1Name} role={t.landing.t1Role} />
          <Testimonial quote={t.landing.t2Quote} name={t.landing.t2Name} role={t.landing.t2Role} />
          <Testimonial quote={t.landing.t3Quote} name={t.landing.t3Name} role={t.landing.t3Role} />
        </div>
      </section>

      {/* SECURITY */}
      <section className="px-4 py-20 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">{t.landing.securityTitle}</h2>
            <p className="text-slate-600 dark:text-slate-300">{t.landing.securityLead}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <Security title={t.landing.sec1Title} text={t.landing.sec1Text} />
            <Security title={t.landing.sec2Title} text={t.landing.sec2Text} />
            <Security title={t.landing.sec3Title} text={t.landing.sec3Text} />
            <Security title={t.landing.sec4Title} text={t.landing.sec4Text} />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 py-20 max-w-3xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">{t.landing.faqTitle}</h2>
        <div className="space-y-3">
          <FaqItem q={t.landing.faq1Q} a={t.landing.faq1A} />
          <FaqItem q={t.landing.faq2Q} a={t.landing.faq2A} />
          <FaqItem q={t.landing.faq3Q} a={t.landing.faq3A} />
          <FaqItem q={t.landing.faq4Q} a={t.landing.faq4A} />
          <FaqItem q={t.landing.faq5Q} a={t.landing.faq5A} />
          <FaqItem q={t.landing.faq6Q} a={t.landing.faq6A} />
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="px-4 py-20 bg-slate-100 dark:bg-slate-900">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t.landing.ctaTitle}</h2>
          <p className="text-slate-600 dark:text-slate-300 mb-8">{t.landing.ctaText}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="px-8 py-3 rounded-lg bg-brand text-white font-medium hover:bg-brand-dark"
            >
              {t.landing.ctaButton}
            </Link>
            <Link
              href="mailto:contact@meoxa.app"
              className="px-8 py-3 rounded-lg border border-slate-300 dark:border-slate-700 hover:border-brand"
            >
              {t.landing.ctaSecondaryButton}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
      <p className="text-3xl md:text-4xl font-bold text-brand">{value}</p>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{label}</p>
    </div>
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

function UseCase({ title, text }: { title: string; text: string }) {
  return (
    <div className="p-6 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400">{text}</p>
    </div>
  );
}

function Testimonial({ quote, name, role }: { quote: string; name: string; role: string }) {
  return (
    <figure className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
      <blockquote className="text-sm text-slate-700 dark:text-slate-300 flex-1">
        “{quote}”
      </blockquote>
      <figcaption className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
        <p className="font-semibold text-sm">{name}</p>
        <p className="text-xs text-slate-500">{role}</p>
      </figcaption>
    </figure>
  );
}

function Security({ title, text }: { title: string; text: string }) {
  return (
    <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
      <h3 className="font-semibold text-sm mb-1">{title}</h3>
      <p className="text-xs text-slate-600 dark:text-slate-400">{text}</p>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 p-4 text-left"
        aria-expanded={open}
      >
        <span className="font-medium text-sm">{q}</span>
        <span className="text-slate-400 text-lg leading-none">{open ? '−' : '+'}</span>
      </button>
      {open && <p className="px-4 pb-4 text-sm text-slate-600 dark:text-slate-400">{a}</p>}
    </div>
  );
}
