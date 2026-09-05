'use client';

import { getNextStageMeta, getStageMeta } from '@/lib/games/morp/stage-meta';
import type { StageId } from '@/lib/games/morp/types';

interface StageCompleteBannerProps {
  stage: StageId;
  onAdvance: () => void;
}

export default function StageCompleteBanner({ stage, onAdvance }: StageCompleteBannerProps) {
  const meta = getStageMeta(stage);
  const nextMeta = getNextStageMeta(stage);
  const advanceLabel = nextMeta
    ? `Review Diagnostic & Advance to ${nextMeta.label}`
    : 'Review Diagnostic & Complete Audit';

  return (
    <section className="morp-stage-complete" role="status" aria-live="polite">
      <div className="morp-stage-complete__content">
        <h2 className="morp-stage-complete__title">Stage Complete: {meta.label}</h2>
        <p className="morp-stage-complete__hint">{meta.completionHint}</p>
        {nextMeta && (
          <p className="morp-stage-complete__next">
            Next stage: <strong>{nextMeta.label}</strong>
          </p>
        )}
      </div>
      <button type="button" className="button morp-stage-complete__button" onClick={onAdvance}>
        {advanceLabel}
      </button>
    </section>
  );
}
