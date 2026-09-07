import type { MorpState, StageId } from '../types';

export function markStageInitialized(state: MorpState, stageId: StageId): MorpState {
  if (state.initializedStages.includes(stageId)) {
    return state;
  }
  return {
    ...state,
    initializedStages: [...state.initializedStages, stageId]
  };
}
