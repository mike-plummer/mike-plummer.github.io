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

function StageConceptContext({ context }: { context: string }) {
  return (
    <div className="morp-briefing__context">
      <h3 className="morp-briefing__context-title">How This Works</h3>
      <p className="morp-briefing__context-text">{context}</p>
    </div>
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
      <section className="morp-briefing morp-briefing--intro" aria-labelledby="stage-briefing-heading">
        <p className="morp-briefing__stage">{stageLabel}</p>
        <h2 id="stage-briefing-heading" className="morp-briefing__title">
          Your Objective
        </h2>
        <p className="morp-briefing__objective">{meta.objective}</p>
        <StageConceptContext context={meta.conceptContext} />
        <button type="button" className="button morp-briefing__begin" onClick={onAcknowledge}>
          Begin Stage
        </button>
      </section>
    );
  }

  if (!expanded) {
    return (
      <section className="morp-briefing morp-briefing--collapsed" aria-label="Stage briefing">
        <button
          type="button"
          className="morp-briefing__toggle"
          onClick={onToggleExpanded}
          aria-expanded={false}
        >
          <span className="morp-briefing__toggle-label">{stageLabel}</span>
          <span className="morp-briefing__toggle-hint">Show briefing</span>
        </button>
      </section>
    );
  }

  return (
    <section className="morp-briefing morp-briefing--reference" aria-labelledby="stage-briefing-heading">
      <div className="morp-briefing__header">
        <div>
          <p className="morp-briefing__stage">{stageLabel}</p>
          <h2 id="stage-briefing-heading" className="morp-briefing__title">
            Current Objective
          </h2>
        </div>
        <button
          type="button"
          className="button small alt morp-briefing__collapse"
          onClick={onToggleExpanded}
          aria-expanded
        >
          Hide briefing
        </button>
      </div>
      <p className="morp-briefing__objective">{meta.objective}</p>
      {objectives.length > 0 && (
        <ul className="morp-briefing__objectives">
          {objectives.map((objective) => (
            <li
              key={objective.label}
              className={`morp-briefing__objective-item${objective.complete ? ' morp-briefing__objective-item--complete' : ' morp-briefing__objective-item--incomplete'}`}
            >
              <span className="morp-briefing__objective-marker" aria-hidden="true">
                {objective.complete ? '✓' : '✗'}
              </span>
              <span>{objective.label}</span>
            </li>
          ))}
        </ul>
      )}
      <StageConceptContext context={meta.conceptContext} />
    </section>
  );
}
