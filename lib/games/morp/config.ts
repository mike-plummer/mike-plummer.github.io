import { DEFAULT_MODEL_ID } from '@/lib/llm/types';

export const MORP_MODEL_ID = DEFAULT_MODEL_ID;

export const CHECKPOINT_KEY = 'morp-checkpoint-v1';

export const SIMULATED_CONTEXT_LIMIT = 512;

/** Amnesia chat uses a larger internal limit when assembling LLM calls after buffer recovery. */
export const AMNESIA_LLM_CONTEXT_LIMIT = 4096;

export const AMNESIA_SEED_TARGET_TOKENS = 450;

export const MEMORY_ACCESS_DELAY_MS = 5000;

export const MEMORY_CAPACITY = 8;

/** Minimum oldest messages to fold into one summary. */
export const SUMMARIZE_MIN_BATCH_MESSAGES = 2;

/** Recent messages always kept out of the summarize batch. */
export const SUMMARIZE_MIN_REMAINING_MESSAGES = 2;

/** Target clearance below the simulated context limit after summarizing. */
export const SUMMARIZE_TARGET_HEADROOM_TOKENS = 48;

/** When not overflowing, still aim for at least this much token reduction. */
export const SUMMARIZE_MIN_REDUCTION_WHEN_UNDER_LIMIT = 64;
