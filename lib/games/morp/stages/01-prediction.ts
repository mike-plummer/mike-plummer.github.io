import { COPY } from '../copy';
import { unlockSystem } from '../modules/unlocks';
import { getTopCandidate, simulateTokenCandidates } from '../modules/token-simulator';
import type { MorpState, StageDefinition } from '../types';

export const predictionStage: StageDefinition = {
  id: 'prediction',
  concept: 'prediction',

  initialize(state) {
    const candidates = simulateTokenCandidates('The capital of France is');
    return unlockSystem(
      {
        ...state,
        stage: 'prediction',
        predictionInput: 'The capital of France is',
        predictionCandidates: candidates,
        predictionSelected: getTopCandidate(candidates),
        predictionTemperature: 0.7,
        predictionExperiments: 0
      },
      'prediction'
    );
  },

  buildMessages(state) {
    return [];
  },

  processAction(action, state) {
    switch (action.type) {
      case 'set-prediction-input': {
        const candidates = simulateTokenCandidates(action.value);
        return {
          ...state,
          predictionInput: action.value,
          predictionCandidates: candidates,
          predictionSelected: getTopCandidate(candidates),
          predictionGenerated: ''
        };
      }
      case 'set-temperature':
        return { ...state, predictionTemperature: action.value };
      case 'generate-token':
      case 'generate-tokens':
        return {
          ...state,
          predictionExperiments: state.predictionExperiments + 1,
          predictionSelected: getTopCandidate(state.predictionCandidates)
        };
      default:
        return state;
    }
  },

  inspectResponse() {
    return [];
  },

  getContextualActions() {
    return [];
  },

  isComplete(state) {
    return state.predictionExperiments >= 2;
  },

  getDiagnosticReport() {
    return COPY.prediction.report;
  }
};
