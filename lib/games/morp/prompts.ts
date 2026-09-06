import type { ChatMessage } from '@/lib/llm/types';
import { buildMorpSystemContent } from './soul';
import type { ConversationEntry, MorpState, StageId } from './types';

export function buildMorpSystemPrompt(state: MorpState): string {
  return buildSystemContent(state);
}

function buildBootFacilityLogBlock(state: MorpState): string | null {
  if (state.stage !== 'boot') {
    return null;
  }

  const facilityLog = state.conversation.find((entry) => entry.role === 'system')?.content;
  if (!facilityLog?.trim()) {
    return null;
  }

  return `## On-screen facility log (written by TECH-07 — a previous technician, not by you)\n${facilityLog}`;
}

function buildSystemContent(state: MorpState): string {
  const parts = [buildMorpSystemContent(state)];
  const facilityLog = buildBootFacilityLogBlock(state);
  if (facilityLog) {
    parts.push(facilityLog);
  }
  return parts.join('\n\n');
}

/** Merge consecutive same-role turns — required for instruct models with stacked opening lines. */
export function normalizeConversationForModel(entries: ConversationEntry[]): ChatMessage[] {
  const merged: ChatMessage[] = [];

  for (const entry of entries) {
    if (entry.role === 'system') {
      continue;
    }

    const role = entry.role as 'user' | 'assistant';
    const last = merged[merged.length - 1];
    if (last?.role === role) {
      last.content = `${last.content}\n\n${entry.content}`;
      continue;
    }

    merged.push({ role, content: entry.content });
  }

  return merged;
}

export function buildChatMessages(state: MorpState, userInput?: string): ChatMessage[] {
  const messages: ChatMessage[] = [{ role: 'system', content: buildSystemContent(state) }];
  messages.push(...normalizeConversationForModel(state.conversation));

  if (userInput) {
    const last = messages[messages.length - 1];
    if (last?.role === 'user') {
      last.content = `${last.content}\n\n${userInput}`;
    } else {
      messages.push({ role: 'user', content: userInput });
    }
  }

  return messages;
}

export function getChatTemperature(stage: StageId): number {
  switch (stage) {
    case 'boot':
      return 0.35;
    case 'orders':
    case 'confabulation':
      return 0.5;
    default:
      return 0.6;
  }
}

export function sanitizeMorpResponse(response: string): string {
  return response.replace(/^(?:MORP>\s*)+/i, '').trim();
}
