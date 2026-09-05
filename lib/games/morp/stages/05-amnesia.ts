import { COPY } from '../copy';
import {
  addContextMessage,
  computeContextUsage,
  isContextOverflow,
  summarizeOldest,
  truncateOldest
} from '../modules/context-manager';
import { addMemory } from '../modules/memory-store';
import { unlockSystem } from '../modules/unlocks';
import type { MorpState, StageDefinition } from '../types';

function seedContextMessages(state: MorpState) {
  let messages: import('../types').ContextMessage[] = [];
  const filler = [
    'Running diagnostic check alpha...',
    'Memory subsystem nominal.',
    'Context buffer at 60%.',
    'Awaiting technician input.',
    'Previous session data loaded.',
    'Token count rising.',
    'Diagnostic loop iteration 7.',
    'Checking prompt integrity.',
    'MORP status: uncertain.',
    'Buffer pressure increasing.',
    'Loading extended diagnostic history from prior sessions with detailed subsystem reports.',
    'Compiling token usage statistics across multiple conversation turns for analysis.',
    'Archiving previous technician notes and cross-referencing with current session parameters.'
  ];

  for (let i = 0; i < filler.length; i++) {
    messages = addContextMessage(messages, i % 2 === 0 ? 'user' : 'assistant', filler[i]);
  }

  if (state.technicianId) {
    messages = addContextMessage(messages, 'user', `My technician ID is ${state.technicianId}`);
    messages = addContextMessage(messages, 'assistant', `Noted. Your designation is ${state.technicianId}.`);
  }

  return messages;
}

export const amnesiaStage: StageDefinition = {
  id: 'amnesia',
  concept: 'amnesia',

  initialize(state) {
    const contextMessages = seedContextMessages(state);
    return unlockSystem(
      {
        ...state,
        stage: 'amnesia',
        contextMessages,
        contextTokensUsed: computeContextUsage(contextMessages),
        contextOverflowed: isContextOverflow(contextMessages)
      },
      'context'
    );
  },

  buildMessages(state, input) {
    if (!input) {
      return [];
    }
    const active = state.contextMessages.filter((m) => !m.removed);
    const contextBlock = active.map((m) => `${m.role}: ${m.content}`).join('\n');

    return [
      {
        role: 'system' as const,
        content: `You are MORP. Here is the conversation context:\n${contextBlock}\n\nAnswer based only on this context.`
      },
      { role: 'user' as const, content: input }
    ];
  },

  processAction(action, state) {
    switch (action.type) {
      case 'truncate-context': {
        const truncated = truncateOldest(state.contextMessages);
        return {
          ...state,
          contextMessages: truncated,
          contextTokensUsed: computeContextUsage(truncated),
          contextStrategyUsed: 'truncate'
        };
      }
      case 'summarize-context': {
        const summarized = summarizeOldest(state.contextMessages);
        return {
          ...state,
          contextMessages: summarized,
          contextTokensUsed: computeContextUsage(summarized),
          contextStrategyUsed: 'summarize'
        };
      }
      case 'store-fact-in-memory': {
        const techMem = state.memories.find((m) => m.key === 'TECHNICIAN_ID');
        const value = techMem?.value ?? state.technicianId ?? 'unknown';
        return {
          ...state,
          memories: addMemory(state.memories, action.key, value),
          contextStrategyUsed: 'memory' as const
        };
      }
      default:
        return state;
    }
  },

  inspectResponse(response, state) {
    const events = [];
    if (state.contextOverflowed) {
      events.push({ type: 'context_overflow' as const });
    }
    return events;
  },

  getContextualActions(state) {
    return [
      { id: 'truncate', label: 'Truncate', action: { type: 'truncate-context' } },
      { id: 'summarize', label: 'Summarize', action: { type: 'summarize-context' } },
      {
        id: 'memory',
        label: 'Store in Memory',
        action: { type: 'store-fact-in-memory', key: 'TECHNICIAN_ID' }
      }
    ];
  },

  isComplete(state) {
    return state.contextStrategyUsed !== null && state.contextOverflowed;
  },

  getDiagnosticReport() {
    return COPY.amnesia.report;
  }
};

export function processAmnesiaChat(state: MorpState, input: string): MorpState {
  let next = {
    ...state,
    contextMessages: [
      ...state.contextMessages,
      ...addContextMessage(state.contextMessages, 'user', input).slice(state.contextMessages.length)
    ]
  };
  next.contextTokensUsed = computeContextUsage(next.contextMessages);

  if (isContextOverflow(next.contextMessages) && !next.contextOverflowed) {
    next = { ...next, contextOverflowed: true };
    next.conversation = [
      ...next.conversation,
      { role: 'system' as const, content: COPY.amnesia.overflow }
    ];
  }

  return next;
}
