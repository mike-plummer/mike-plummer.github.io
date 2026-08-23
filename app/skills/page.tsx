import type { Metadata } from 'next';
import HeaderGeneric from '@/components/HeaderGeneric';
import Layout from '@/components/Layout';
import { getAllSkills } from '@/lib/content';
import { iconClassNames } from '@/lib/icons';

export const metadata: Metadata = {
  title: 'Skills',
  description: 'A description of the tools and technologies that Mike has experience with.',
};

export default async function SkillsPage() {
  const skills = await getAllSkills();

  return (
    <Layout>
      <HeaderGeneric title="Skills" />
      <div id="main">
        <section id="content" className="main">
          {skills.map((skill) => (
            <section key={skill.name}>
              <div className="spotlight">
                <div className="content">
                  <h1>{skill.name}</h1>
                  <div dangerouslySetInnerHTML={{ __html: skill.html }} />
                </div>
                <span className={iconClassNames(skill.icon, 'image icon major')} />
              </div>
            </section>
          ))}
        </section>
      </div>
    </Layout>
  );
}
