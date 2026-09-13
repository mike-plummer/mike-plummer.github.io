import type { Metadata } from 'next';
import HeaderGeneric from '@/components/HeaderGeneric';
import { Icon } from '@/components/Icon';
import Layout from '@/components/Layout';
import { getAllConferences } from '@/lib/content';

export const metadata: Metadata = {
  title: 'Conferences',
  description: 'A list of conferences Mike has spoken at.'
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
                <Icon icon={conference.icon} className="icon major style5" />
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
