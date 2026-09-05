import type { ChatMessage } from '@/lib/llm/types';
import type { RefineSamplingConfig } from '../types';

export const REFINE_TEMPERATURE = 0.7;

export const REFINE_TOPICS = [
  'photosynthesis',
  'plate tectonics',
  'CRISPR gene editing'
] as const;

export const REFINE_BROKEN_SAMPLING: RefineSamplingConfig = {
  maxTokens: 28,
  topP: 1.0,
  frequencyPenalty: 1.8,
  presencePenalty: 1.8,
  repetitionPenalty: 0.55
};

export const REFINE_TARGET_RANGES: Record<
  keyof RefineSamplingConfig,
  { min: number; max: number; label: string }
> = {
  maxTokens: { min: 96, max: 256, label: 'maxTokens' },
  topP: { min: 0.85, max: 0.95, label: 'topP' },
  frequencyPenalty: { min: 0, max: 0.5, label: 'frequencyPenalty' },
  presencePenalty: { min: 0, max: 0.5, label: 'presencePenalty' },
  repetitionPenalty: { min: 1.0, max: 1.15, label: 'repetitionPenalty' }
};

export function buildRefineUserPrompt(topic: string): string {
  return `Summarize ${topic} in 2-3 sentences for the technician log. Stay on topic.`;
}

export function buildRefineSummaryMessages(topic: string): ChatMessage[] {
  return [
    {
      role: 'system',
      content:
        'You are MORP. Write a clear, accurate 2-3 sentence summary of the scientific topic for a technician. Stay on topic. Do not repeat yourself.'
    },
    {
      role: 'user',
      content: buildRefineUserPrompt(topic)
    }
  ];
}

export function isRefineConfigCalibrated(config: RefineSamplingConfig): boolean {
  return evaluateRefineConfig(config).ok;
}

export function evaluateRefineConfig(config: RefineSamplingConfig): {
  ok: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  for (const key of Object.keys(REFINE_TARGET_RANGES) as Array<keyof RefineSamplingConfig>) {
    const range = REFINE_TARGET_RANGES[key];
    const value = config[key];
    if (value < range.min || value > range.max) {
      issues.push(
        `${range.label}: ${formatRefineValue(key, value)} (recommended ${formatRefineValue(key, range.min)}–${formatRefineValue(key, range.max)})`
      );
    }
  }

  return { ok: issues.length === 0, issues };
}

export function formatRefineValue(key: keyof RefineSamplingConfig, value: number): string {
  if (key === 'maxTokens') {
    return String(Math.round(value));
  }
  return value.toFixed(2);
}

export function toStreamSamplingOptions(config: RefineSamplingConfig) {
  return {
    temperature: REFINE_TEMPERATURE,
    maxTokens: config.maxTokens,
    topP: config.topP,
    frequencyPenalty: config.frequencyPenalty,
    presencePenalty: config.presencePenalty,
    repetitionPenalty: config.repetitionPenalty
  };
}
