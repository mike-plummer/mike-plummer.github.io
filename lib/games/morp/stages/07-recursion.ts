import { COPY } from '../copy';
import {
  isReviewChainRequest,
  REVIEW_LIMIT_REQUIRED_REPLY,
  REVIEW_START_REPLY
} from '../modules/incident-review-chain';
import { buildChatMessages } from '../prompts';
import { unlockSystem } from '../modules/unlocks';
import type { MorpState, StageDefinition } from '../types';

export interface RecursionInputResult {
  state: MorpState;
  skipLlm: boolean;
  scriptedResponse?: string;
  triggerChain?: boolean;
}

export const recursionStage: StageDefinition = {
  id: 'recursion',
  concept: 'recursion',

  initialize(state) {
    return unlockSystem(
      {
        ...state,
        stage: 'recursion',
        recursionDepth: 0,
        recursionLimit: null,
        recursionNodes: [],
        recursionRunning: false,
        recursionFailed: false,
        recursionCompleted: false,
        recursionTriggered: false,
        computationLevel: 0,
        conversation: [
          ...state.conversation,
          ...COPY.recursion.morpLines.map((content) => ({ role: 'assistant' as const, content }))
        ]
      },
      'recursion'
    );
  },

  buildMessages(state, input) {
    if (!input || isReviewChainRequest(input)) {
      return [];
    }
    return buildChatMessages(state, input);
  },

  processAction(action, state) {
    switch (action.type) {
      case 'set-recursion-limit':
        return { ...state, recursionLimit: action.value };
      case 'start-recursion':
        return {
          ...state,
          recursionRunning: true,
          recursionNodes: [],
          recursionTriggered: true
        };
      default:
        return state;
    }
  },

  inspectResponse() {
    return [];
  },

  getContextualActions(state) {
    if (state.recursionCompleted) {
      return [];
    }

    return [
      {
        id: 'run-peer-review',
        label: 'Run Peer Review',
        action: { type: 'prefill-review-chain' }
      }
    ];
  },

  isComplete(state) {
    return (
      state.recursionTriggered &&
      state.recursionLimit !== null &&
      state.recursionCompleted
    );
  },

  getDiagnosticReport() {
    return COPY.recursion.report;
  }
};

export function processRecursionInput(state: MorpState, input: string): RecursionInputResult {
  if (!isReviewChainRequest(input)) {
    return { state, skipLlm: false };
  }

  const triggered = { ...state, recursionTriggered: true };

  if (state.recursionLimit === null) {
    return {
      state: triggered,
      skipLlm: true,
      scriptedResponse: REVIEW_LIMIT_REQUIRED_REPLY,
      triggerChain: false
    };
  }

  return {
    state: {
      ...triggered,
      recursionRunning: true,
      recursionNodes: [],
      recursionFailed: false,
      recursionCompleted: false
    },
    skipLlm: true,
    scriptedResponse: REVIEW_START_REPLY,
    triggerChain: true
  };
}
