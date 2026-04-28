import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Community — social publishing',
  description: 'Multi-tenant social media publishing dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
