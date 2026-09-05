import type { Metadata } from 'next';
import Footer from '@/components/Footer';
import MorpGame from '@/components/games/morp/MorpGame';
import HeaderGeneric from '@/components/HeaderGeneric';
import Layout from '@/components/Layout';
import { LLMProvider } from '@/components/llm/LLMProvider';
import { MORP_MODEL_ID } from '@/lib/games/morp/config';

export const metadata: Metadata = {
  title: 'MORP — Diagnostic Terminal',
  description:
    'Diagnose MORP, an experimental local language-model system. Learn how LLMs work through a retro terminal game. Runs entirely in your browser.'
};

export default function MorpPage() {
  return (
    <Layout>
      <HeaderGeneric
        title="MORP Diagnostic Terminal"
        subtitle="100% client-side. The model runs locally on your GPU."
      />
      <div id="main">
        <section className="main">
          <LLMProvider modelId={MORP_MODEL_ID}>
            <MorpGame />
          </LLMProvider>
        </section>
      </div>
    </Layout>
  );
}
