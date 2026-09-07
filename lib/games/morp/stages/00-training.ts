import { COPY } from '../copy';
import { createInitialTrainingState, patchTraining } from '../domain/state';
import { isTrainingComplete, TRAINING_PROBES } from '../modules/training-probes';
import { markStageInitialized } from '../modules/unlocks';
import { buildChatMessages } from '../prompts';
import type { ContextualAction, MorpState, StageAction, StageDefinition } from '../types';

function processTrainingAction(action: StageAction, state: MorpState): MorpState {
  if (action.type !== 'enter-training-question') {
    return state;
  }

  const probe = TRAINING_PROBES[action.index - 1];
  if (!probe) {
    return state;
  }

  const training = state.training;
  if (training[probe.id] || training.trainingActiveQuestion !== null) {
    return state;
  }

  return patchTraining(state, { trainingActiveQuestion: action.index });
}

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

  processAction(action, state) {
    return processTrainingAction(action, state);
  },

  getContextualActions(state) {
    const training = state.training;
    const active = training.trainingActiveQuestion;

    return TRAINING_PROBES.map((probe, index) => {
      const questionIndex = index + 1;
      const asked = training[probe.id];

      return {
        id: `training-question-${questionIndex}`,
        label: `Enter Question ${questionIndex}`,
        disabled: asked || (active !== null && active !== questionIndex),
        action: { type: 'enter-training-question', index: questionIndex }
      } satisfies ContextualAction;
    });
  },

  isComplete(state) {
    return isTrainingComplete(state);
  },

  getDiagnosticReport() {
    return COPY.training.report;
  }
};
