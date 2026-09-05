import { COPY } from '../copy';
import type { StageDefinition } from '../types';

export const bootStage: StageDefinition = {
  id: 'boot',
  concept: 'boot',

  initialize(state) {
    return {
      ...state,
      stage: 'boot',
      unlockedSystems: ['chat'],
      conversation: COPY.boot.morpOpening.map((content) => ({
        role: 'assistant' as const,
        content
      }))
    };
  },

  buildMessages(state, input) {
    if (!input) {
      return [];
    }
    return [
      {
        role: 'system' as const,
        content:
          'You are MORP, a diagnostic AI who believes something is wrong. Be curious, polite, slightly sarcastic. Keep responses brief.'
      },
      ...state.conversation
        .filter((e) => e.role !== 'system')
        .map((e) => ({ role: e.role as 'user' | 'assistant', content: e.content })),
      { role: 'user' as const, content: input }
    ];
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
    const userMessages = state.conversation.filter((e) => e.role === 'user');
    return userMessages.length >= 1;
  },

  getDiagnosticReport() {
    return COPY.boot.report;
  }
};
