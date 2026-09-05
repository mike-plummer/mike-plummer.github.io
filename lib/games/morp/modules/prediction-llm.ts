import type { NextTokenLogprobsOptions, NextTokenLogprobsResult } from '@/lib/llm/types';
import type { TokenCandidate } from '../types';

export type FetchNextTokenLogprobsFn = (
  options: NextTokenLogprobsOptions
) => Promise<NextTokenLogprobsResult>;

function isPlausibleToken(raw: string): boolean {
  if (!raw) {
    return false;
  }
  if (raw === ' ' || raw === 'Ġ') {
    return true;
  }
  const trimmed = raw.replace(/^Ġ/, '').trim();
  if (!trimmed) {
    return false;
  }
  if (/^\d{1,6}$/.test(trimmed)) {
    return false;
  }
  return trimmed.length <= 24;
}

function displayToken(raw: string): string | null {
  if (!isPlausibleToken(raw)) {
    return null;
  }

  if (raw === ' ' || raw === 'Ġ') {
    return '␠';
  }

  const withoutMarker = raw.startsWith('Ġ') ? raw.slice(1) : raw;
  const trimmed = withoutMarker.trim();
  if (trimmed === ',' || trimmed === '...' || trimmed === '.') {
    return trimmed;
  }
  if (/^[^\w\s]+$/.test(trimmed)) {
    return trimmed;
  }

  return trimmed.toUpperCase();
}

function logprobsToCandidates(logprobs: NextTokenLogprobsResult['candidates']): TokenCandidate[] {
  const seen = new Set<string>();
  const candidates: TokenCandidate[] = [];

  for (const entry of logprobs) {
    const token = displayToken(entry.token);
    if (!token || seen.has(token)) {
      continue;
    }
    seen.add(token);
    candidates.push({
      token,
      weight: Math.exp(entry.logprob),
      rawToken: entry.token
    });
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
      topLogprobs: 5,
      temperature
    });
    const candidates = logprobsToCandidates(result.candidates);
    if (candidates.length >= 2) {
      return candidates;
    }
  } catch {
    // Fall through to procedural fallback.
  }

  return [];
}
