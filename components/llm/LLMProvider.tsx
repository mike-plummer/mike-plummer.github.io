'use client';

import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import {
  chatCompletion,
  disposeLLM,
  fetchNextTokenLogprobs,
  getLLMError,
  getLLMProgress,
  getLLMStatus,
  interruptLLM,
  isWebGPUSupported,
  loadLLM,
  streamChat,
  subscribeLLM
} from '@/lib/llm/engine';
import { DEFAULT_MODEL_ID } from '@/lib/llm/types';
import type {
  ChatMessage,
  LLMProgress,
  LLMStatus,
  NextTokenLogprobsOptions,
  NextTokenLogprobsResult,
  StreamChatOptions,
  StreamChatResult
} from '@/lib/llm/types';

interface LLMContextValue {
  status: LLMStatus;
  progress: LLMProgress;
  error: string | null;
  webGPUSupported: boolean;
  webGPUChecked: boolean;
  loadModel: () => Promise<void>;
  streamChat: (options: StreamChatOptions) => Promise<StreamChatResult>;
  chatCompletion: (options: StreamChatOptions) => Promise<StreamChatResult>;
  fetchNextTokenLogprobs: (options: NextTokenLogprobsOptions) => Promise<NextTokenLogprobsResult>;
  interruptGeneration: () => void;
}

const LLMContext = createContext<LLMContextValue | null>(null);

export function LLMProvider({
  children,
  modelId = DEFAULT_MODEL_ID
}: {
  children: ReactNode;
  modelId?: string;
}) {
  const [status, setStatus] = useState<LLMStatus>('idle');
  const [progress, setProgress] = useState<LLMProgress>({
    progress: 0,
    timeElapsed: 0,
    text: '',
    percent: 0
  });
  const [error, setError] = useState<string | null>(null);
  const [webGPUSupported, setWebGPUSupported] = useState<boolean | null>(null);

  useEffect(() => {
    setWebGPUSupported(isWebGPUSupported());

    const sync = () => {
      setStatus(getLLMStatus());
      setProgress(getLLMProgress());
      setError(getLLMError());
    };

    sync();
    const unsubscribe = subscribeLLM(sync);

    const disposeOnPageHide = () => {
      void disposeLLM();
    };
    window.addEventListener('pagehide', disposeOnPageHide);

    return () => {
      unsubscribe();
      window.removeEventListener('pagehide', disposeOnPageHide);
      interruptLLM();
      // React Strict Mode remounts providers in dev; unloading WebGPU there deadlocks init.
      if (process.env.NODE_ENV === 'production') {
        void disposeLLM();
      }
    };
  }, []);

  const value = useMemo<LLMContextValue>(
    () => ({
      status,
      progress,
      error,
      webGPUSupported: webGPUSupported ?? false,
      webGPUChecked: webGPUSupported !== null,
      loadModel: async () => {
        await loadLLM((nextProgress) => setProgress(nextProgress), modelId);
      },
      streamChat: (options) => streamChat(options, modelId),
      chatCompletion: (options) => chatCompletion(options, modelId),
      fetchNextTokenLogprobs: (options) => fetchNextTokenLogprobs(options, modelId),
      interruptGeneration: interruptLLM
    }),
    [status, progress, error, webGPUSupported, modelId]
  );

  return <LLMContext.Provider value={value}>{children}</LLMContext.Provider>;
}

export function useLLM() {
  const context = useContext(LLMContext);
  if (!context) {
    throw new Error('useLLM must be used within an LLMProvider');
  }
  return context;
}

export type { ChatMessage, StreamChatOptions, StreamChatResult };
