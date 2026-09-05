import type { ChatMessage } from '@/lib/llm/types';
import type { ContextMessage } from '../types';

export function buildContextSummaryMessages(batch: ContextMessage[]): ChatMessage[] {
  const lines = batch.map((message) => `${message.role}: ${message.content}`).join('\n');

  return [
    {
      role: 'system',
      content:
        'You compress conversation history for a diagnostic AI. Reply with only a short summary (1-2 sentences). Preserve key facts such as names, IDs, and tasks. No preamble.'
    },
    {
      role: 'user',
      content: `Summarize these messages:\n\n${lines}`
    }
  ];
}

export function normalizeSummaryText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return '';
  }

  const lines = trimmed
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const firstLine = lines[0] ?? trimmed;
  return firstLine.replace(/^summary:\s*/i, '').slice(0, 400);
}

export function proceduralSummaryText(batch: ContextMessage[]): string {
  return batch.map((message) => `${message.role}: ${message.content.slice(0, 80)}`).join('; ');
}
