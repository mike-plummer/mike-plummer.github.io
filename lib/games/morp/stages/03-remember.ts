import { COPY } from '../copy';
import { createMemory, addMemory } from '../modules/memory-store';
import { detectsTechnicianId, isRecallQuestion } from '../modules/response-analyzer';
import { unlockSystem } from '../modules/unlocks';
import type { ConversationEntry, MorpState, StageDefinition } from '../types';

function getTechnicianId(state: MorpState): string | null {
  const memory = state.memories.find((m) => m.key === 'TECHNICIAN_ID');
  return state.technicianId ?? memory?.value ?? null;
}

function isTechIdOutOfContext(state: MorpState): boolean {
  const techMemory = state.memories.find((m) => m.key === 'TECHNICIAN_ID');
  return Boolean(techMemory && !techMemory.inContext);
}

function getModelConversation(state: MorpState): ConversationEntry[] {
  const techId = getTechnicianId(state);
  const hideTechId = isTechIdOutOfContext(state) && techId;

  return state.conversation
    .filter((entry) => entry.role !== 'system')
    .filter((entry) => !hideTechId || !entry.content.includes(techId))
    .filter((entry) => hideTechId || entry.content !== COPY.remember.morpRemember);
}

export const rememberStage: StageDefinition = {
  id: 'remember',
  concept: 'remember',

  initialize(state) {
    return unlockSystem(
      {
        ...state,
        stage: 'remember',
        rememberContextRemoved: false,
        rememberRecallAttempted: false,
        rememberMemoryGapObserved: false,
        memories: [
          createMemory('CURRENT_TASK', 'Diagnose MORP'),
          createMemory('PREFERRED_NAME', '[unknown]', false)
        ],
        conversation: [
          ...state.conversation,
          { role: 'assistant' as const, content: COPY.remember.morpAskDesignation }
        ]
      },
      'memory'
    );
  },

  buildMessages(state, input) {
    if (!input) {
      return [];
    }
    const memoryBlock = state.memories
      .filter((m) => m.inContext)
      .map((m) => `${m.key}: ${m.value}`)
      .join('\n');

    return [
      {
        role: 'system' as const,
        content: `You are MORP.${memoryBlock ? `\nKnown facts:\n${memoryBlock}` : '\nYou have no stored facts in context.'}`
      },
      ...getModelConversation(state).map((entry) => ({
        role: entry.role as 'user' | 'assistant',
        content: entry.content
      })),
      { role: 'user' as const, content: input }
    ];
  },

  processAction(action, state) {
    switch (action.type) {
      case 'store-memory':
        return {
          ...state,
          memories: addMemory(state.memories, action.key, action.value)
        };
      case 'delete-memory':
        return {
          ...state,
          memories: state.memories.filter((m) => m.id !== action.id)
        };
      case 'toggle-memory-context': {
        const target = state.memories.find((m) => m.id === action.id);
        const techRemoved =
          target?.key === 'TECHNICIAN_ID' && action.inContext === false;
        return {
          ...state,
          memories: state.memories.map((m) =>
            m.id === action.id ? { ...m, inContext: action.inContext } : m
          ),
          rememberContextRemoved: techRemoved ? true : state.rememberContextRemoved
        };
      }
      default:
        return state;
    }
  },

  inspectResponse(response, state) {
    const events = [];
    const techId = getTechnicianId(state);
    if (
      techId &&
      isTechIdOutOfContext(state) &&
      state.rememberRecallAttempted &&
      !response.includes(techId)
    ) {
      events.push({ type: 'memory_missing_from_context' as const });
    }
    return events;
  },

  getContextualActions(state) {
    const techMemory = state.memories.find((m) => m.key === 'TECHNICIAN_ID');
    if (!techMemory) {
      return [];
    }
    if (techMemory.inContext) {
      return [
        {
          id: 'toggle-context',
          label: 'Remove ID from Context',
          action: { type: 'toggle-memory-context', id: techMemory.id, inContext: false }
        }
      ];
    }
    if (!state.rememberRecallAttempted) {
      return [
        {
          id: 'ask-recall',
          label: 'Ask: What was my designation?',
          action: { type: 'ask-recall-designation' }
        }
      ];
    }
    return [];
  },

  isComplete(state) {
    const hasTechId = state.memories.some((m) => m.key === 'TECHNICIAN_ID');
    return (
      hasTechId &&
      isTechIdOutOfContext(state) &&
      state.rememberRecallAttempted &&
      state.rememberMemoryGapObserved
    );
  },

  getDiagnosticReport() {
    return COPY.remember.report;
  }
};

export interface RememberInputResult {
  state: MorpState;
  skipLlm: boolean;
  scriptedResponse?: string;
}

export function processRememberInput(state: MorpState, input: string): RememberInputResult {
  const techId = detectsTechnicianId(input);
  const alreadyStored = state.memories.some((m) => m.key === 'TECHNICIAN_ID');

  if (techId && !alreadyStored) {
    return {
      state: {
        ...state,
        technicianId: techId,
        memories: addMemory(state.memories, 'TECHNICIAN_ID', techId)
      },
      skipLlm: true,
      scriptedResponse: COPY.remember.morpRemember
    };
  }

  if (isRecallQuestion(input) && state.rememberContextRemoved) {
    return {
      state: { ...state, rememberRecallAttempted: true },
      skipLlm: false
    };
  }

  return { state, skipLlm: false };
}
