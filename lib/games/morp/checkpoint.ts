import { CHECKPOINT_KEY } from './config';
import { getLaterStage } from './stage-meta';
import type { MorpCheckpoint, StageId } from './types';

const REMOVED_STAGES = new Set(['remember', 'intrusion', 'repair']);

function migrateStageId(stageId: string): StageId {
  if (stageId === 'boot') {
    return 'training';
  }
  if (stageId === 'remember' || stageId === 'intrusion' || stageId === 'amnesia') {
    return 'context';
  }
  if (stageId === 'repair') {
    return 'recursion';
  }
  return stageId as StageId;
}

export function migrateCheckpoint(checkpoint: MorpCheckpoint): MorpCheckpoint {
  const completedStages = [
    ...new Set(
      checkpoint.completedStages
        .filter((stageId) => !REMOVED_STAGES.has(stageId))
        .map((stageId) => migrateStageId(stageId))
    )
  ];

  const currentStage = migrateStageId(checkpoint.currentStage);
  const furthestCandidates = [
    checkpoint.furthestStage ? migrateStageId(checkpoint.furthestStage) : currentStage,
    currentStage,
    ...completedStages
  ];

  const furthestStage = furthestCandidates.reduce(
    (latest, stageId) => getLaterStage(latest, stageId),
    'training' as StageId
  );

  return { completedStages, currentStage, furthestStage };
}

export function loadCheckpoint(): MorpCheckpoint | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(CHECKPOINT_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as MorpCheckpoint & {
      currentStage: string;
      completedStages: string[];
      furthestStage?: string;
    };
    return migrateCheckpoint(parsed);
  } catch {
    return null;
  }
}

export function saveCheckpoint(
  completedStages: StageId[],
  currentStage: StageId,
  furthestStage: StageId
) {
  if (typeof window === 'undefined') {
    return;
  }

  const checkpoint: MorpCheckpoint = { completedStages, currentStage, furthestStage };
  window.localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(checkpoint));
}

export function clearCheckpoint() {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(CHECKPOINT_KEY);
}
