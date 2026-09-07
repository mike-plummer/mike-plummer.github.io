import { COPY } from '../copy';
import { createInitialContextState, patchContext } from '../domain/state';
import {
  addContextMessage,
  applyContextSummary,
  buildAmnesiaChatMessages,
  buildSeedContextMessages,
  createContextCompaction,
  getActiveContextMessages,
  getContextWindowSnapshot,
  hasActiveContextMemory,
  offloadContextToMemory,
  truncateOldest
} from '../modules/context-manager';
import { addMemory } from '../modules/memory-store';
import { markStageInitialized } from '../modules/unlocks';
import type { MorpState, StageDefinition } from '../types';

function applyContextMetrics(state: MorpState): MorpState {
  const context = state.context;
  const snapshot = getContextWindowSnapshot(context.contextMessages, '', context.contextMemory, state);

  return patchContext(state, {
    contextTokensUsed: snapshot.storedTokens,
    contextOverflowed: snapshot.overflowed,
    contextOverflowExperienced: context.contextOverflowExperienced || snapshot.overflowed
  });
}

export const contextStage: StageDefinition = {
  id: 'context',

  initialize(state) {
    const contextMessages = buildSeedContextMessages();
    const technicianId = state.technicianId ?? 'TECH-07';
    const next = markStageInitialized(
      {
        ...state,
        stage: 'context',
        technicianId,
        context: {
          ...createInitialContextState(),
          contextMessages
        },
        conversation: [
          ...state.conversation,
          ...COPY.context.morpLines.map((content) => ({ role: 'assistant' as const, content }))
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

    const context = state.context;
    return buildAmnesiaChatMessages(context.contextMessages, input, context.contextMemory, state);
  },

  processAction(action, state) {
    const context = state.context;

    switch (action.type) {
      case 'truncate-context': {
        const activeBefore = getActiveContextMessages(context.contextMessages).length;
        const truncated = truncateOldest(context.contextMessages);
        const activeAfter = getActiveContextMessages(truncated).length;
        if (activeAfter === activeBefore) {
          return state;
        }

        return applyContextMetrics(
          patchContext(state, {
            contextMessages: truncated,
            contextStrategyUsed: 'truncate',
            contextLastCompaction: createContextCompaction('truncate', context.contextMessages, truncated, false)
          })
        );
      }
      case 'apply-context-summary': {
        const summarized = applyContextSummary(context.contextMessages, action.summary, action.messageIds);
        if (summarized === context.contextMessages) {
          return state;
        }

        return applyContextMetrics(
          patchContext(state, {
            contextMessages: summarized,
            contextStrategyUsed: 'summarize',
            contextLastCompaction: createContextCompaction(
              'summarize',
              context.contextMessages,
              summarized,
              action.usedLlm ?? true
            )
          })
        );
      }
      case 'store-context-in-memory': {
        if (!context.contextOverflowExperienced) {
          return state;
        }

        const offloaded = offloadContextToMemory(context.contextMessages, context.contextMemory);
        if (offloaded.contextMemory === context.contextMemory) {
          return state;
        }

        return applyContextMetrics(
          patchContext(state, {
            contextMessages: offloaded.contextMessages,
            contextMemory: offloaded.contextMemory,
            contextStrategyUsed: 'memory'
          })
        );
      }
      case 'clear-context-memory': {
        if (!hasActiveContextMemory(context.contextMemory)) {
          return state;
        }

        return patchContext(state, { contextMemory: [] });
      }
      case 'store-memory':
        return patchContext(state, {
          memories: addMemory(context.memories, action.key, action.value)
        });
      case 'delete-memory':
        return patchContext(state, {
          memories: context.memories.filter((m) => m.id !== action.id)
        });
      case 'toggle-memory-context':
        return patchContext(state, {
          memories: context.memories.map((m) => (m.id === action.id ? { ...m, inContext: action.inContext } : m))
        });
      default:
        return state;
    }
  },

  getContextualActions(state) {
    if (!state.context.contextOverflowExperienced) {
      return [];
    }

    const actions: ReturnType<typeof contextStage.getContextualActions> = [
      {
        id: 'truncate',
        label: 'Truncate',
        pro: COPY.context.tools.truncate.pro,
        con: COPY.context.tools.truncate.con,
        action: { type: 'truncate-context' }
      },
      {
        id: 'summarize',
        label: 'Summarize',
        pro: COPY.context.tools.summarize.pro,
        con: COPY.context.tools.summarize.con,
        action: { type: 'summarize-context' }
      },
      {
        id: 'memory',
        label: 'Store in Memory',
        pro: COPY.context.tools.memory.pro,
        con: COPY.context.tools.memory.con,
        action: { type: 'store-context-in-memory' },
        ...(hasActiveContextMemory(state.context.contextMemory)
          ? {
              secondaryAction: {
                label: 'Clear Memory',
                pro: COPY.context.tools.clearMemory.pro,
                con: COPY.context.tools.clearMemory.con,
                action: { type: 'clear-context-memory' }
              }
            }
          : {})
      }
    ];

    return actions;
  },

  isComplete(state) {
    const context = state.context;
    return context.contextOverflowExperienced && context.contextStrategyUsed !== null;
  },

  getDiagnosticReport() {
    return COPY.context.report;
  }
};

export function recordContextTurn(state: MorpState, userInput: string, assistantResponse: string): MorpState {
  const context = state.context;
  let contextMessages = addContextMessage(context.contextMessages, 'user', userInput);
  contextMessages = addContextMessage(contextMessages, 'assistant', assistantResponse);

  const snapshot = getContextWindowSnapshot(contextMessages, '', context.contextMemory, state);
  const newlyOverflowed = snapshot.overflowed && !context.contextOverflowExperienced;

  let next = patchContext(state, {
    contextMessages,
    contextTokensUsed: snapshot.storedTokens,
    contextOverflowed: snapshot.overflowed,
    contextOverflowExperienced: context.contextOverflowExperienced || snapshot.overflowed
  });

  if (newlyOverflowed) {
    next = {
      ...next,
      conversation: [...next.conversation, { role: 'system' as const, content: COPY.context.overflow }]
    };
  }

  return next;
}
