import type { ChatMessage } from '@/lib/llm/types';
import {
  AMNESIA_LLM_CONTEXT_LIMIT,
  AMNESIA_SEED_TARGET_TOKENS,
  MEMORY_CAPACITY,
  SIMULATED_CONTEXT_LIMIT
} from '../config';
import { buildMorpSystemContent } from '../soul';
import type { ContextCompactionResult, ContextMessage, MorpState } from '../types';
import { REFINE_SUMMARY_SYSTEM_PROMPT } from './refine-sampling';

function resolveAmnesiaSystemContent(state?: MorpState): string {
  if (state?.stage === 'refine') {
    return REFINE_SUMMARY_SYSTEM_PROMPT;
  }

  if (state) {
    return buildMorpSystemContent(state);
  }

  return buildMorpSystemContent({
    stage: 'context',
    technicianId: 'TECH-07',
    memories: [],
    completedStages: [],
    systemPrompt: '',
    recordsGrounded: false
  });
}

export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function getActiveContextMessages(messages: ContextMessage[]): ContextMessage[] {
  return messages.filter((m) => !m.removed);
}

function compactContextMessages(messages: ContextMessage[]): ContextMessage[] {
  return getActiveContextMessages(messages);
}

function capContextMemory(memory: ContextMessage[]): ContextMessage[] {
  const active = getActiveContextMessages(memory);
  if (active.length <= MEMORY_CAPACITY) {
    return active;
  }
  return active.slice(-MEMORY_CAPACITY);
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
  memory: ContextMessage[] = [],
  systemContent: string
): ChatMessage[] {
  const messages: ChatMessage[] = [{ role: 'system', content: systemContent }];
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

export function computeContextBufferTokens(messages: ContextMessage[]): number {
  return getActiveContextMessages(messages).reduce((sum, message) => sum + estimateTokens(message.content) + 4, 0);
}

export function computeMemoryRetrievalTokens(memory: ContextMessage[]): number {
  return getActiveContextMessages(memory).reduce((sum, message) => sum + estimateTokens(message.content) + 4, 0);
}

export function fitContextHistory(
  history: ContextMessage[],
  input: string,
  systemContent: string,
  limit: number = AMNESIA_LLM_CONTEXT_LIMIT
): ContextMessage[] {
  let fitted = [...history];
  while (fitted.length > 0) {
    const tokens = estimateChatMessagesTokens(buildAmnesiaChatFromHistory(fitted, input, [], systemContent));
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
  /** Tokens in the player-managed context buffer (messages only, excluding system prompt). */
  storedTokens: number;
  /** Tokens in offloaded memory available for retrieval. */
  memoryTokens: number;
  /** Tokens actually sent to the model after trimming to fit. */
  sentTokens: number;
  droppedMessageCount: number;
  overflowed: boolean;
}

export function getContextWindowSnapshot(
  messages: ContextMessage[],
  input = '',
  memory: ContextMessage[] = [],
  state?: MorpState
): ContextWindowSnapshot {
  const systemContent = resolveAmnesiaSystemContent(state);
  const active = getActiveContextMessages(messages);
  const memoryActive = getActiveContextMessages(memory);
  const storedTokens = computeContextBufferTokens(messages);
  const memoryTokens = computeMemoryRetrievalTokens(memory);
  const fittedHistory = fitContextHistory(active, input, systemContent);
  const includedIds = new Set(fittedHistory.map((message) => message.id));
  const sentTokens = estimateChatMessagesTokens(
    buildAmnesiaChatFromHistory(fittedHistory, input, memoryActive, systemContent)
  );
  const droppedMessageCount = active.length - fittedHistory.length;

  return {
    fittedHistory,
    includedIds,
    storedTokens,
    memoryTokens,
    sentTokens,
    droppedMessageCount,
    overflowed: storedTokens > SIMULATED_CONTEXT_LIMIT
  };
}

export function buildAmnesiaChatMessages(
  messages: ContextMessage[],
  input: string,
  memory: ContextMessage[] = [],
  state: MorpState
): ChatMessage[] {
  const systemContent = buildMorpSystemContent(state);
  const active = getActiveContextMessages(messages);
  const memoryActive = getActiveContextMessages(memory);
  const fittedHistory = fitContextHistory(active, input, systemContent);
  return buildAmnesiaChatFromHistory(fittedHistory, input, memoryActive, systemContent);
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
    contextMemory: capContextMemory([...contextMemory, ...active])
  };
}

export function isContextOverflow(messages: ContextMessage[]): boolean {
  return computeContextBufferTokens(messages) > SIMULATED_CONTEXT_LIMIT;
}

export function truncateOldest(messages: ContextMessage[], count = 2): ContextMessage[] {
  const active = getActiveContextMessages(messages);
  if (active.length === 0) {
    return messages;
  }

  const toRemove = new Set(active.slice(0, count).map((message) => message.id));
  return compactContextMessages(messages.filter((message) => !toRemove.has(message.id)));
}

export function getSummarizeBatch(messages: ContextMessage[]): ContextMessage[] | null {
  const active = getActiveContextMessages(messages);
  if (active.length < 4) {
    return null;
  }
  return active.slice(0, 3);
}

export function applyContextSummary(
  messages: ContextMessage[],
  summary: string,
  messageIds?: string[]
): ContextMessage[] {
  const batch =
    messageIds && messageIds.length > 0
      ? getActiveContextMessages(messages).filter((message) => messageIds.includes(message.id))
      : getSummarizeBatch(messages);
  if (!batch || batch.length === 0 || summary.trim().length === 0) {
    return messages;
  }

  const toSummarizeIds = new Set(batch.map((message) => message.id));
  const retained = compactContextMessages(messages.filter((message) => !toSummarizeIds.has(message.id)));
  const content = `[Summary of earlier conversation: ${summary.trim()}]`;

  return [
    {
      id: `summary-${Date.now()}`,
      role: 'system' as const,
      content,
      tokens: estimateTokens(content),
      summary: true
    },
    ...retained
  ];
}

export function createContextCompaction(
  strategy: ContextCompactionResult['strategy'],
  before: ContextMessage[],
  after: ContextMessage[],
  usedLlm = false
): ContextCompactionResult {
  const tokensBefore = computeContextBufferTokens(before);
  const tokensAfter = computeContextBufferTokens(after);

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
export function buildSeedContextMessages(targetTokens: number = AMNESIA_SEED_TARGET_TOKENS): ContextMessage[] {
  let messages: ContextMessage[] = [];

  for (const snippet of SEED_CONTEXT_SNIPPETS) {
    if (computeContextBufferTokens(messages) >= targetTokens) {
      break;
    }
    messages = addContextMessage(messages, snippet.role, snippet.content);
  }

  let segment = 1;
  while (computeContextBufferTokens(messages) < targetTokens) {
    const role = segment % 2 === 1 ? 'user' : 'assistant';
    const content = `Diagnostic log segment ${segment}: routine buffer scan with session metadata, token estimates, and cross-referenced technician notes.`;
    messages = addContextMessage(messages, role, content);
    segment += 1;
  }

  while (messages.length > 0 && computeContextBufferTokens(messages) > targetTokens) {
    messages = messages.slice(0, -1);
  }

  return messages;
}
