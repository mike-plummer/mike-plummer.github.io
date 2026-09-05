'use client';

import { getNextStageMeta, getStageMeta } from '@/lib/games/morp/stage-meta';
import type { StageId } from '@/lib/games/morp/types';

interface StageCompleteBannerProps {
  stage: StageId;
  objectivesMet: boolean;
  onAdvance: () => void;
}

export default function StageCompleteBanner({ stage, objectivesMet, onAdvance }: StageCompleteBannerProps) {
  const meta = getStageMeta(stage);
  const nextMeta = getNextStageMeta(stage);
  const proceedLabel = nextMeta ? `Proceed to ${nextMeta.label}` : 'Complete Diagnostic';
  const advanceLabel = nextMeta
    ? `Review Diagnostic & Advance to ${nextMeta.label}`
    : 'Review Diagnostic & Complete Audit';

  return (
    <footer
      className={`morp-stage-complete${objectivesMet ? ' morp-stage-complete--ready' : ''}`}
      aria-live="polite"
    >
      <div className="morp-stage-complete__content">
        {objectivesMet ? (
          <>
            <h2 className="morp-stage-complete__title">Stage Complete: {meta.label}</h2>
            <p className="morp-stage-complete__hint">{meta.completionHint}</p>
            {nextMeta && (
              <p className="morp-stage-complete__next">
                Next stage: <strong>{nextMeta.label}</strong>
              </p>
            )}
          </>
        ) : (
          <p className="morp-stage-complete__hint">Complete all objectives to proceed to the next stage.</p>
        )}
      </div>
      <button
        type="button"
        className="button morp-stage-complete__button"
        onClick={onAdvance}
        disabled={!objectivesMet}
      >
        {objectivesMet ? advanceLabel : proceedLabel}
      </button>
    </footer>
  );
}
