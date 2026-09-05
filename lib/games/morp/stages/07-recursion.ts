import { COPY } from '../copy';
import { unlockSystem } from '../modules/unlocks';
import type { MorpState, StageDefinition } from '../types';

export const recursionStage: StageDefinition = {
  id: 'recursion',
  concept: 'recursion',

  initialize(state) {
    return unlockSystem(
      {
        ...state,
        stage: 'recursion',
        recursionDepth: 0,
        recursionLimit: 3,
        recursionNodes: [],
        recursionRunning: false,
        recursionFailed: false,
        recursionCompleted: false,
        computationLevel: 0,
        conversation: [
          ...state.conversation,
          { role: 'assistant' as const, content: COPY.recursion.morpOffer }
        ]
      },
      'recursion'
    );
  },

  buildMessages(state, input) {
    if (!input) {
      return [];
    }
    return [
      { role: 'system' as const, content: 'You are MORP. Respond briefly.' },
      { role: 'user' as const, content: input }
    ];
  },

  processAction(action, state) {
    switch (action.type) {
      case 'set-recursion-limit':
        return { ...state, recursionLimit: action.value };
      case 'start-recursion':
        return { ...state, recursionRunning: true, recursionNodes: [] };
      default:
        return state;
    }
  },

  inspectResponse() {
    return [];
  },

  getContextualActions(state) {
    if (state.recursionCompleted || state.recursionFailed) {
      return [];
    }
    return [
      { id: 'depth-1', label: 'Depth: 1', action: { type: 'set-recursion-limit', value: 1 } },
      { id: 'depth-3', label: 'Depth: 3', action: { type: 'set-recursion-limit', value: 3 } },
      { id: 'depth-5', label: 'Depth: 5', action: { type: 'set-recursion-limit', value: 5 } },
      { id: 'depth-10', label: 'Depth: 10', action: { type: 'set-recursion-limit', value: 10 } },
      { id: 'depth-inf', label: 'Depth: ∞', action: { type: 'set-recursion-limit', value: null } },
      { id: 'start', label: 'Start Recursion', action: { type: 'start-recursion' } }
    ];
  },

  isComplete(state) {
    return state.recursionCompleted || (state.recursionFailed && state.recursionLimit !== null);
  },

  getDiagnosticReport() {
    return COPY.recursion.report;
  }
};
