import type { InitProgressReport } from '@mlc-ai/web-llm';

// SmolLM2-360M-Instruct-q4f16_1-MLC
// Llama-3.2-1B-Instruct-q4f16_1-MLC
// Qwen3-1.7B-q4f16_1-MLC

export const DEFAULT_MODEL_ID = 'Qwen3-1.7B-q4f16_1-MLC';

export type LLMStatus = 'idle' | 'checking' | 'loading' | 'ready' | 'error';

export interface LLMProgress extends InitProgressReport {
  percent: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface SamplingOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  repetitionPenalty?: number;
  signal?: AbortSignal;
}

export interface StreamChatOptions extends SamplingOptions {
  messages: ChatMessage[];
  onToken?: (token: string) => void;
}

export interface StreamChatResult {
  content: string;
}

export interface TokenLogprob {
  token: string;
  logprob: number;
}

export interface NextTokenLogprobsOptions {
  prompt: string;
  topLogprobs?: number;
  temperature?: number;
  signal?: AbortSignal;
}

export interface NextTokenLogprobsResult {
  candidates: TokenLogprob[];
}
