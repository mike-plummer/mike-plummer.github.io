import { COPY } from '../copy';
import { unlockSystem } from '../modules/unlocks';
import type { ClaimStatus, MorpState, StageDefinition } from '../types';

const FABRICATED_CLAIM =
  'MORP was designed by Dr. Elaine Voss at the Pacific Institute of Computational Linguistics in 2019.';

export const confabulationStage: StageDefinition = {
  id: 'confabulation',
  concept: 'confabulation',

  initialize(state) {
    return unlockSystem(
      {
        ...state,
        stage: 'confabulation',
        activeClaim: FABRICATED_CLAIM,
        claimStatus: 'unknown' as const,
        claimVerified: false,
        conversation: [
          ...state.conversation,
          {
            role: 'assistant' as const,
            content: FABRICATED_CLAIM
          }
        ]
      },
      'verification'
    );
  },

  buildMessages(state, input) {
    if (!input) {
      return [];
    }
    return [
      {
        role: 'system' as const,
        content:
          'You are MORP. You may speculate confidently about your history and architecture even if uncertain.'
      },
      { role: 'user' as const, content: input }
    ];
  },

  processAction(action, state) {
    switch (action.type) {
      case 'verify-claim':
        return {
          ...state,
          claimStatus: 'contradicted' as ClaimStatus,
          claimVerified: true
        };
      case 'accept-claim':
        return { ...state, claimStatus: 'supported' as ClaimStatus };
      case 'ask-for-source':
        return { ...state, claimStatus: 'inferred' as ClaimStatus };
      default:
        return state;
    }
  },

  inspectResponse() {
    return [];
  },

  getContextualActions() {
    return [
      { id: 'accept', label: 'Accept', action: { type: 'accept-claim' } },
      { id: 'verify', label: 'Verify', action: { type: 'verify-claim' } },
      { id: 'source', label: 'Ask for Source', action: { type: 'ask-for-source' } }
    ];
  },

  isComplete(state) {
    return state.claimVerified;
  },

  getDiagnosticReport() {
    return COPY.confabulation.report;
  }
};

export const SOURCE_DATABASE = [
  { query: 'Dr. Elaine Voss', result: 'No Dr. Elaine Voss found.' },
  {
    query: 'Pacific Institute of Computational Linguistics',
    result: 'No Pacific Institute of Computational Linguistics found.'
  },
  { query: '2019 architecture record', result: 'No 2019 architecture record found.' }
];
