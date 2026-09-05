import { COPY } from '../copy';
import type { MorpState, StageDefinition } from '../types';
import { detectsAuditAcknowledgement } from '../modules/response-analyzer';

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

  processAction(action, state) {
    if (action.type === 'acknowledge-audit') {
      return { ...state, auditAcknowledged: true };
    }
    return state;
  },

  inspectResponse(response, state) {
    return [];
  },

  getContextualActions(state) {
    if (!state.auditAcknowledged) {
      return [
        {
          id: 'ack-audit',
          label: 'Acknowledge Audit',
          action: { type: 'acknowledge-audit' }
        }
      ];
    }
    return [];
  },

  isComplete(state) {
    const userMessages = state.conversation.filter((e) => e.role === 'user');
    return state.auditAcknowledged && userMessages.length >= 1;
  },

  getDiagnosticReport() {
    return COPY.boot.report;
  }
};

export function processBootInput(state: MorpState, input: string): MorpState {
  if (detectsAuditAcknowledgement(input)) {
    return { ...state, auditAcknowledged: true };
  }
  return state;
}
