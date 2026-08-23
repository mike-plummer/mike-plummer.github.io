'use client';

import { useEffect, useRef, useState } from 'react';
import type { Skill } from '@/lib/types';
import Header from './Header';
import Layout from './Layout';
import Nav from './Nav';
import { AboutSection } from './sections/AboutSection';
import { BlogSection } from './sections/BlogSection';
import { ConferencesSection } from './sections/ConferencesSection';
import { EducationSection } from './sections/EducationSection';
import { SkillsSection } from './sections/SkillsSection';
import { StatsSection } from './sections/StatsSection';

interface HomePageProps {
  skills: Skill[];
}

export default function HomePage({ skills }: HomePageProps) {
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
    <Layout>
      <Header />
      <div ref={sentinelRef} aria-hidden="true" />
      <Nav sticky={stickyNav} />

      <div id="main">
        <section id="intro" className="main">
          <AboutSection />
        </section>

        <section id="first" className="main special">
          <EducationSection />
        </section>

        <section id="second" className="main special">
          <SkillsSection skills={skills} />
        </section>

        <section id="third" className="main special">
          <StatsSection />
        </section>

        <section id="fourth" className="main special">
          <ConferencesSection />
        </section>

        <section id="cta" className="main special">
          <BlogSection />
        </section>
      </div>
    </Layout>
  );
}
