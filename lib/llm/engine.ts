'use client';

import { CreateMLCEngine, type MLCEngine } from '@mlc-ai/web-llm';
import {
  DEFAULT_MODEL_ID,
  type LLMProgress,
  type LLMStatus,
  type NextTokenLogprobsOptions,
  type NextTokenLogprobsResult,
  type StreamChatOptions,
  type StreamChatResult,
  type TokenLogprob
} from './types';

let engine: MLCEngine | null = null;
let loadedModelId: string | null = null;
let loadPromise: Promise<MLCEngine> | null = null;
let status: LLMStatus = 'idle';
let progress: LLMProgress = { progress: 0, timeElapsed: 0, text: '', percent: 0 };
let lastError: string | null = null;

type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeLLM(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getLLMStatus() {
  return status;
}

export function getLLMProgress() {
  return progress;
}

export function getLLMError() {
  return lastError;
}

export function isWebGPUSupported() {
  return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

export async function loadLLM(
  onProgress?: (value: LLMProgress) => void,
  modelId: string = DEFAULT_MODEL_ID
): Promise<MLCEngine> {
  if (engine && loadedModelId === modelId) {
    return engine;
  }

  if (engine && loadedModelId !== modelId) {
    resetLLM();
  }

  if (loadPromise) {
    return loadPromise;
  }

  if (!isWebGPUSupported()) {
    status = 'error';
    lastError = 'WebGPU is not available in this browser. Try Chrome or Edge on desktop.';
    notify();
    throw new Error(lastError);
  }

  status = 'loading';
  notify();

  loadPromise = CreateMLCEngine(modelId, {
    initProgressCallback: (report) => {
      progress = {
        ...report,
        percent: Math.round(report.progress * 100)
      };
      onProgress?.(progress);
      notify();
    }
  })
    .then((loadedEngine) => {
      engine = loadedEngine;
      loadedModelId = modelId;
      status = 'ready';
      lastError = null;
      notify();
      return loadedEngine;
    })
    .catch((error: unknown) => {
      status = 'error';
      lastError = error instanceof Error ? error.message : 'Failed to load model';
      loadPromise = null;
      notify();
      throw error;
    });

  return loadPromise;
}

export async function streamChat(
  options: StreamChatOptions,
  modelId: string = DEFAULT_MODEL_ID
): Promise<StreamChatResult> {
  const activeEngine = await loadLLM(undefined, modelId);
  let content = '';

  const stream = await activeEngine.chat.completions.create({
    messages: options.messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 512,
    stream: true
  });

  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content ?? '';
    if (!token) {
      continue;
    }
    content += token;
    options.onToken?.(token);
  }

  return { content };
}

export async function chatCompletion(
  options: StreamChatOptions,
  modelId: string = DEFAULT_MODEL_ID
): Promise<StreamChatResult> {
  const activeEngine = await loadLLM(undefined, modelId);

  const response = await activeEngine.chat.completions.create({
    messages: options.messages,
    temperature: options.temperature ?? 0.3,
    max_tokens: options.maxTokens ?? 1024,
    stream: false
  });

  const content = response.choices[0]?.message?.content ?? '';
  return { content };
}

interface LogprobContentEntry {
  token: string;
  logprob: number;
  bytes?: number[] | null;
  top_logprobs?: Array<{ token: string; logprob: number; bytes?: number[] | null }>;
}

function tokenFromLogprobItem(item: {
  token: unknown;
  logprob: number;
  bytes?: number[] | null;
}): string | null {
  if (typeof item.token === 'string' && item.token.length > 0 && !/^\d{1,6}$/.test(item.token)) {
    return item.token;
  }

  if (item.bytes && item.bytes.length > 0) {
    return new TextDecoder().decode(new Uint8Array(item.bytes));
  }

  return null;
}

function extractTopLogprobs(
  content: LogprobContentEntry[] | null | undefined
): TokenLogprob[] {
  const entry = content?.[0];
  if (!entry?.top_logprobs?.length) {
    return [];
  }

  const candidates: TokenLogprob[] = [];

  for (const item of entry.top_logprobs) {
    const token = tokenFromLogprobItem(item);
    if (!token || typeof item.logprob !== 'number') {
      continue;
    }
    candidates.push({ token, logprob: item.logprob });
  }

  return candidates;
}

function hasUsableLogprobs(candidates: TokenLogprob[]): boolean {
  return candidates.length >= 2;
}

export async function fetchNextTokenLogprobs(
  options: NextTokenLogprobsOptions,
  modelId: string = DEFAULT_MODEL_ID
): Promise<NextTokenLogprobsResult> {
  const activeEngine = await loadLLM(undefined, modelId);
  const topLogprobs = options.topLogprobs ?? 4;
  const temperature = options.temperature ?? 1;
  // Trailing whitespace can break completion logprobs on instruct models.
  const prompt = options.prompt.trimEnd();

  const requestBase = {
    max_tokens: 1,
    temperature,
    logprobs: true,
    top_logprobs: topLogprobs
  };

  const completion = await activeEngine.completions.create({
    prompt,
    ...requestBase
  });
  const candidates = extractTopLogprobs(completion.choices[0]?.logprobs?.content);

  if (hasUsableLogprobs(candidates)) {
    return { candidates };
  }

  return { candidates: [] };
}

export function resetLLM() {
  engine = null;
  loadedModelId = null;
  loadPromise = null;
  status = 'idle';
  progress = { progress: 0, timeElapsed: 0, text: '', percent: 0 };
  lastError = null;
  notify();
}
