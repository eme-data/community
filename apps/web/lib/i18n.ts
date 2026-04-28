'use client';

import { createContext, useContext } from 'react';

export type Locale = 'fr' | 'en';
export const LOCALES: Locale[] = ['fr', 'en'];
export const DEFAULT_LOCALE: Locale = 'fr';
export const COOKIE_NAME = 'community.locale';

export const dictionary = {
  fr: {
    nav: {
      features: 'Fonctionnalités',
      pricing: 'Tarifs',
      login: 'Connexion',
      signup: 'Démarrer gratuitement',
      dashboard: 'Tableau de bord',
    },
    landing: {
      badge: 'Multi-tenant · Auto-hébergé · Open',
      titleA: 'Publiez partout,',
      titleB: 'en un seul geste',
      subtitle: 'Programmez et automatisez vos publications sur LinkedIn, Facebook, Instagram et TikTok depuis une seule interface — pour vous ou pour vos clients.',
      ctaPrimary: 'Démarrer gratuitement',
      ctaSecondary: 'Voir les fonctionnalités',
      noCard: 'Sans carte bancaire · Inscription en 30 secondes',
      sectionTitle: 'Tout ce qu\'il faut pour gérer plusieurs marques',
      f1Title: 'Multi-tenant natif',
      f1Text: 'Créez un espace par client ou par marque, avec ses propres comptes connectés et son calendrier.',
      f2Title: 'Tous les réseaux + extensible',
      f2Text: 'LinkedIn, Facebook, Instagram, TikTok, X. Architecture providers : ajoutez YouTube, Bluesky, Threads…',
      f3Title: 'Programmation fiable',
      f3Text: 'File d\'attente Redis/BullMQ, retry exponentiel, statut par cible : un échec d\'un réseau ne bloque pas les autres.',
      f4Title: 'IA intégrée',
      f4Text: 'Suggestion de hashtags adaptés au réseau, reformulation par ton, brand voice par tenant — propulsé par Claude.',
      f5Title: 'Auto-hébergé',
      f5Text: 'Une commande sur Ubuntu 24.04, Docker Compose, HTTPS automatique via Caddy. Pas de SaaS imposé.',
      f6Title: 'API publique',
      f6Text: 'Clés API par tenant, OpenAPI documenté. Branchez Zapier, n8n ou votre CMS en 30 secondes.',
      ctaTitle: 'Prêt à essayer ?',
      ctaText: 'Créez votre espace, connectez vos comptes, programmez votre premier post — en moins de 5 minutes.',
      ctaButton: 'Créer mon espace',
    },
    locale: {
      switchTo: 'Langue',
      fr: 'Français',
      en: 'English',
    },
  },
  en: {
    nav: {
      features: 'Features',
      pricing: 'Pricing',
      login: 'Sign in',
      signup: 'Get started free',
      dashboard: 'Dashboard',
    },
    landing: {
      badge: 'Multi-tenant · Self-hosted · Open',
      titleA: 'Post everywhere,',
      titleB: 'in one click',
      subtitle: 'Schedule and automate your publications on LinkedIn, Facebook, Instagram and TikTok from a single interface — for yourself or for your clients.',
      ctaPrimary: 'Get started free',
      ctaSecondary: 'See features',
      noCard: 'No credit card · 30-second signup',
      sectionTitle: 'Everything you need to manage multiple brands',
      f1Title: 'Multi-tenant native',
      f1Text: 'Create one workspace per client or brand, each with its own connected accounts and calendar.',
      f2Title: 'All networks + extensible',
      f2Text: 'LinkedIn, Facebook, Instagram, TikTok, X. Provider architecture: add YouTube, Bluesky, Threads…',
      f3Title: 'Reliable scheduling',
      f3Text: 'Redis/BullMQ queue, exponential retry, per-target status: a failure on one network doesn\'t block the others.',
      f4Title: 'Built-in AI',
      f4Text: 'Network-tailored hashtag suggestions, tone-aware rewriting, per-tenant brand voice — powered by Claude.',
      f5Title: 'Self-hosted',
      f5Text: 'One command on Ubuntu 24.04, Docker Compose, automatic HTTPS via Caddy. No SaaS lock-in.',
      f6Title: 'Public API',
      f6Text: 'Per-tenant API keys, OpenAPI documented. Plug in Zapier, n8n or your CMS in 30 seconds.',
      ctaTitle: 'Ready to try it?',
      ctaText: 'Create your workspace, connect your accounts, schedule your first post — in under 5 minutes.',
      ctaButton: 'Create my workspace',
    },
    locale: {
      switchTo: 'Language',
      fr: 'Français',
      en: 'English',
    },
  },
} as const;

export type Dictionary = (typeof dictionary)['fr'];

export const I18nContext = createContext<{ locale: Locale; t: Dictionary }>({
  locale: DEFAULT_LOCALE,
  t: dictionary[DEFAULT_LOCALE] as Dictionary,
});

export function useI18n() {
  return useContext(I18nContext);
}

export function readLocaleCookie(): Locale {
  if (typeof document === 'undefined') return DEFAULT_LOCALE;
  const m = document.cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  const v = m?.[1] as Locale | undefined;
  return v && LOCALES.includes(v) ? v : DEFAULT_LOCALE;
}

export function writeLocaleCookie(locale: Locale) {
  if (typeof document === 'undefined') return;
  document.cookie = `${COOKIE_NAME}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}
