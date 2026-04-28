import type { Metadata } from 'next';
import './globals.css';
import { I18nProvider } from '@/components/i18n-provider';

export const metadata: Metadata = {
  metadataBase: new URL('https://community.meoxa.app'),
  title: {
    default: 'Community — publication automatisée multi-réseaux',
    template: '%s · Community',
  },
  description:
    'Programmez et automatisez vos publications sur LinkedIn, Facebook, Instagram et TikTok depuis une seule interface multi-tenant.',
  openGraph: {
    type: 'website',
    url: 'https://community.meoxa.app',
    siteName: 'Community',
    title: 'Community — publication automatisée multi-réseaux',
    description:
      'Programmez et automatisez vos publications sur LinkedIn, Facebook, Instagram et TikTok depuis une seule interface multi-tenant.',
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
