import { COPY } from '../copy';
import {
  addContextMessage,
  applyContextSummary,
  buildAmnesiaChatMessages,
  buildSeedContextMessages,
  createContextCompaction,
  getContextWindowSnapshot,
  hasActiveContextMemory,
  offloadContextToMemory,
  truncateOldest
} from '../modules/context-manager';
import { addMemory } from '../modules/memory-store';
import { unlockSystem } from '../modules/unlocks';
import type { MorpState, StageDefinition } from '../types';

function applyContextMetrics(state: MorpState): MorpState {
  const snapshot = getContextWindowSnapshot(state.contextMessages);

  return {
    ...state,
    contextTokensUsed: snapshot.storedTokens,
    contextOverflowed: snapshot.overflowed,
    contextOverflowExperienced: state.contextOverflowExperienced || snapshot.overflowed
  };
}

export const amnesiaStage: StageDefinition = {
  id: 'amnesia',
  concept: 'amnesia',

  initialize(state) {
    const contextMessages = buildSeedContextMessages();
    const technicianId = state.technicianId ?? 'TECH-07';
    const next = unlockSystem(
      {
        ...state,
        stage: 'amnesia',
        technicianId,
        contextMessages,
        contextMemory: [],
        contextTokensUsed: 0,
        contextOverflowed: false,
        contextOverflowExperienced: false,
        contextLastCompaction: null,
        conversation: [
          ...state.conversation,
          ...COPY.amnesia.morpLines.map((content) => ({ role: 'assistant' as const, content }))
        ]
      },
      'context'
    );

    return applyContextMetrics(next);
  },

  buildMessages(state, input) {
    if (!input) {
      return [];
    }

    return buildAmnesiaChatMessages(state.contextMessages, input, state.contextMemory);
  },

  processAction(action, state) {
    switch (action.type) {
      case 'truncate-context': {
        const truncated = truncateOldest(state.contextMessages);
        if (truncated === state.contextMessages) {
          return state;
        }

        return applyContextMetrics({
          ...state,
          contextMessages: truncated,
          contextStrategyUsed: 'truncate',
          contextLastCompaction: createContextCompaction('truncate', state.contextMessages, truncated)
        });
      }
      case 'apply-context-summary': {
        const summarized = applyContextSummary(state.contextMessages, action.summary);
        if (summarized === state.contextMessages) {
          return state;
        }

        return applyContextMetrics({
          ...state,
          contextMessages: summarized,
          contextStrategyUsed: 'summarize',
          contextLastCompaction: createContextCompaction(
            'summarize',
            state.contextMessages,
            summarized,
            action.usedLlm ?? true
          )
        });
      }
      case 'store-context-in-memory': {
        if (!state.contextOverflowExperienced) {
          return state;
        }

        const offloaded = offloadContextToMemory(state.contextMessages, state.contextMemory);
        if (offloaded.contextMemory === state.contextMemory) {
          return state;
        }

        const next = unlockSystem(
          {
            ...state,
            contextMessages: offloaded.contextMessages,
            contextMemory: offloaded.contextMemory,
            contextStrategyUsed: 'memory' as const
          },
          'memory'
        );
        return applyContextMetrics(next);
      }
      case 'clear-context-memory': {
        if (!hasActiveContextMemory(state.contextMemory)) {
          return state;
        }

        return { ...state, contextMemory: [] };
      }
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
      case 'toggle-memory-context':
        return {
          ...state,
          memories: state.memories.map((m) =>
            m.id === action.id ? { ...m, inContext: action.inContext } : m
          )
        };
      default:
        return state;
    }
  },

  inspectResponse(_response, state) {
    const events = [];
    if (state.contextOverflowExperienced) {
      events.push({ type: 'context_overflow' as const });
    }
    return events;
  },

  getContextualActions(state) {
    if (!state.contextOverflowExperienced) {
      return [];
    }

    const actions: ReturnType<typeof amnesiaStage.getContextualActions> = [
      {
        id: 'truncate',
        label: 'Truncate',
        pro: COPY.amnesia.tools.truncate.pro,
        con: COPY.amnesia.tools.truncate.con,
        action: { type: 'truncate-context' }
      },
      {
        id: 'summarize',
        label: 'Summarize',
        pro: COPY.amnesia.tools.summarize.pro,
        con: COPY.amnesia.tools.summarize.con,
        action: { type: 'summarize-context' }
      },
      {
        id: 'memory',
        label: 'Store in Memory',
        pro: COPY.amnesia.tools.memory.pro,
        con: COPY.amnesia.tools.memory.con,
        action: { type: 'store-context-in-memory' }
      }
    ];

    if (hasActiveContextMemory(state.contextMemory)) {
      actions.push({
        id: 'clear-memory',
        label: 'Clear Memory',
        pro: COPY.amnesia.tools.clearMemory.pro,
        con: COPY.amnesia.tools.clearMemory.con,
        action: { type: 'clear-context-memory' }
      });
    }

    return actions;
  },

  isComplete(state) {
    return state.contextOverflowExperienced && state.contextStrategyUsed !== null;
  },

  getDiagnosticReport() {
    return COPY.amnesia.report;
  }
};

export function recordAmnesiaTurn(
  state: MorpState,
  userInput: string,
  assistantResponse: string
): MorpState {
  let contextMessages = addContextMessage(state.contextMessages, 'user', userInput);
  contextMessages = addContextMessage(contextMessages, 'assistant', assistantResponse);

  const snapshot = getContextWindowSnapshot(contextMessages);
  const newlyOverflowed = snapshot.overflowed && !state.contextOverflowExperienced;

  let next: MorpState = {
    ...state,
    contextMessages,
    contextTokensUsed: snapshot.storedTokens,
    contextOverflowed: snapshot.overflowed,
    contextOverflowExperienced: state.contextOverflowExperienced || snapshot.overflowed
  };

  if (newlyOverflowed) {
    next = {
      ...next,
      conversation: [...next.conversation, { role: 'system' as const, content: COPY.amnesia.overflow }]
    };
  }

  return next;
}
