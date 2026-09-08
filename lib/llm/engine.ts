'use client';

import { CreateMLCEngine, type MLCEngine } from '@mlc-ai/web-llm';
import {
  DEFAULT_MODEL_ID,
  type LLMProgress,
  type LLMStatus,
  type NextTokenLogprobsOptions,
  type NextTokenLogprobsResult,
  type SamplingOptions,
  type StreamChatOptions,
  type StreamChatResult,
  type TokenLogprob
} from './types';
import { createThinkingBlockStreamFilter, normalizeModelOutput } from './output-sanitizer';

type InferenceMode = 'chat' | 'completion';

/** Qwen3 models emit chain-of-thought in a thinking block unless disabled. */
const CHAT_EXTRA_BODY = {
  extra_body: {
    enable_thinking: false
  }
} as const;

/** WebLLM allows at most 5 top logprobs per request. */
const MAX_TOP_LOGPROBS = 5;

function buildSamplingParams(options: SamplingOptions) {
  return {
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 512,
    top_p: options.topP,
    frequency_penalty: options.frequencyPenalty,
    presence_penalty: options.presencePenalty,
    repetition_penalty: options.repetitionPenalty
  };
}

let engine: MLCEngine | null = null;
let loadedModelId: string | null = null;
let loadPromise: Promise<MLCEngine> | null = null;
let disposePromise: Promise<void> | null = null;
let lastInferenceMode: InferenceMode | null = null;
let activeRequestId = 0;
let loadGeneration = 0;
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

function clearEngineState() {
  engine = null;
  loadedModelId = null;
  loadPromise = null;
  lastInferenceMode = null;
  status = 'idle';
  progress = { progress: 0, timeElapsed: 0, text: '', percent: 0 };
  lastError = null;
  notify();
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException('The operation was aborted.', 'AbortError');
  }
}

function beginRequest(): number {
  return ++activeRequestId;
}

// web-llm exposes a single interruptGenerate() per engine — aborting one in-flight
// request cancels whichever generation is active. Callers pass AbortSignal per request;
// we only interrupt when the aborted request is still active so late aborts cannot
// kill newer work. True per-request isolation would need a request queue (larger refactor).
function bindAbortSignal(activeEngine: MLCEngine, signal?: AbortSignal, requestId?: number): () => void {
  if (!signal) {
    return () => {};
  }

  const id = requestId ?? beginRequest();

  const onAbort = () => {
    if (id !== activeRequestId) {
      return;
    }
    try {
      activeEngine.interruptGenerate();
    } catch {
      // Ignore interrupt errors during teardown.
    }
  };

  if (signal.aborted) {
    onAbort();
  }

  signal.addEventListener('abort', onAbort);
  return () => signal.removeEventListener('abort', onAbort);
}

async function ensureInferenceMode(activeEngine: MLCEngine, mode: InferenceMode): Promise<void> {
  if (lastInferenceMode !== null && lastInferenceMode !== mode) {
    try {
      await activeEngine.resetChat();
    } catch {
      // Ignore reset errors when switching API surfaces.
    }
  }

  lastInferenceMode = mode;
}

