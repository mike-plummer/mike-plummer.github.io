'use client';

import { COPY } from '@/lib/games/morp/copy';

interface GameIntroBriefingProps {
  onAcknowledge: () => void;
}

function BriefingSection({ title, titleId, children }: { title: string; titleId?: string; children: React.ReactNode }) {
  return (
    <div className="morp-briefing__section">
      <h3 id={titleId} className="morp-briefing__section-title">
        {title}
      </h3>
      <div className="morp-briefing__section-body">{children}</div>
    </div>
  );
}

export default function GameIntroBriefing({ onAcknowledge }: GameIntroBriefingProps) {
  const { eyebrow, title, sections, beginLabel } = COPY.gameIntro;

  return (
    <section className="morp-briefing morp-briefing--intro morp-briefing--game-intro" aria-labelledby="game-intro-heading">
      <p className="morp-briefing__stage">{eyebrow}</p>
      <h2 id="game-intro-heading" className="morp-briefing__game-title">
        {title}
      </h2>
      {sections.map((section, index) => (
        <BriefingSection key={section.title} title={section.title} titleId={`game-intro-section-${index}`}>
          <p className="morp-briefing__section-text">{section.body}</p>
        </BriefingSection>
      ))}
      <button type="button" className="button morp-briefing__begin" onClick={onAcknowledge}>
        {beginLabel}
      </button>
    </section>
  );
}
