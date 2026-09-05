import { CHECKPOINT_KEY } from './config';
import type { MorpCheckpoint, StageId } from './types';

export function loadCheckpoint(): MorpCheckpoint | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(CHECKPOINT_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as MorpCheckpoint;
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
