import type { ReactNode } from 'react';
import BodyWrapper from './BodyWrapper';
import Footer from './Footer';

interface SiteLayoutProps {
  children: ReactNode;
}

export default function SiteLayout({ children }: SiteLayoutProps) {
  return (
    <BodyWrapper>
      <div id="wrapper">
        {children}
        <Footer />
      </div>
    </BodyWrapper>
  );
}
