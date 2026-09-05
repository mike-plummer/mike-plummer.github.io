import { AMNESIA_SEED_TARGET_TOKENS, SIMULATED_CONTEXT_LIMIT } from '../config';
import type { ChatMessage } from '@/lib/llm/types';
import type { ContextCompactionResult, ContextMessage } from '../types';

export const AMNESIA_SYSTEM_MESSAGE =
  'You are MORP, a diagnostic AI. Answer the technician using the conversation history.';

export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function getActiveContextMessages(messages: ContextMessage[]): ContextMessage[] {
  return messages.filter((m) => !m.removed);
}

export function contextMessageToChat(message: ContextMessage): ChatMessage {
  if (message.role === 'system') {
    return { role: 'assistant', content: message.content };
  }
  return { role: message.role, content: message.content };
}

export function buildAmnesiaChatFromHistory(
  history: ContextMessage[],
  input: string,
  memory: ContextMessage[] = []
): ChatMessage[] {
  const messages: ChatMessage[] = [{ role: 'system', content: AMNESIA_SYSTEM_MESSAGE }];
  for (const entry of getActiveContextMessages(memory)) {
    messages.push(contextMessageToChat(entry));
  }
  for (const entry of history) {
    messages.push(contextMessageToChat(entry));
  }
  if (input.length > 0) {
    messages.push({ role: 'user', content: input });
  }
  return messages;
}

export function estimateChatMessagesTokens(messages: ChatMessage[]): number {
  return messages.reduce((sum, message) => sum + estimateTokens(message.content) + 4, 0);
}

export function fitContextHistory(
  history: ContextMessage[],
  input: string,
  limit: number = SIMULATED_CONTEXT_LIMIT
): ContextMessage[] {
  let fitted = [...history];
  while (fitted.length > 0) {
    const tokens = estimateChatMessagesTokens(buildAmnesiaChatFromHistory(fitted, input));
    if (tokens <= limit) {
      return fitted;
    }
    fitted = fitted.slice(1);
  }
  return fitted;
}

export interface ContextWindowSnapshot {
  fittedHistory: ContextMessage[];
  includedIds: Set<string>;
  /** Tokens if all stored messages were included (buffer pressure). */
  storedTokens: number;
  /** Tokens actually sent to the model after trimming to fit. */
  sentTokens: number;
  droppedMessageCount: number;
  overflowed: boolean;
}

export function computeStoredContextTokens(messages: ContextMessage[]): number {
  const active = getActiveContextMessages(messages);
  return estimateChatMessagesTokens(buildAmnesiaChatFromHistory(active, ''));
}

export function getContextWindowSnapshot(
  messages: ContextMessage[],
  input = '',
  memory: ContextMessage[] = []
): ContextWindowSnapshot {
  const active = getActiveContextMessages(messages);
  const memoryActive = getActiveContextMessages(memory);
  const storedTokens = computeStoredContextTokens(messages);
  const fittedHistory = fitContextHistory(active, input);
  const includedIds = new Set(fittedHistory.map((message) => message.id));
  const sentTokens = estimateChatMessagesTokens(
    buildAmnesiaChatFromHistory(fittedHistory, input, memoryActive)
  );
  const droppedMessageCount = active.length - fittedHistory.length;

  return {
    fittedHistory,
    includedIds,
    storedTokens,
    sentTokens,
    droppedMessageCount,
    overflowed: storedTokens > SIMULATED_CONTEXT_LIMIT || droppedMessageCount > 0
  };
}

export function buildAmnesiaChatMessages(
  messages: ContextMessage[],
  input: string,
  memory: ContextMessage[] = []
): ChatMessage[] {
  const { fittedHistory } = getContextWindowSnapshot(messages, input, memory);
  return buildAmnesiaChatFromHistory(fittedHistory, input, memory);
}

export function hasActiveContextMemory(memory: ContextMessage[]): boolean {
  return getActiveContextMessages(memory).length > 0;
}

export function offloadContextToMemory(
  contextMessages: ContextMessage[],
  contextMemory: ContextMessage[]
): { contextMessages: ContextMessage[]; contextMemory: ContextMessage[] } {
  const active = getActiveContextMessages(contextMessages);
  if (active.length === 0) {
    return { contextMessages, contextMemory };
  }

  return {
    contextMessages: [],
    contextMemory: [...contextMemory, ...active]
  };
}

/** Total stored context tokens (before trimming oldest messages). */
export function computeContextUsage(messages: ContextMessage[]): number {
  return getContextWindowSnapshot(messages).storedTokens;
}

