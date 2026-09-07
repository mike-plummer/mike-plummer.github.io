'use client';

import { COPY } from '@/lib/games/morp/copy';
import { getOverallMorpStatus } from '@/lib/games/morp/modules/system-status';
import {
  getStageMeta,
  getStageNumber,
  isStageAtOrBefore,
  resolveFurthestStage,
  STAGE_ORDER
} from '@/lib/games/morp/stage-meta';
import type { StageId } from '@/lib/games/morp/types';

interface StageProgressProps {
  currentStage: StageId;
  completedStages: StageId[];
  furthestStage: StageId;
  onStageSelect?: (stageId: StageId) => void;
  onStatusOpen?: () => void;
  disabled?: boolean;
}

export default function StageProgress({
  currentStage,
  completedStages,
  furthestStage,
  onStageSelect,
  onStatusOpen,
  disabled = false
}: StageProgressProps) {
  const currentNumber = getStageNumber(currentStage);
  const reachableStage = resolveFurthestStage({
    furthestStage,
    stage: currentStage,
    completedStages
  });
  const overallStatus = getOverallMorpStatus(completedStages);
  const statusNeedsAttention = overallStatus !== 'OPERATIONAL';

  return (
    <nav className="morp-progress" aria-label="Diagnostic stage progress">
      <div className="morp-progress__main">
        <ol className="morp-progress__list">
          {STAGE_ORDER.map((stageId, index) => {
            const meta = getStageMeta(stageId);
            const isComplete = completedStages.includes(stageId);
            const isCurrent = stageId === currentStage;
            const isReached = isStageAtOrBefore(stageId, reachableStage);
            const isUpcoming = !isReached;
            const isNavigable = isReached && !isCurrent && onStageSelect;

            const itemClassName = [
              'morp-progress__item',
              isCurrent && 'morp-progress__item--current',
              isComplete && 'morp-progress__item--complete',
              isReached && !isComplete && 'morp-progress__item--reached',
              isUpcoming && 'morp-progress__item--upcoming',
              isNavigable && 'morp-progress__item--navigable'
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <li key={stageId} aria-current={isCurrent ? 'step' : undefined}>
                {isNavigable ? (
                  <button
                    type="button"
                    className={itemClassName}
                    onClick={() => onStageSelect(stageId)}
                    disabled={disabled}
                    aria-label={`Go to ${meta.label}`}
                  >
                    <span className="morp-progress__number">{index + 1}</span>
                    <span className="morp-progress__label">{meta.shortLabel}</span>
                  </button>
                ) : (
                  <span className={itemClassName}>
                    <span className="morp-progress__number">{index + 1}</span>
                    <span className="morp-progress__label">{meta.shortLabel}</span>
                  </span>
                )}
              </li>
            );
          })}
        </ol>
        {onStatusOpen && (
          <button
            type="button"
            className={`morp-progress__status${statusNeedsAttention ? ' morp-progress__status--attention' : ''}`}
            onClick={onStatusOpen}
            disabled={disabled}
            aria-label={`Open ${COPY.systemStatus.heading.toLowerCase()}`}
          >
            {COPY.systemStatus.heading}
          </button>
        )}
      </div>
      <p className="morp-progress__current">
        Stage {currentNumber} of {STAGE_ORDER.length}: <strong>{getStageMeta(currentStage).label}</strong>
      </p>
    </nav>
  );
}
