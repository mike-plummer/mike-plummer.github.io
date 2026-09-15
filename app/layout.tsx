import '@/lib/fontawesome';
import type { Metadata, Viewport } from 'next';
import { Source_Sans_3 } from 'next/font/google';
import '@/styles/main.scss';
import { siteMetadata } from '@/lib/site';

const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  weight: ['300', '400'],
  display: 'swap',
  variable: '--font-source-sans'
});

export const metadata: Metadata = {
  metadataBase: new URL(siteMetadata.siteUrl),
  title: {
    default: siteMetadata.title,
    template: `%s | ${siteMetadata.title}`
  },
  description: siteMetadata.description,
  authors: [{ name: siteMetadata.author }],
  manifest: '/manifest.webmanifest'
};

export const viewport: Viewport = {
  themeColor: '#334b99'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-US" className={sourceSans.variable}>
      <body>{children}</body>
    </html>
  );
}
