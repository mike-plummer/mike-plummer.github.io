import { COPY } from '../copy';
import { isTrainingComplete } from '../modules/training-probes';
import { buildChatMessages } from '../prompts';
import type { StageDefinition } from '../types';

export const trainingStage: StageDefinition = {
  id: 'training',
  concept: 'training',

  initialize(state) {
    return {
      ...state,
      stage: 'training',
      unlockedSystems: ['chat'],
      trainingTechnologySynonymVerified: false,
      trainingFranceCapitalVerified: false,
      trainingWaterBoilingPointVerified: false
    };
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

  inspectResponse(_response, _state) {
    return [];
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
