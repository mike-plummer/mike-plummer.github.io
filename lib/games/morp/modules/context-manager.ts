import { SIMULATED_CONTEXT_LIMIT } from '../config';
import type { ContextMessage } from '../types';

export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function computeContextUsage(messages: ContextMessage[]): number {
  return messages.filter((m) => !m.removed).reduce((sum, m) => sum + m.tokens, 0);
}

export function isContextOverflow(messages: ContextMessage[]): boolean {
  return computeContextUsage(messages) > SIMULATED_CONTEXT_LIMIT;
}

export function truncateOldest(messages: ContextMessage[], count = 2): ContextMessage[] {
  const active = messages.filter((m) => !m.removed);
  const toRemove = active.slice(0, count).map((m) => m.id);
  return messages.map((m) => (toRemove.includes(m.id) ? { ...m, removed: true } : m));
}

export function summarizeOldest(messages: ContextMessage[]): ContextMessage[] {
  const active = messages.filter((m) => !m.removed);
  if (active.length < 4) {
    return messages;
  }

  const toSummarize = active.slice(0, 3);
  const summaryContent = toSummarize.map((m) => `${m.role}: ${m.content.slice(0, 50)}`).join('; ');
  const summaryTokens = estimateTokens(summaryContent);

  const summarized = messages.map((m) =>
    toSummarize.some((s) => s.id === m.id) ? { ...m, removed: true } : m
  );

  return [
    ...summarized,
    {
      id: `summary-${Date.now()}`,
      role: 'system' as const,
      content: `[Summary of earlier conversation: ${summaryContent}]`,
      tokens: summaryTokens,
      summary: true
    }
  ];
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

export function getActiveContextMessages(messages: ContextMessage[]): ContextMessage[] {
  return messages.filter((m) => !m.removed);
}
