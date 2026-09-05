import type { InitProgressReport } from '@mlc-ai/web-llm';

// Llama-3.2-1B-Instruct-q4f16_1-MLC
export const DEFAULT_MODEL_ID = 'SmolLM2-360M-Instruct-q4f16_1-MLC';

export type LLMStatus = 'idle' | 'checking' | 'loading' | 'ready' | 'error';

export interface LLMProgress extends InitProgressReport {
  percent: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface StreamChatOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  onToken?: (token: string) => void;
}

export interface StreamChatResult {
  content: string;
}
