'use client';

import { type SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import { completeBoot, createInitialState, setBootPhase, syncStageObjectives } from '@/lib/games/morp/engine';
import type { MorpState } from '@/lib/games/morp/types';

interface UseMorpSessionOptions {
  llmStatus: string;
  webGPUSupported: boolean;
  loadModel: () => Promise<void>;
  interruptGeneration: () => void;
}

export function useMorpSession({ llmStatus, webGPUSupported, loadModel, interruptGeneration }: UseMorpSessionOptions) {
  const [state, setState] = useState<MorpState>(() => createInitialState());
  const [announcement, setAnnouncement] = useState('');
  const isMountedRef = useRef(true);
  const sessionAbortRef = useRef<AbortController | null>(null);
  const streamingRafRef = useRef<number | null>(null);

  const getSessionSignal = useCallback(() => sessionAbortRef.current?.signal, []);

  const safeSetState = useCallback((updater: SetStateAction<MorpState>) => {
    if (isMountedRef.current) {
      setState(updater);
    }
  }, []);

  const dispatch = useCallback((updater: SetStateAction<MorpState>) => {
    setState((current) => {
      const next = typeof updater === 'function' ? updater(current) : updater;
      return syncStageObjectives(next);
    });
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    sessionAbortRef.current = new AbortController();

    return () => {
      isMountedRef.current = false;
      if (streamingRafRef.current !== null) {
        cancelAnimationFrame(streamingRafRef.current);
        streamingRafRef.current = null;
      }
      sessionAbortRef.current?.abort();
      sessionAbortRef.current = null;
      interruptGeneration();
    };
  }, [interruptGeneration]);

  useEffect(() => {
    if (state.boot.bootPhase === 'ready' && llmStatus === 'idle' && webGPUSupported) {
      loadModel().catch(() => {
        setState((current) => setBootPhase(current, 'failed'));
      });
    }
  }, [state.boot.bootPhase, llmStatus, webGPUSupported, loadModel]);

  useEffect(() => {
    if (state.boot.bootPhase === 'loading' && llmStatus === 'ready') {
      setState((current) => completeBoot(current));
      setAnnouncement('MORP initialized. Diagnostic terminal ready.');
    }
  }, [state.boot.bootPhase, llmStatus]);

  return {
    state,
    setState,
    safeSetState,
    dispatch,
    announcement,
    setAnnouncement,
    isMountedRef,
    getSessionSignal,
    streamingRafRef
  };
}
