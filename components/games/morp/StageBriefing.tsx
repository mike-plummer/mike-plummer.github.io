'use client';

import { getStageMeta, getStageNumber, getStageObjectives } from '@/lib/games/morp/stage-meta';
import type { MorpState, StageId } from '@/lib/games/morp/types';

interface StageBriefingProps {
  state: MorpState;
  stage?: StageId;
  onAcknowledge?: () => void;
}

function StageConceptContext({ context }: { context: string }) {
  return (
    <div className="morp-briefing__context">
      <h3 className="morp-briefing__context-title">How This Works</h3>
      <p className="morp-briefing__context-text">{context}</p>
    </div>
  );
}

export default function StageBriefing({ state, stage, onAcknowledge }: StageBriefingProps) {
  const stageId = stage ?? state.stage;
  const meta = getStageMeta(stageId);
  const objectives = getStageObjectives(state);

  if (onAcknowledge) {
    return (
      <div className="morp-briefing-overlay" role="dialog" aria-labelledby="stage-briefing-heading" aria-modal="true">
        <div className="morp-briefing morp-briefing--modal">
          <p className="morp-briefing__stage">
            Stage {getStageNumber(stageId)} — {meta.label}
          </p>
          <h2 id="stage-briefing-heading" className="morp-briefing__title">
            Your Objective
          </h2>
          <p className="morp-briefing__objective">{meta.objective}</p>
          <StageConceptContext context={meta.conceptContext} />
          <button type="button" className="button morp-briefing__begin" onClick={onAcknowledge}>
            Begin Stage
          </button>
        </div>
      </div>
    );
  }

  return (
    <section className="morp-briefing" aria-labelledby="stage-briefing-heading">
      <h2 id="stage-briefing-heading" className="morp-briefing__title">
        Current Objective
      </h2>
      <p className="morp-briefing__objective">{meta.objective}</p>
      {objectives.length > 0 && (
        <ul className="morp-briefing__objectives">
          {objectives.map((objective) => (
            <li
              key={objective.label}
              className={`morp-briefing__objective-item${objective.complete ? ' morp-briefing__objective-item--complete' : ' morp-briefing__objective-item--incomplete'}`}
            >
              <span
                className="morp-briefing__objective-marker"
                aria-label={objective.complete ? 'Complete' : 'Incomplete'}
              >
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
