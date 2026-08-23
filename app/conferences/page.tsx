import type { Metadata } from 'next';
import HeaderGeneric from '@/components/HeaderGeneric';
import Layout from '@/components/Layout';
import { getAllConferences } from '@/lib/content';
import { iconClassNames } from '@/lib/icons';

export const metadata: Metadata = {
  title: 'Conferences',
  description: 'A list of conferences Mike has spoken at.',
};

export default async function ConferencesPage() {
  const conferences = await getAllConferences();

  return (
    <Layout>
      <HeaderGeneric title="Conferences" />
      <div id="main">
        <section id="content" className="main">
          <ul className="features">
            {conferences.map((conference) => (
              <li key={conference.order}>
                <span className={iconClassNames(conference.icon, 'icon major style5')} />
                <h3>{conference.name}</h3>
                <div dangerouslySetInnerHTML={{ __html: conference.html }} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Layout>
  );
}
