import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Metadata } from 'next';
import Footer from '@/components/Footer';
import HeaderGeneric from '@/components/HeaderGeneric';
import Layout from '@/components/Layout';
import { LLMProvider } from '@/components/llm/LLMProvider';
import JobMatchTool from '@/components/tools/JobMatchTool';
import type { ProfileContext } from '@/lib/profile/types';

export const metadata: Metadata = {
  title: 'Job Match',
  description: 'Evaluate how well Mike matches a job posting using a local in-browser model.'
};

function loadProfile(): ProfileContext {
  const filePath = path.join(process.cwd(), 'public/data/profile-context.json');
  return JSON.parse(readFileSync(filePath, 'utf8')) as ProfileContext;
}

export default function JobMatchPage() {
  const profile = loadProfile();

  return (
    <Layout>
      <HeaderGeneric
        title="Job Match"
        subtitle="Paste a job posting and compare it against Mike's profile. Runs entirely in your browser."
      />
      <div id="main">
        <section className="main">
          <LLMProvider>
            <JobMatchTool profile={profile} />
          </LLMProvider>
        </section>
      </div>
      <Footer />
    </Layout>
  );
}
