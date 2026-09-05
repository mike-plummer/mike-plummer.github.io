'use client';

import { getObjectiveProgress, getStageMeta } from '@/lib/games/morp/stage-meta';
import type { MorpState } from '@/lib/games/morp/types';

interface StageBriefingProps {
  state: MorpState;
}

export default function StageBriefing({ state }: StageBriefingProps) {
  const meta = getStageMeta(state.stage);
  const progress = getObjectiveProgress(state);

  return (
    <section className="morp-briefing" aria-labelledby="stage-briefing-heading">
      <h2 id="stage-briefing-heading" className="morp-briefing__title">
        Current Objective
      </h2>
      <p className="morp-briefing__objective">{meta.objective}</p>
      {progress && (
        <p className={`morp-briefing__progress${state.stageObjectivesMet ? ' morp-briefing__progress--met' : ''}`}>
          {state.stageObjectivesMet ? '✓ Objectives met' : `Progress: ${progress}`}
        </p>
      )}
    </section>
  );
}
