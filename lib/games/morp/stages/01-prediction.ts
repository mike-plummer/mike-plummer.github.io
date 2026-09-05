import { COPY } from '../copy';
import { formatTokenForAppend } from '../modules/token-simulator';
import { unlockSystem } from '../modules/unlocks';
import type { MorpState, StageDefinition } from '../types';

function withTemperatureFlags(state: MorpState, temperature: number): MorpState {
  return {
    ...state,
    predictionTemperature: temperature,
    predictionHasLowTemp: state.predictionHasLowTemp || temperature <= 0.4,
    predictionHasHighTemp: state.predictionHasHighTemp || temperature >= 1.0
  };
}

export const predictionStage: StageDefinition = {
  id: 'prediction',
  concept: 'prediction',

  initialize(state) {
    return unlockSystem(
      {
        ...state,
        stage: 'prediction',
        predictionInput: 'The capital of France is',
        predictionCandidates: [],
        predictionSelected: null,
        predictionLastSampledPercent: null,
        predictionTemperature: 0.7,
        predictionHasAcceptedToken: false,
        predictionHasLowTemp: false,
        predictionHasHighTemp: false
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
        return {
          ...state,
          predictionInput: action.value,
          predictionCandidates: [],
          predictionSelected: null,
          predictionLastSampledPercent: null
        };
      case 'set-temperature':
        return withTemperatureFlags(state, action.value);
      case 'accept-prediction-token':
        return {
          ...state,
          predictionInput:
            state.predictionInput + formatTokenForAppend(action.token, action.rawToken),
          predictionSelected: action.token,
          predictionLastSampledPercent: action.percent,
          predictionCandidates: [],
          predictionHasAcceptedToken: true
        };
      case 'set-prediction-candidates':
        return {
          ...state,
          predictionCandidates: action.candidates
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
    return (
      state.predictionHasAcceptedToken &&
      state.predictionHasLowTemp &&
      state.predictionHasHighTemp
    );
  },

  getDiagnosticReport() {
    return COPY.prediction.report;
  }
};
