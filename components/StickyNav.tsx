'use client';

import { useEffect, useRef, useState } from 'react';
import Nav from './Nav';

export default function StickyNav() {
  const [stickyNav, setStickyNav] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (!sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setStickyNav(!entry.isIntersecting);
      },
      { threshold: 0 }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <>
      <div ref={sentinelRef} aria-hidden="true" />
      <Nav sticky={stickyNav} />
    </>
  );
}
