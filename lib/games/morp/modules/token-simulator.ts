import type { TokenCandidate } from '../types';

export function applyTemperature(candidates: TokenCandidate[], temperature: number): TokenCandidate[] {
  if (candidates.length === 0) {
    return [];
  }

  const temp = Math.max(temperature, 0.05);
  const logits = candidates.map((c) => Math.log(Math.max(c.weight, 1e-6)) / temp);
  const maxLogit = Math.max(...logits);
  const exp = logits.map((l) => Math.exp(l - maxLogit));
  const sum = exp.reduce((a, b) => a + b, 0);

  return candidates.map((c, i) => ({
    token: c.token,
    weight: exp[i] / sum
  }));
}

export function sampleCandidate(candidates: TokenCandidate[], temperature: number): TokenCandidate {
  const adjusted = applyTemperature(candidates, temperature);
  let roll = Math.random();
  for (const candidate of adjusted) {
    roll -= candidate.weight;
    if (roll <= 0) {
      return candidate;
    }
  }
  return adjusted[adjusted.length - 1];
}

export function getTopCandidate(candidates: TokenCandidate[]): string {
  return candidates.reduce((best, c) => (c.weight > best.weight ? c : best)).token;
}

export function formatTokenForAppend(token: string, rawToken?: string): string {
  const value = rawToken ?? token;
  if (value.startsWith(' ')) {
    return value;
  }
  if (value === ',' || value === '...') {
    return value;
  }
  if (/^[^\w\s]/.test(value)) {
    return value;
  }
  return ` ${value}`;
}
