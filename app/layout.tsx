import { GoogleTagManager } from '@next/third-parties/google';
import type { Metadata, Viewport } from 'next';
import 'font-awesome/css/font-awesome.css';
import 'prismjs/themes/prism-okaidia.css';
import '@/styles/main.scss';
import { siteMetadata } from '@/lib/site';

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
    <html lang="en-US">
      <body>
        {children}
        <GoogleTagManager gtmId={siteMetadata.gtmId} />
      </body>
    </html>
  );
}
