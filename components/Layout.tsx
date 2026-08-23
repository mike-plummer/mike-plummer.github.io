'use client';

import { type ReactNode, useEffect, useState } from 'react';
import Footer from './Footer';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [loading, setLoading] = useState('is-loading');

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setLoading('');
    }, 100);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div className={`body ${loading}`}>
      <div id="wrapper">
        {children}
        <Footer />
      </div>
    </div>
  );
}
