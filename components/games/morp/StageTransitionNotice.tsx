'use client';

import { getStageMeta } from '@/lib/games/morp/stage-meta';
import type { StageId } from '@/lib/games/morp/types';

interface StageTransitionNoticeProps {
  stage: StageId;
  onClose: () => void;
}

export default function StageTransitionNotice({ stage, onClose }: StageTransitionNoticeProps) {
  const meta = getStageMeta(stage);

  return (
    <div className="morp-transition" role="status" aria-live="polite">
      <div className="morp-transition__header">
        <p>
          <strong>Now entering:</strong> {meta.label}
        </p>
        <button
          type="button"
          className="button small alt morp-transition__close"
          onClick={onClose}
          aria-label="Dismiss stage transition notice"
        >
          DISMISS
        </button>
      </div>
      <p className="morp-transition__objective">{meta.objective}</p>
    </div>
  );
}
