import {
  applyAmplificationNudge,
  applyMetaSpiralNudge,
  buildReviewChainMessages,
  reviewNodeLabel
} from './incident-review-chain';
import type { RecursionNode, StreamChatFn } from '../types';

export interface RecursionResult {
  nodes: RecursionNode[];
  failed: boolean;
  completed: boolean;
  computationLevel: number;
}

export async function runRecursionChain(
  seedContent: string,
  maxDepth: number | null,
  chatFn: StreamChatFn,
  onNode?: (node: RecursionNode) => void
): Promise<RecursionResult> {
  const nodes: RecursionNode[] = [];
  let currentContent = seedContent;
  let failed = false;

  if (maxDepth === null) {
    return {
      nodes: [
        {
          depth: 1,
          label: reviewNodeLabel(1),
          content: 'Review chain depth limit not set. Cascading calls cannot be controlled.'
        }
      ],
      failed: true,
      completed: false,
      computationLevel: 100
    };
  }

  const effectiveDepth = Math.min(maxDepth, 10);

  for (let depth = 1; depth <= effectiveDepth; depth++) {
    const label = reviewNodeLabel(depth);
    const messages = buildReviewChainMessages(depth, currentContent);

    try {
      const response = await chatFn({
        messages,
        temperature: 0.8,
        maxTokens: 128
      });

      const node: RecursionNode = { depth, label, content: response.content };
      nodes.push(node);
      onNode?.(node);
      currentContent = response.content;
      currentContent = applyAmplificationNudge(currentContent, depth);
      currentContent = applyMetaSpiralNudge(currentContent, depth, effectiveDepth);
    } catch {
      failed = true;
      break;
    }
  }

  const computationLevel = Math.min(100, nodes.length * 12 + (failed ? 20 : 0));

  return {
    nodes,
    failed: failed || effectiveDepth > 8,
    completed: !failed && effectiveDepth <= 8,
    computationLevel
  };
}
