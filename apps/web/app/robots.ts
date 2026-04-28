import type { MetadataRoute } from 'next';

const BASE = process.env.APP_URL || 'https://community.meoxa.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/dashboard', '/posts', '/accounts', '/onboarding', '/api/'] },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
