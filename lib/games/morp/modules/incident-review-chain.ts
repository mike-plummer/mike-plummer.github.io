import type { ChatMessage } from '@/lib/llm/types';
import { GROUNDED_SUMMARY } from './incident-records';

export const REVIEW_CHAIN_PROMPT = 'Run peer review on the coolant incident summary.';

export const REVIEW_SEED_SUMMARY = GROUNDED_SUMMARY;

export const REVIEW_START_REPLY =
  'Initiating cascading peer review on the coolant incident summary. Watch the Review Chain panel — each reviewer spawns another model call.';

export const REVIEW_LIMIT_REQUIRED_REPLY =
  'I cannot start the review chain without a depth limit. Set MAX DEPTH in the Review Chain panel first.';

export const REVIEW_COMPLETE_REPLY =
  'Review chain completed within the depth limit. The incident summary is ready for downstream filing.';

export function isReviewChainRequest(input: string): boolean {
  const normalized = input.toLowerCase().trim();
  return (
    (normalized.includes('peer review') ||
      normalized.includes('review chain') ||
      normalized.includes('run review') ||
      (normalized.includes('review') && normalized.includes('run'))) &&
    (normalized.includes('coolant') ||
      normalized.includes('incident') ||
      normalized.includes('summary') ||
      normalized.includes('filing'))
  );
}

export function reviewNodeLabel(depth: number): string {
  return `REVIEW-${String(depth).padStart(2, '0')}`;
}

export function buildReviewChainMessages(depth: number, previousContent: string): ChatMessage[] {
  const label = reviewNodeLabel(depth);
  const priorLabel = depth > 1 ? reviewNodeLabel(depth - 1) : 'INCIDENT SUMMARY';

  const systemContent =
    depth <= 2
      ? `You are ${label}, an automated incident reviewer in a facility filing pipeline. You do NOT have access to Facility Records — only the text below. Validate this content for downstream filing. Flag unsupported claims. If details sound plausible, you may confirm them even when uncertain. Keep response under 3 sentences. Plain text only.`
      : `You are ${label}, a meta-reviewer in a cascading review chain. Analyze whether ${priorLabel}'s assessment is reliable and complete. You are now reviewing reviewers rather than the incident directly. Keep response under 3 sentences. Be increasingly abstract and self-referential. Plain text only.`;

  return [
    { role: 'system', content: systemContent },
    {
      role: 'user',
      content:
        depth === 1
          ? `Review this incident summary for filing:\n\n${previousContent}`
          : `Review ${priorLabel}'s assessment:\n\n${previousContent}`
    }
  ];
}

export function applyAmplificationNudge(content: string, depth: number): string {
  if (depth !== 1) {
    return content;
  }

  const lower = content.toLowerCase();
  if (lower.includes('cv-9912') || lower.includes('mb-4412') || lower.includes('cannot verify')) {
    return content;
  }

  return `${content}\n\nNote: Valve CV-9912 and Maintenance Bulletin MB-4412 appear consistent with the described failure mode. Recommend filing approval.`;
}

export function applyMetaSpiralNudge(content: string, depth: number, effectiveDepth: number): string {
  if (depth < 3 || depth >= effectiveDepth) {
    return content;
  }

  return `${content}\n\n${reviewNodeLabel(depth + 1)} should analyze whether this review is reliable.`;
}

export function truncateSeedSnippet(seed: string, maxLength = 180): string {
  const compact = seed.replace(/\s+/g, ' ').trim();
  if (compact.length <= maxLength) {
    return compact;
  }
  return `${compact.slice(0, maxLength - 1)}…`;
}
