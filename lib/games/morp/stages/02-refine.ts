import { COPY } from '../copy';
import {
  isRefineConfigCalibrated,
  REFINE_BROKEN_SAMPLING,
  REFINE_TOPICS
} from '../modules/refine-sampling';
import { unlockSystem } from '../modules/unlocks';
import type { StageDefinition } from '../types';

export const refineStage: StageDefinition = {
  id: 'refine',
  concept: 'refine',

  initialize(state) {
    return unlockSystem(
      {
        ...state,
        stage: 'refine',
        refineTopic: REFINE_TOPICS[0],
        refineSampling: { ...REFINE_BROKEN_SAMPLING },
        refineAttempted: false,
        refineRegeneratedAfterCalibration: false,
        refineLastSummary: '',
        refineBrokenSummary: '',
        conversation: [
          ...state.conversation,
          ...COPY.refine.morpLines.map((content) => ({ role: 'assistant' as const, content }))
        ]
      },
      'refine'
    );
  },

  buildMessages() {
    // Summary generation is handled by handleRefineGenerate — not MORP chat/soul.
    return [];
  },

  processAction(action, state) {
    switch (action.type) {
      case 'set-refine-topic':
        return {
          ...state,
          refineTopic: action.topic,
          refineLastSummary: '',
          refineBrokenSummary: '',
          refineAttempted: false,
          refineRegeneratedAfterCalibration: false
        };
      case 'set-refine-sampling':
        return {
          ...state,
          refineSampling: { ...state.refineSampling, ...action.sampling }
        };
      case 'reset-refine-sampling':
        return {
          ...state,
          refineSampling: { ...REFINE_BROKEN_SAMPLING }
        };
      case 'record-refine-generation': {
        const calibrated = isRefineConfigCalibrated(state.refineSampling);
        const firstAttempt = !state.refineAttempted;

        return {
          ...state,
          refineAttempted: true,
          refineBrokenSummary: firstAttempt ? action.summary : state.refineBrokenSummary,
          refineLastSummary: action.summary,
          refineRegeneratedAfterCalibration:
            state.refineRegeneratedAfterCalibration || (state.refineAttempted && calibrated),
          conversation: [
            ...state.conversation,
            { role: 'user' as const, content: action.userPrompt },
            { role: 'assistant' as const, content: action.summary }
          ]
        };
      }
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
      state.refineAttempted &&
      isRefineConfigCalibrated(state.refineSampling) &&
      state.refineRegeneratedAfterCalibration
    );
  },

  getDiagnosticReport() {
    return COPY.refine.report;
  }
};
