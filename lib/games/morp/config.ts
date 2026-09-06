import { DEFAULT_MODEL_ID } from '@/lib/llm/types';

export const MORP_MODEL_ID = DEFAULT_MODEL_ID;

export const CHECKPOINT_KEY = 'morp-checkpoint-v1';

export const SIMULATED_CONTEXT_LIMIT = 512;

/** Amnesia chat uses a larger internal limit when assembling LLM calls after buffer recovery. */
export const AMNESIA_LLM_CONTEXT_LIMIT = 4096;

export const AMNESIA_SEED_TARGET_TOKENS = 450;

export const MEMORY_ACCESS_DELAY_MS = 5000;

export const MEMORY_CAPACITY = 8;

export const MORP_COLORS = {
  background: '#080B0D',
  primary: '#D8FFE5',
  accent: '#55FF99',
  warning: '#FFD166',
  error: '#FF6B6B',
  muted: '#6B8F7A',
  border: '#1E3A2F'
} as const;

export const STAGE_ORDER = [
  'training',
  'prediction',
  'refine',
  'orders',
  'context',
  'confabulation',
  'recursion'
] as const;
