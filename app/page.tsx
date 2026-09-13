import type { Metadata } from 'next';
import Header from '@/components/Header';
import SiteLayout from '@/components/SiteLayout';
import StickyNav from '@/components/StickyNav';
import { AboutSection } from '@/components/sections/AboutSection';
import { BlogSection } from '@/components/sections/BlogSection';
import { ConferencesSection } from '@/components/sections/ConferencesSection';
import { EducationSection } from '@/components/sections/EducationSection';
import { ExperienceSection } from '@/components/sections/ExperienceSection';
import { SkillsSection } from '@/components/sections/SkillsSection';
import { StatsSection } from '@/components/sections/StatsSection';
import { getAllSkills } from '@/lib/content';
import { siteMetadata } from '@/lib/site';

export const metadata: Metadata = {
  title: siteMetadata.title,
  description: siteMetadata.description
};

export default async function Page() {
  const skills = await getAllSkills();

  return (
    <SiteLayout>
      <Header />
      <StickyNav />

      <main id="main">
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
          <ExperienceSection />
        </section>

        <section id="fourth" className="main special">
          <StatsSection />
        </section>

        <section id="fifth" className="main special">
          <ConferencesSection />
        </section>

        <section id="cta" className="main special">
          <BlogSection />
        </section>
      </main>
    </SiteLayout>
  );
}
