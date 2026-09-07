import { COPY } from '../copy';
import { createInitialRefineState, patchRefine } from '../domain/state';
import { isRefineConfigCalibrated, REFINE_BROKEN_SAMPLING, REFINE_TOPICS } from '../modules/refine-sampling';
import { markStageInitialized } from '../modules/unlocks';
import type { StageDefinition } from '../types';

export const refineStage: StageDefinition = {
  id: 'refine',

  initialize(state) {
    return markStageInitialized(
      {
        ...state,
        stage: 'refine',
        refine: {
          ...createInitialRefineState(),
          refineTopic: REFINE_TOPICS[0]
        },
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
        return patchRefine(state, {
          refineTopic: action.topic,
          refineLastSummary: '',
          refineBrokenSummary: '',
          refineAttempted: false,
          refineRegeneratedAfterCalibration: false
        });
      case 'set-refine-sampling':
        return patchRefine(state, {
          refineSampling: { ...state.refine.refineSampling, ...action.sampling }
        });
      case 'reset-refine-sampling':
        return patchRefine(state, {
          refineSampling: { ...REFINE_BROKEN_SAMPLING }
        });
      case 'record-refine-generation': {
        const calibrated = isRefineConfigCalibrated(state.refine.refineSampling);
        const firstAttempt = !state.refine.refineAttempted;

        return {
          ...patchRefine(state, {
            refineAttempted: true,
            refineBrokenSummary: firstAttempt ? action.summary : state.refine.refineBrokenSummary,
            refineLastSummary: action.summary,
            refineRegeneratedAfterCalibration:
              state.refine.refineRegeneratedAfterCalibration || (state.refine.refineAttempted && calibrated)
          }),
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

  getContextualActions() {
    return [];
  },

  isComplete(state) {
    const refine = state.refine;
    return (
      refine.refineAttempted &&
      isRefineConfigCalibrated(refine.refineSampling) &&
      refine.refineRegeneratedAfterCalibration
    );
  },

  getDiagnosticReport() {
    return COPY.refine.report;
  }
};
