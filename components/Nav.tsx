'use client';

import { useEffect, useState } from 'react';
import Scroll from './Scroll';

const NAV_ITEMS = [
  ['intro', 'About'],
  ['first', 'Education'],
  ['second', 'Skills'],
  ['third', 'Stats'],
  ['fourth', 'Conferences'],
  ['cta', 'Blog']
] as const;

interface NavProps {
  sticky: boolean;
}

export default function Nav({ sticky }: NavProps) {
  const [activeSection, setActiveSection] = useState<string>('intro');

  useEffect(() => {
    const sectionIds = NAV_ITEMS.map(([id]) => id);
    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => section !== null);

    if (sections.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visibleEntries.length > 0) {
          setActiveSection(visibleEntries[0].target.id);
        }
      },
      {
        rootMargin: '-300px 0px -40% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1]
      }
    );

    for (const section of sections) {
      observer.observe(section);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <nav id="nav" className={sticky ? 'alt' : ''}>
      <ul>
        {NAV_ITEMS.map(([id, label]) => (
          <li key={id} className={activeSection === id ? 'is-active' : ''}>
            <Scroll type="id" element={id}>
              <a href="#">{label}</a>
            </Scroll>
          </li>
        ))}
      </ul>
    </nav>
  );
}