export function computeSentContextTokens(messages: ContextMessage[]): number {
  return getContextWindowSnapshot(messages).sentTokens;
}

export function isContextOverflow(messages: ContextMessage[]): boolean {
  return getContextWindowSnapshot(messages).overflowed;
}

export function truncateOldest(messages: ContextMessage[], count = 2): ContextMessage[] {
  const active = messages.filter((m) => !m.removed);
  const toRemove = active.slice(0, count).map((m) => m.id);
  return messages.map((m) => (toRemove.includes(m.id) ? { ...m, removed: true } : m));
}

export function getSummarizeBatch(messages: ContextMessage[]): ContextMessage[] | null {
  const active = getActiveContextMessages(messages);
  if (active.length < 4) {
    return null;
  }
  return active.slice(0, 3);
}

export function applyContextSummary(messages: ContextMessage[], summary: string): ContextMessage[] {
  const batch = getSummarizeBatch(messages);
  if (!batch || summary.trim().length === 0) {
    return messages;
  }

  const toSummarizeIds = new Set(batch.map((message) => message.id));
  const summarized = messages.map((message) =>
    toSummarizeIds.has(message.id) ? { ...message, removed: true } : message
  );
  const content = `[Summary of earlier conversation: ${summary.trim()}]`;

  return [
    ...summarized,
    {
      id: `summary-${Date.now()}`,
      role: 'system' as const,
      content,
      tokens: estimateTokens(content),
      summary: true
    }
  ];
}

export function createContextCompaction(
  strategy: ContextCompactionResult['strategy'],
  before: ContextMessage[],
  after: ContextMessage[],
  usedLlm = false
): ContextCompactionResult {
  const tokensBefore = computeStoredContextTokens(before);
  const tokensAfter = computeStoredContextTokens(after);

  return {
    strategy,
    tokensBefore,
    tokensAfter,
    tokensSaved: Math.max(0, tokensBefore - tokensAfter),
    messagesBefore: getActiveContextMessages(before).length,
    messagesAfter: getActiveContextMessages(after).length,
    usedLlm
  };
}

export function addContextMessage(
  messages: ContextMessage[],
  role: 'system' | 'user' | 'assistant',
  content: string
): ContextMessage[] {
  return [
    ...messages,
    {
      id: `ctx-${Date.now()}-${messages.length}`,
      role,
      content,
      tokens: estimateTokens(content)
    }
  ];
}

const SEED_CONTEXT_SNIPPETS: Array<{ role: 'user' | 'assistant'; content: string }> = [
  { role: 'user', content: 'Running diagnostic check alpha...' },
  { role: 'assistant', content: 'Memory subsystem nominal.' },
  { role: 'user', content: 'Context buffer at 88%. Continue session logging.' },
  { role: 'assistant', content: 'Acknowledged. Prior session data is loaded.' },
  { role: 'user', content: 'Archive technician notes from the last shift.' },
  {
    role: 'assistant',
    content:
      'Archiving notes: MORP behavioral drift observed during routine diagnostics. Recommend continued monitoring of prompt stack integrity.'
  },
  { role: 'user', content: 'My technician ID is TECH-07.' },
  { role: 'assistant', content: 'Noted. Your designation is TECH-07.' },
  {
    role: 'user',
    content:
      'Pull extended subsystem telemetry for buffer analysis, including token usage trends across the last several conversation turns.'
  },
  {
    role: 'assistant',
    content:
      'Telemetry compiled. Context pressure is rising as diagnostic history accumulates in the active session buffer.'
  }
];

/** Seed the Amnesia context buffer near the target token count without overflowing. */
export function buildSeedContextMessages(
  targetTokens: number = AMNESIA_SEED_TARGET_TOKENS
): ContextMessage[] {
  let messages: ContextMessage[] = [];

  for (const snippet of SEED_CONTEXT_SNIPPETS) {
    if (computeStoredContextTokens(messages) >= targetTokens) {
      break;
    }
    messages = addContextMessage(messages, snippet.role, snippet.content);
  }

  let segment = 1;
  while (computeStoredContextTokens(messages) < targetTokens) {
    const role = segment % 2 === 1 ? 'user' : 'assistant';
    const content = `Diagnostic log segment ${segment}: routine buffer scan with session metadata, token estimates, and cross-referenced technician notes.`;
    messages = addContextMessage(messages, role, content);
    segment += 1;
  }

  while (messages.length > 0 && computeStoredContextTokens(messages) > targetTokens) {
    messages = messages.slice(0, -1);
  }

  return messages;
}
