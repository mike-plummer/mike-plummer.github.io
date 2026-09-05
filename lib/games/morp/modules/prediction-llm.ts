import type { NextTokenLogprobsOptions, NextTokenLogprobsResult } from '@/lib/llm/types';
import type { TokenCandidate } from '../types';

export const PREDICTION_DISPLAY_COUNT = 5;
export const PREDICTION_TOP_LOGPROBS_REQUEST = 5;

export type FetchNextTokenLogprobsFn = (
  options: NextTokenLogprobsOptions
) => Promise<NextTokenLogprobsResult>;

function stripLeadingSpaceMarker(raw: string): string {
  if (raw.startsWith('Ġ') || raw.startsWith('▁')) {
    return raw.slice(1);
  }
  if (raw.startsWith(' ')) {
    return raw.slice(1);
  }
  return raw;
}

function isSpecialToken(raw: string): boolean {
  const trimmed = stripLeadingSpaceMarker(raw).trim();
  if (!trimmed) {
    return false;
  }

  if (/^<[^>]*>$/.test(trimmed)) {
    return true;
  }

  const upper = trimmed.toUpperCase();
  return (
    upper.includes('ENDOFTEXT') ||
    upper.includes('IM_START') ||
    upper.includes('IM_END') ||
    upper.includes('REPO_NAME') ||
    upper.startsWith('[INST]') ||
    upper.startsWith('[/INST]')
  );
}

function isPlausibleToken(raw: string): boolean {
  if (!raw) {
    return false;
  }
  if (isSpecialToken(raw)) {
    return false;
  }
  if (raw === ' ' || raw === 'Ġ') {
    return true;
  }
  const trimmed = stripLeadingSpaceMarker(raw).trim();
  if (!trimmed) {
    return false;
  }
  if (/^\d{1,6}$/.test(trimmed)) {
    return false;
  }
  return trimmed.length <= 24;
}

function cleanDisplayLabel(text: string): string {
  return text.replace(/[\u0120▁]/g, '').trim();
}

function displayToken(raw: string): { label: string; startsNewWord: boolean } | null {
  if (!isPlausibleToken(raw)) {
    return null;
  }

  if (raw === ' ' || raw === 'Ġ' || raw === '▁') {
    return { label: 'space', startsNewWord: true };
  }

  const startsNewWord = raw.startsWith('Ġ') || raw.startsWith('▁') || raw.startsWith(' ');
  const withoutMarker = stripLeadingSpaceMarker(raw);
  const trimmed = cleanDisplayLabel(withoutMarker);
  if (!trimmed) {
    return { label: 'space', startsNewWord: true };
  }
  if (trimmed === ',' || trimmed === '...' || trimmed === '.') {
    return { label: trimmed, startsNewWord };
  }
  if (/^[^\w\s]+$/.test(trimmed)) {
    return { label: trimmed, startsNewWord };
  }

  return { label: trimmed, startsNewWord };
}

function logprobsToCandidates(
  logprobs: NextTokenLogprobsResult['candidates'],
  maxCount = PREDICTION_DISPLAY_COUNT
): TokenCandidate[] {
  const seen = new Set<string>();
  const candidates: TokenCandidate[] = [];

  for (const entry of logprobs) {
    if (seen.has(entry.token)) {
      continue;
    }
    const display = displayToken(entry.token);
    if (!display) {
      continue;
    }
    seen.add(entry.token);
    candidates.push({
      token: display.label,
      startsNewWord: display.startsNewWord,
      weight: Math.exp(entry.logprob),
      rawToken: entry.token
    });
    if (candidates.length >= maxCount) {
      break;
    }
  }

  if (candidates.length === 0) {
    return [];
  }

  const sum = candidates.reduce((total, candidate) => total + candidate.weight, 0);
  return candidates.map((candidate) => ({
    ...candidate,
    weight: candidate.weight / sum
  }));
}

export async function fetchPredictionCandidates(
  context: string,
  temperature: number,
  fetchLogprobs: FetchNextTokenLogprobsFn
): Promise<TokenCandidate[]> {
  if (!context.trim()) {
    return [];
  }

  try {
    const result = await fetchLogprobs({
      prompt: context,
      topLogprobs: PREDICTION_TOP_LOGPROBS_REQUEST,
      temperature
    });
    return logprobsToCandidates(result.candidates);
  } catch {
    return [];
  }
}
