import { CHECKPOINT_KEY } from './config';
import { getLaterStage, STAGE_ORDER } from './stage-meta';
import type { MorpCheckpoint, StageId } from './types';

const REMOVED_STAGES = new Set(['remember', 'intrusion', 'repair']);

function isValidStageId(stageId: string): stageId is StageId {
  return (STAGE_ORDER as readonly string[]).includes(stageId);
}

function migrateStageId(stageId: string): StageId | null {
  let migrated = stageId;

  if (stageId === 'boot') {
    migrated = 'training';
  } else if (stageId === 'remember' || stageId === 'intrusion' || stageId === 'amnesia') {
    migrated = 'context';
  } else if (stageId === 'repair' || stageId === 'recursion') {
    migrated = 'evals';
  }

  return isValidStageId(migrated) ? migrated : null;
}

export function migrateCheckpoint(checkpoint: MorpCheckpoint): MorpCheckpoint | null {
  const currentStage = migrateStageId(checkpoint.currentStage);
  if (!currentStage) {
    return null;
  }

  const completedStages: StageId[] = [];
  for (const stageId of checkpoint.completedStages) {
    if (REMOVED_STAGES.has(stageId)) {
      continue;
    }
    const migrated = migrateStageId(stageId);
    if (!migrated) {
      return null;
    }
    if (!completedStages.includes(migrated)) {
      completedStages.push(migrated);
    }
  }

  const furthestCandidates: StageId[] = [
    checkpoint.furthestStage ? migrateStageId(checkpoint.furthestStage) : currentStage,
    currentStage,
    ...completedStages
  ].filter((stageId): stageId is StageId => stageId !== null);

  if (furthestCandidates.length === 0) {
    return null;
  }

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

export function saveCheckpoint(completedStages: StageId[], currentStage: StageId, furthestStage: StageId) {
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
