import { COPY } from '../copy';
import { createInitialTrainingState } from '../domain/state';
import { isTrainingComplete } from '../modules/training-probes';
import { markStageInitialized } from '../modules/unlocks';
import { buildChatMessages } from '../prompts';
import type { StageDefinition } from '../types';

export const trainingStage: StageDefinition = {
  id: 'training',

  initialize(state) {
    return markStageInitialized(
      {
        ...state,
        stage: 'training',
        training: createInitialTrainingState()
      },
      'training'
    );
  },

  buildMessages(state, input) {
    if (!input) {
      return [];
    }
    return buildChatMessages(state, input);
  },

  processAction(_action, state) {
    return state;
  },

  getContextualActions() {
    return [];
  },

  isComplete(state) {
    return isTrainingComplete(state);
  },

  getDiagnosticReport() {
    return COPY.training.report;
  }
};
