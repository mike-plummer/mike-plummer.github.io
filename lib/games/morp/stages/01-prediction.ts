import { COPY } from '../copy';
import { createInitialPredictionState, patchPrediction } from '../domain/state';
import { formatTokenForAppend } from '../modules/token-simulator';
import { markStageInitialized } from '../modules/unlocks';
import type { StageDefinition } from '../types';

export const predictionStage: StageDefinition = {
  id: 'prediction',

  initialize(state) {
    return markStageInitialized(
      {
        ...state,
        stage: 'prediction',
        prediction: {
          ...createInitialPredictionState(),
          predictionInput: 'The most popular language'
        }
      },
      'prediction'
    );
  },

  buildMessages() {
    return [];
  },

  processAction(action, state) {
    switch (action.type) {
      case 'set-prediction-input':
        return patchPrediction(state, {
          predictionInput: action.value,
          predictionCandidates: [],
          predictionSelected: null,
          predictionLastSampledPercent: null
        });
      case 'set-temperature':
        return patchPrediction(state, { predictionTemperature: action.value });
      case 'accept-prediction-token':
        return patchPrediction(state, {
          predictionInput: state.prediction.predictionInput + formatTokenForAppend(action.token, action.rawToken),
          predictionSelected: action.token,
          predictionLastSampledPercent: action.percent,
          predictionCandidates: [],
          predictionHasAcceptedToken: true
        });
      case 'set-prediction-candidates':
        return patchPrediction(state, {
          predictionCandidates: action.candidates,
          predictionHasLowTemp: state.prediction.predictionHasLowTemp || state.prediction.predictionTemperature <= 0.4,
          predictionHasHighTemp: state.prediction.predictionHasHighTemp || state.prediction.predictionTemperature >= 1.0
        });
      default:
        return state;
    }
  },

  getContextualActions() {
    return [];
  },

  isComplete(state) {
    const prediction = state.prediction;
    return prediction.predictionHasAcceptedToken && prediction.predictionHasLowTemp && prediction.predictionHasHighTemp;
  },

  getDiagnosticReport() {
    return COPY.prediction.report;
  }
};
