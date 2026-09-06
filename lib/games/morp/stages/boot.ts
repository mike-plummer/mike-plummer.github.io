import { COPY } from '../copy';
import { buildChatMessages } from '../prompts';
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
    const userMessages = state.conversation.filter((e) => e.role === 'user');
    return userMessages.length >= 1;
  },

  getDiagnosticReport() {
    return COPY.boot.report;
  }
};
