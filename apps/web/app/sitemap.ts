import type { MetadataRoute } from 'next';

const BASE = process.env.APP_URL || 'https://community.meoxa.app';
const PUBLIC_PATHS = ['', '/features', '/pricing', '/legal/terms', '/legal/privacy', '/login', '/register'];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return PUBLIC_PATHS.map((path) => ({
    url: `${BASE}${path || '/'}`,
    lastModified: now,
    changeFrequency: path === '' ? 'weekly' : 'monthly',
    priority: path === '' ? 1 : path.startsWith('/legal') ? 0.3 : 0.7,
  }));
}
