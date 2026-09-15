'use client';

import { useEffect, useState, type ReactNode } from 'react';

interface BodyWrapperProps {
  children: ReactNode;
}

export default function BodyWrapper({ children }: BodyWrapperProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const frameId = requestAnimationFrame(() => {
      timeoutId = setTimeout(() => setIsLoading(false), 100);
    });
    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(timeoutId);
    };
  }, []);

  return <div className={isLoading ? 'body is-loading' : 'body'}>{children}</div>;
}
