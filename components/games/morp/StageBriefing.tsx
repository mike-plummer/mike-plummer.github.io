'use client';

import { getStageMeta, getStageNumber, getStageObjectives } from '@/lib/games/morp/stage-meta';
import type { MorpState } from '@/lib/games/morp/types';

interface StageBriefingProps {
  state: MorpState;
  acknowledged: boolean;
  expanded: boolean;
  onAcknowledge: () => void;
  onToggleExpanded: () => void;
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

function StageSuggestions({ suggestions }: { suggestions: string[] }) {
  return (
    <ul className="morp-briefing__suggestions-list">
      {suggestions.map((suggestion) => (
        <li key={suggestion}>{suggestion}</li>
      ))}
    </ul>
  );
}

function StageObjectiveContent({
  objective,
  objectives,
  suggestions
}: {
  objective: string;
  objectives: ReturnType<typeof getStageObjectives>;
  suggestions?: string[];
}) {
  return (
    <>
      <p className="morp-briefing__section-text">{objective}</p>
      {objectives.length > 0 && (
        <ul className="morp-briefing__objectives">
          {objectives.map((item) => (
            <li
              key={item.label}
              className={`morp-briefing__objective-item${item.complete ? ' morp-briefing__objective-item--complete' : ' morp-briefing__objective-item--incomplete'}`}
            >
              <span className="morp-briefing__objective-marker" aria-hidden="true">
                {item.complete ? '✓' : '✗'}
              </span>
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      )}
      {suggestions && suggestions.length > 0 && (
        <div className="morp-briefing__suggestions">
          <p className="morp-briefing__suggestions-label">Try this</p>
          <StageSuggestions suggestions={suggestions} />
        </div>
      )}
    </>
  );
}

export default function StageBriefing({
  state,
  acknowledged,
  expanded,
  onAcknowledge,
  onToggleExpanded
}: StageBriefingProps) {
  const meta = getStageMeta(state.stage);
  const objectives = getStageObjectives(state);
  const stageLabel = `Stage ${getStageNumber(state.stage)} — ${meta.label}`;

  if (!acknowledged) {
    return (
      <section className="morp-briefing morp-briefing--intro" aria-labelledby="stage-briefing-context">
        <p className="morp-briefing__stage">{stageLabel}</p>
        <BriefingSection title="How This Works" titleId="stage-briefing-context">
          <p className="morp-briefing__section-text">{meta.conceptContext}</p>
        </BriefingSection>
        <BriefingSection title="Your Objective" titleId="stage-briefing-heading">
          <StageObjectiveContent objective={meta.objective} objectives={[]} suggestions={meta.suggestions} />
        </BriefingSection>
        <button type="button" className="button morp-briefing__begin" onClick={onAcknowledge}>
          Begin Stage
        </button>
      </section>
    );
  }

  if (!expanded) {
    return (
      <section className="morp-briefing morp-briefing--collapsed" aria-label="Stage briefing">
        <button type="button" className="morp-briefing__toggle" onClick={onToggleExpanded} aria-expanded={false}>
          <span className="morp-briefing__toggle-label">{stageLabel}</span>
          <span className="morp-briefing__toggle-hint">Show briefing</span>
        </button>
      </section>
    );
  }

  return (
    <section className="morp-briefing morp-briefing--reference" aria-labelledby="stage-briefing-context">
      <div className="morp-briefing__header">
        <p className="morp-briefing__stage">{stageLabel}</p>
        <button
          type="button"
          className="button small alt morp-briefing__collapse"
          onClick={onToggleExpanded}
          aria-expanded
        >
          Hide briefing
        </button>
      </div>
      <BriefingSection title="How This Works" titleId="stage-briefing-context">
        <p className="morp-briefing__section-text">{meta.conceptContext}</p>
      </BriefingSection>
      <BriefingSection title="Your Objective" titleId="stage-briefing-heading">
        <StageObjectiveContent objective={meta.objective} objectives={objectives} suggestions={meta.suggestions} />
      </BriefingSection>
    </section>
  );
}
