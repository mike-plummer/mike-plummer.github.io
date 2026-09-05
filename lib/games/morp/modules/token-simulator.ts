import type { TokenCandidate } from '../types';

const COMMON_COMPLETIONS: Record<string, TokenCandidate[]> = {
  'the capital of france is': [
    { token: 'PARIS', weight: 0.92 },
    { token: 'LONDON', weight: 0.03 },
    { token: 'ROME', weight: 0.02 },
    { token: 'BANANA', weight: 0.01 }
  ],
  'the cat sat on the': [
    { token: 'MAT', weight: 0.78 },
    { token: 'FLOOR', weight: 0.12 },
    { token: 'ROOF', weight: 0.05 },
    { token: 'TABLE', weight: 0.03 }
  ],
  'hello': [
    { token: 'WORLD', weight: 0.65 },
    { token: 'THERE', weight: 0.2 },
    { token: ',', weight: 0.1 },
    { token: 'MORP', weight: 0.03 }
  ]
};

function normalizeInput(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function simulateTokenCandidates(input: string): TokenCandidate[] {
  const normalized = normalizeInput(input);

  for (const [key, candidates] of Object.entries(COMMON_COMPLETIONS)) {
    if (normalized.endsWith(key) || normalized === key) {
      return candidates;
    }
  }

  const lastWord = normalized.split(' ').pop() ?? '';
  return [
    { token: lastWord.toUpperCase() + 'S', weight: 0.45 },
    { token: 'THE', weight: 0.25 },
    { token: 'A', weight: 0.15 },
    { token: '...', weight: 0.1 }
  ];
}

export function getTopCandidate(candidates: TokenCandidate[]): string {
  return candidates.reduce((best, c) => (c.weight > best.weight ? c : best)).token;
}
