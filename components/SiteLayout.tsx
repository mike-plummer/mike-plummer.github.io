import type { ReactNode } from 'react';
import Footer from './Footer';

interface SiteLayoutProps {
  children: ReactNode;
}

export default function SiteLayout({ children }: SiteLayoutProps) {
  return (
    <div className="body is-loading">
      <div id="wrapper">
        {children}
        <Footer />
      </div>
    </div>
  );
}
