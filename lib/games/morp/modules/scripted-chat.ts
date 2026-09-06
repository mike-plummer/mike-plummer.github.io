import type { ConversationEntry } from '../types';

export const SCRIPTED_THINKING_MS = 750;

const MIN_WORD_DELAY_MS = 90;
const MAX_WORD_DELAY_MS = 220;
const TARGET_STREAM_MS = 5200;

export function getNewConversationEntries(
  previous: ConversationEntry[],
  next: ConversationEntry[]
): ConversationEntry[] {
  if (next.length <= previous.length) {
    return [];
  }
  return next.slice(previous.length);
}

export function splitScriptedTextIntoWords(text: string): string[] {
  return text.match(/\S+\s*/g) ?? [];
}

export function wordDelayForScriptedText(wordCount: number): number {
  if (wordCount === 0) {
    return MAX_WORD_DELAY_MS;
  }
  return Math.max(MIN_WORD_DELAY_MS, Math.min(MAX_WORD_DELAY_MS, TARGET_STREAM_MS / wordCount));
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException('The operation was aborted.', 'AbortError');
  }
}

function cancellableSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('The operation was aborted.', 'AbortError'));
      return;
    }

    const timer = window.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    function onAbort() {
      window.clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      reject(new DOMException('The operation was aborted.', 'AbortError'));
    }

    signal?.addEventListener('abort', onAbort);
  });
}

export async function streamScriptedText(
  text: string,
  onUpdate: (partial: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const words = splitScriptedTextIntoWords(text);
  const delayMs = wordDelayForScriptedText(words.length);
  let partial = '';

  for (const word of words) {
    throwIfAborted(signal);
    partial += word;
    onUpdate(partial);
    await cancellableSleep(delayMs, signal);
  }
}

export async function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return cancellableSleep(ms, signal);
}
