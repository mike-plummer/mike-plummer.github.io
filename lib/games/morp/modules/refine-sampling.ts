import type { ChatMessage } from '@/lib/llm/types';
import type { RefineSamplingConfig } from '../types';

export const REFINE_TEMPERATURE = 0.7;

export const REFINE_TOPICS = ['photosynthesis', 'plate tectonics', 'CRISPR gene editing'] as const;

export const REFINE_BROKEN_SAMPLING: RefineSamplingConfig = {
  maxTokens: 400,
  topP: 1.0,
  frequencyPenalty: 0.9,
  presencePenalty: 1.8,
  repetitionPenalty: 0.5
};

export const REFINE_TARGET_RANGES: Record<keyof RefineSamplingConfig, { min: number; max: number; label: string }> = {
  maxTokens: { min: 96, max: 256, label: 'maxTokens' },
  topP: { min: 0.85, max: 0.95, label: 'topP' },
  frequencyPenalty: { min: 0, max: 0.5, label: 'frequencyPenalty' },
  presencePenalty: { min: 0, max: 0.5, label: 'presencePenalty' },
  repetitionPenalty: { min: 1.0, max: 1.15, label: 'repetitionPenalty' }
};

/** Task-only system prompt — intentionally excludes MORP soul/persona. */
export const REFINE_SUMMARY_SYSTEM_PROMPT =
  'Write a clear, accurate summary of the scientific topic. Only output the summary, no introduction or conclusion.';

export function buildRefineUserPrompt(topic: string): string {
  return `Summarize ${topic} in 2-3 sentences for the technician log. Stay on topic.`;
}

export function buildRefineSummaryMessages(topic: string): ChatMessage[] {
  return [
    {
      role: 'system',
      content: REFINE_SUMMARY_SYSTEM_PROMPT
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
  parameters: Array<{
    key: keyof RefineSamplingConfig;
    label: string;
    formattedValue: string;
    formattedRange: string;
    ok: boolean;
  }>;
} {
  const issues: string[] = [];
  const parameters: Array<{
    key: keyof RefineSamplingConfig;
    label: string;
    formattedValue: string;
    formattedRange: string;
    ok: boolean;
  }> = [];

  for (const key of Object.keys(REFINE_TARGET_RANGES) as Array<keyof RefineSamplingConfig>) {
    const range = REFINE_TARGET_RANGES[key];
    const value = config[key];
    const formattedValue = formatRefineValue(key, value);
    const formattedRange = `${formatRefineValue(key, range.min)}–${formatRefineValue(key, range.max)}`;
    const ok = value >= range.min && value <= range.max;

    parameters.push({
      key,
      label: range.label,
      formattedValue,
      formattedRange,
      ok
    });

    if (!ok) {
      issues.push(`${range.label}: ${formattedValue} (recommended ${formattedRange})`);
    }
  }

  return { ok: issues.length === 0, issues, parameters };
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