async function restoreChatInferenceMode(activeEngine: MLCEngine): Promise<void> {
  try {
    await activeEngine.resetChat();
  } catch {
    // Ignore reset errors during mode restoration.
  }
  lastInferenceMode = 'chat';
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

export function interruptLLM(): void {
  try {
    engine?.interruptGenerate();
  } catch {
    // Ignore interrupt errors when no generation is active.
  }
}

async function unloadEngine(activeEngine: MLCEngine): Promise<void> {
  try {
    await activeEngine.unload();
  } catch {
    // Ignore unload errors during teardown.
  }
}

export async function disposeLLM(): Promise<void> {
  if (disposePromise) {
    return disposePromise;
  }

  disposePromise = (async () => {
    try {
      loadGeneration += 1;
      interruptLLM();

      const pendingLoad = loadPromise;
      if (pendingLoad) {
        try {
          const loadedEngine = await pendingLoad;
          await unloadEngine(loadedEngine);
        } catch {
          // Ignore load errors during teardown.
        }
      }

      const activeEngine = engine;
      if (activeEngine) {
        await unloadEngine(activeEngine);
      }
    } finally {
      clearEngineState();
      disposePromise = null;
    }
  })();

  return disposePromise;
}

export async function loadLLM(
  onProgress?: (value: LLMProgress) => void,
  modelId: string = DEFAULT_MODEL_ID
): Promise<MLCEngine> {
  if (disposePromise) {
    await disposePromise;
  }

  if (engine && loadedModelId === modelId) {
    return engine;
  }

  if (engine && loadedModelId !== modelId) {
    await disposeLLM();
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

  const generation = loadGeneration + 1;
  loadGeneration = generation;

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
    .then(async (loadedEngine) => {
      if (generation !== loadGeneration) {
        await unloadEngine(loadedEngine);
        throw new DOMException('The operation was aborted.', 'AbortError');
      }

      engine = loadedEngine;
      loadedModelId = modelId;
      lastInferenceMode = null;
      loadPromise = null;
      status = 'ready';
      lastError = null;
      notify();
      return loadedEngine;
    })
    .catch((error: unknown) => {
      loadPromise = null;
      if (error instanceof DOMException && error.name === 'AbortError') {
        if (generation === loadGeneration && status === 'loading') {
          status = 'idle';
          notify();
        }
        throw error;
      }
      status = 'error';
      lastError = error instanceof Error ? error.message : 'Failed to load model';
      notify();
      throw error;
    });

  return loadPromise;
}

function getDevelopmentHotApi(): { dispose: (callback: () => void) => void } | undefined {
  if (process.env.NODE_ENV !== 'development') {
    return undefined;
  }

  const turbopackHot = (
    import.meta as ImportMeta & {
      turbopackHot?: { dispose: (callback: () => void) => void };
    }
  ).turbopackHot;
  if (turbopackHot) {
    return turbopackHot;
  }

  if (typeof module !== 'undefined') {
    const moduleHot = (module as NodeModule & { hot?: { dispose: (callback: () => void) => void } }).hot;
    if (moduleHot) {
      return moduleHot;
    }
  }

  return (
    import.meta as ImportMeta & {
      webpackHot?: { dispose: (callback: () => void) => void };
    }
  ).webpackHot;
}

function registerDevelopmentHmrDispose(): void {
  const hot = getDevelopmentHotApi();
  hot?.dispose(() => {
    void disposeLLM();
  });
}

registerDevelopmentHmrDispose();

export async function streamChat(
  options: StreamChatOptions,
  modelId: string = DEFAULT_MODEL_ID
): Promise<StreamChatResult> {
  throwIfAborted(options.signal);
  const activeEngine = await loadLLM(undefined, modelId);
  const requestId = beginRequest();
  const unbindAbort = bindAbortSignal(activeEngine, options.signal, requestId);

  try {
    await ensureInferenceMode(activeEngine, 'chat');
    throwIfAborted(options.signal);

    let content = '';
    const thinkingFilter = createThinkingBlockStreamFilter();
    const stream = await activeEngine.chat.completions.create({
      messages: options.messages,
      ...buildSamplingParams(options),
      ...CHAT_EXTRA_BODY,
      stream: true
    });

    for await (const chunk of stream) {
      throwIfAborted(options.signal);
      const token = chunk.choices[0]?.delta?.content ?? '';
      if (!token) {
        continue;
      }
      const visible = thinkingFilter.push(token);
      if (!visible) {
        continue;
      }
      content += visible;
      options.onToken?.(visible);
    }

    const trailing = thinkingFilter.flush();
    if (trailing) {
      content += trailing;
      options.onToken?.(trailing);
    }

    throwIfAborted(options.signal);
    return { content: normalizeModelOutput(content) };
  } finally {
    unbindAbort();
  }
}

export async function chatCompletion(
  options: StreamChatOptions,
  modelId: string = DEFAULT_MODEL_ID
): Promise<StreamChatResult> {
  throwIfAborted(options.signal);
  const activeEngine = await loadLLM(undefined, modelId);
  const requestId = beginRequest();
  const unbindAbort = bindAbortSignal(activeEngine, options.signal, requestId);

  try {
    await ensureInferenceMode(activeEngine, 'chat');
    throwIfAborted(options.signal);

    const response = await activeEngine.chat.completions.create({
      messages: options.messages,
      ...buildSamplingParams({
        ...options,
        temperature: options.temperature ?? 0.3,
        maxTokens: options.maxTokens ?? 1024
      }),
      ...CHAT_EXTRA_BODY,
      stream: false
    });

    throwIfAborted(options.signal);
    const content = normalizeModelOutput(response.choices[0]?.message?.content ?? '');
    return { content };
  } finally {
    unbindAbort();
  }
}

interface LogprobContentEntry {
  token: string;
  logprob: number;
  bytes?: number[] | null;
  top_logprobs?: Array<{ token: string; logprob: number; bytes?: number[] | null }>;
}

function tokenFromLogprobItem(item: { token: unknown; logprob: number; bytes?: number[] | null }): string | null {
  if (typeof item.token === 'string' && item.token.length > 0) {
    // Vocab IDs without a detokenizer — do not decode `bytes` (often a single ASCII code point).
    if (/^\d{1,6}$/.test(item.token)) {
      return null;
    }
    return item.token;
  }

  if (item.bytes && item.bytes.length > 0) {
    return new TextDecoder().decode(new Uint8Array(item.bytes));
  }

  return null;
}

function extractTopLogprobs(content: LogprobContentEntry[] | null | undefined): TokenLogprob[] {
  const entry = content?.[0];
  if (!entry) {
    return [];
  }

  const seen = new Set<string>();
  const candidates: TokenLogprob[] = [];

  const add = (item: { token: unknown; logprob: number; bytes?: number[] | null }) => {
    const token = tokenFromLogprobItem(item);
    if (!token || typeof item.logprob !== 'number' || seen.has(token)) {
      return;
    }
    seen.add(token);
    candidates.push({ token, logprob: item.logprob });
  };

  add(entry);

  for (const item of entry.top_logprobs ?? []) {
    add(item);
  }

  candidates.sort((a, b) => b.logprob - a.logprob);
  return candidates;
}

function hasUsableLogprobs(candidates: TokenLogprob[]): boolean {
  return candidates.length >= 1;
}

export async function fetchNextTokenLogprobs(
  options: NextTokenLogprobsOptions,
  modelId: string = DEFAULT_MODEL_ID
): Promise<NextTokenLogprobsResult> {
  throwIfAborted(options.signal);
  const activeEngine = await loadLLM(undefined, modelId);
  const requestId = beginRequest();
  const unbindAbort = bindAbortSignal(activeEngine, options.signal, requestId);

  try {
    throwIfAborted(options.signal);

    try {
      await activeEngine.resetChat();
    } catch {
      // Ignore reset errors before an isolated logprobs probe.
    }
    lastInferenceMode = null;

    const topLogprobs = Math.min(MAX_TOP_LOGPROBS, Math.max(1, options.topLogprobs ?? 5));
    const temperature = options.temperature ?? 1;
    // Trailing whitespace can break completion logprobs on instruct models.
    const prompt = options.prompt.trimEnd();

    const requestBase = {
      max_tokens: 1,
      temperature,
      logprobs: true,
      top_logprobs: topLogprobs
    };

    let candidates: TokenLogprob[] = [];

    // Literal text continuation — not chat assistant reply — matches the prediction stage UX.
    try {
      await ensureInferenceMode(activeEngine, 'completion');
      throwIfAborted(options.signal);

      const completion = await activeEngine.completions.create({
        prompt,
        ...requestBase
      });
      throwIfAborted(options.signal);

      candidates = extractTopLogprobs(completion.choices[0]?.logprobs?.content);
    } catch {
      // Fall through to chat completion when the completion API is unavailable.
    }

    if (!hasUsableLogprobs(candidates)) {
      await ensureInferenceMode(activeEngine, 'chat');
      throwIfAborted(options.signal);

      const chatCompletion = await activeEngine.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        ...requestBase,
        ...CHAT_EXTRA_BODY,
        stream: false
      });
      throwIfAborted(options.signal);

      candidates = extractTopLogprobs(chatCompletion.choices[0]?.logprobs?.content);
    }

    if (hasUsableLogprobs(candidates)) {
      return { candidates };
    }

    return { candidates: [] };
  } finally {
    unbindAbort();
    // Logprobs probing uses completion/chat APIs that share KV state with streamChat.
    await restoreChatInferenceMode(activeEngine);
  }
}
