const THINKING_OPEN_TAG = /<(?:redacted_thinking|thinking|think)>/i;
const THINKING_CLOSE_TAG = /<\/(?:redacted_thinking|thinking|think)>/i;
const THINKING_BLOCK_PATTERN =
  /<(?:redacted_thinking|thinking|think)>[\s\S]*?<\/(?:redacted_thinking|thinking|think)>/gi;
const ORPHAN_THINKING_TAG_PATTERN = /<\/?(?:redacted_thinking|thinking|think)>/gi;

const THINKING_OPEN = `<${'redacted_thinking'}>`;
const THINKING_CLOSE = `</${'redacted_thinking'}>`;
const THINK_OPEN = `<${'think'}>`;
const THINK_CLOSE = `</${'think'}>`;
const THINKING_TAG_MARKERS = [THINKING_OPEN, THINKING_CLOSE, THINK_OPEN, THINK_CLOSE, '<thinking>', '</thinking>'];

/** Remove Qwen-style chain-of-thought blocks (including WebLLM's empty injected prefix). */
export function stripThinkingBlocks(text: string): string {
  return text.replace(THINKING_BLOCK_PATTERN, '').replace(ORPHAN_THINKING_TAG_PATTERN, '');
}

/** Strip thinking markup and leading whitespace from a completed model response. */
export function normalizeModelOutput(text: string): string {
  return stripThinkingBlocks(text).replace(/^\s+/, '');
}

function isPartialThinkingTag(tail: string): boolean {
  if (!tail.startsWith('<') || tail.includes('>')) {
    return false;
  }

  return THINKING_TAG_MARKERS.some((marker) => marker.startsWith(tail));
}

function holdPartialTagSuffix(text: string): { visible: string; pending: string } {
  const lastLt = text.lastIndexOf('<');
  if (lastLt === -1) {
    return { visible: text, pending: '' };
  }

  const tail = text.slice(lastLt);
  if (isPartialThinkingTag(tail)) {
    return { visible: text.slice(0, lastLt), pending: tail };
  }

  return { visible: text, pending: '' };
}

/**
 * Streaming-safe filter: suppresses thinking blocks until the closing tag arrives.
 */
export function createThinkingBlockStreamFilter() {
  let buffer = '';
  let insideThinking = false;
  let hasEmittedContent = false;

  const trimLeadingUntilContent = (text: string): string => {
    if (hasEmittedContent) {
      return text;
    }

    const trimmed = text.replace(/^\s+/, '');
    if (trimmed.length > 0) {
      hasEmittedContent = true;
    }
    return trimmed;
  };

  const emitVisible = (): string => {
    let output = '';

    while (buffer.length > 0) {
      if (insideThinking) {
        const closeMatch = THINKING_CLOSE_TAG.exec(buffer);
        THINKING_CLOSE_TAG.lastIndex = 0;

        if (!closeMatch || closeMatch.index === undefined) {
          if (/<\/(?:redacted_thinking|thinking|think)?$/i.test(buffer)) {
            break;
          }
          break;
        }

        buffer = buffer.slice(closeMatch.index + closeMatch[0].length).replace(/^\s+/, '');
        insideThinking = false;
        continue;
      }

      const openMatch = THINKING_OPEN_TAG.exec(buffer);
      THINKING_OPEN_TAG.lastIndex = 0;

      if (!openMatch || openMatch.index === undefined) {
        const { visible, pending } = holdPartialTagSuffix(buffer);
        output += visible;
        buffer = pending;
        break;
      }

      output += buffer.slice(0, openMatch.index);
      buffer = buffer.slice(openMatch.index + openMatch[0].length);
      insideThinking = true;
    }

    return trimLeadingUntilContent(output);
  };

  return {
    push(chunk: string): string {
      if (!chunk) {
        return '';
      }
      buffer += chunk;
      return emitVisible();
    },
    flush(): string {
      buffer = '';
      insideThinking = false;
      hasEmittedContent = false;
      return '';
    }
  };
}
