'use client';

import { COPY } from '@/lib/games/morp/copy';
import { getStatusItemIdsRepairedByStage } from '@/lib/games/morp/modules/system-status';
import type { StageId } from '@/lib/games/morp/types';
import RepairStatusView from './RepairStatusView';

export type RepairStatusOverlayMode = 'intro' | 'transition' | 'manual';

interface RepairStatusOverlayProps {
  mode: RepairStatusOverlayMode;
  completedStages: StageId[];
  completedStage?: StageId;
  onContinue: () => void;
}

export default function RepairStatusOverlay({
  mode,
  completedStages,
  completedStage,
  onContinue
}: RepairStatusOverlayProps) {
  const highlightedItemIds =
    mode === 'transition' && completedStage ? getStatusItemIdsRepairedByStage(completedStage) : [];

  const title =
    mode === 'intro'
      ? COPY.systemStatus.introTitle
      : mode === 'transition'
        ? COPY.systemStatus.transitionTitle
        : COPY.systemStatus.manualTitle;

  const description =
    mode === 'intro'
      ? COPY.systemStatus.introDescription
      : mode === 'transition'
        ? COPY.systemStatus.transitionDescription
        : COPY.systemStatus.manualDescription;

  const continueLabel = mode === 'manual' ? COPY.systemStatus.closeLabel : COPY.systemStatus.continueLabel;

  return (
    <div className="morp-status-overlay" role="dialog" aria-labelledby="repair-status-heading" aria-modal="true">
      <div className="morp-status-overlay__panel">
        <p className="morp-status-overlay__eyebrow">{title}</p>
        <h2 id="repair-status-heading" className="morp-status-overlay__heading">
          {COPY.systemStatus.heading}
        </h2>
        <p className="morp-status-overlay__description">{description}</p>
        <RepairStatusView
          completedStages={completedStages}
          highlightedItemIds={highlightedItemIds}
          animate={mode === 'transition' && highlightedItemIds.length > 0}
        />
        <button type="button" className="button morp-status-overlay__continue" onClick={onContinue}>
          {continueLabel}
        </button>
      </div>
    </div>
  );
}
