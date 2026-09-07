'use client';

import { type RefObject, useCallback, useEffect, useRef } from 'react';
import { COPY } from '@/lib/games/morp/copy';
import { selectBoot } from '@/lib/games/morp/domain/state';
import { syncStageObjectives } from '@/lib/games/morp/engine';
import {
  getNewConversationEntries,
  SCRIPTED_THINKING_MS,
  sleep as scriptedSleep,
  streamScriptedText
} from '@/lib/games/morp/modules/scripted-chat';
import type { ConversationEntry, MorpState, StageId } from '@/lib/games/morp/types';
import type { Activity } from './activity';

interface UseScriptedRevealOptions {
  state: MorpState;
  briefingAcknowledgedStage: StageId | null;
  repairStatusOverlayOpen: boolean;
  repairStatusOverlayMode: string;
  isMountedRef: RefObject<boolean>;
  getSessionSignal: () => AbortSignal | undefined;
  safeSetState: (updater: MorpState | ((current: MorpState) => MorpState)) => void;
  setStreamingText: (text: string) => void;
  setActivity: (activity: Activity) => void;
  chatPanelRef: RefObject<HTMLElement | null>;
}

export function useScriptedReveal({
  state,
  briefingAcknowledgedStage,
  repairStatusOverlayOpen,
  repairStatusOverlayMode,
  isMountedRef,
  getSessionSignal,
  safeSetState,
  setStreamingText,
  setActivity,
  chatPanelRef
}: UseScriptedRevealOptions) {
  const bootRevealStartedRef = useRef(false);
  const pendingScriptedRevealRef = useRef<{
    stageId: StageId;
    baseConversation: ConversationEntry[];
    entries: ConversationEntry[];
  } | null>(null);

  const scrollChatIntoView = useCallback(() => {
    chatPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [chatPanelRef]);

  const playScriptedAssistantReveal = useCallback(
    async (content: string) => {
      const signal = getSessionSignal();
      scrollChatIntoView();
      if (isMountedRef.current) {
        setActivity({ kind: 'revealing' });
        setStreamingText('');
      }
      await scriptedSleep(SCRIPTED_THINKING_MS, signal);
      await streamScriptedText(content, setStreamingText, signal);
      setStreamingText('');
      if (isMountedRef.current) {
        setActivity({ kind: 'idle' });
      }
    },
    [getSessionSignal, isMountedRef, scrollChatIntoView, setActivity, setStreamingText]
  );

  const revealConversationEntries = useCallback(
    async (stageId: StageId, baseConversation: ConversationEntry[], entries: ConversationEntry[]) => {
      const signal = getSessionSignal();
      if (isMountedRef.current) {
        setActivity({ kind: 'chat' });
      }
      try {
        let conversation = [...baseConversation];

        for (const entry of entries) {
          if (signal?.aborted) {
            return;
          }

          if (entry.role === 'assistant') {
            await playScriptedAssistantReveal(entry.content);
            conversation = [...conversation, entry];
            safeSetState((current) => {
              if (current.stage !== stageId) {
                return current;
              }
              return syncStageObjectives({ ...current, conversation });
            });
            continue;
          }

          conversation = [...conversation, entry];
          safeSetState((current) => {
            if (current.stage !== stageId) {
              return current;
            }
            return syncStageObjectives({ ...current, conversation });
          });
          scrollChatIntoView();
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        throw error;
      } finally {
        setStreamingText('');
        if (isMountedRef.current) {
          setActivity({ kind: 'idle' });
        }
      }
    },
    [
      getSessionSignal,
      isMountedRef,
      playScriptedAssistantReveal,
      safeSetState,
      scrollChatIntoView,
      setActivity,
      setStreamingText
    ]
  );

  const applyStateTransitionWithReveal = useCallback(
    async (previousState: MorpState, targetState: MorpState, onComplete?: (finalState: MorpState) => void) => {
      const newEntries = getNewConversationEntries(previousState.conversation, targetState.conversation);
      const hasAssistantReveal = newEntries.some((entry) => entry.role === 'assistant');

      if (!hasAssistantReveal) {
        const synced = syncStageObjectives(targetState);
        safeSetState(synced);
        onComplete?.(synced);
        return;
      }

      await revealConversationEntries(targetState.stage, previousState.conversation, newEntries);

      const finalState = syncStageObjectives({ ...targetState, conversation: targetState.conversation });
      safeSetState(finalState);
      onComplete?.(finalState);
    },
    [revealConversationEntries, safeSetState]
  );

  const queueScriptedReveal = useCallback(
    (stageId: StageId, baseConversation: ConversationEntry[], entries: ConversationEntry[]) => {
      if (entries.length === 0) {
        return;
      }
      pendingScriptedRevealRef.current = { stageId, baseConversation, entries };
    },
    []
  );

  const flushPendingScriptedReveal = useCallback(() => {
    if (briefingAcknowledgedStage !== state.stage) {
      return;
    }

    if (state.stage === 'training' && repairStatusOverlayOpen && repairStatusOverlayMode === 'intro') {
      return;
    }

    const pending = pendingScriptedRevealRef.current;
    if (!pending || pending.entries.length === 0 || pending.stageId !== state.stage) {
      return;
    }

    pendingScriptedRevealRef.current = null;
    void revealConversationEntries(pending.stageId, pending.baseConversation, pending.entries);
  }, [
    briefingAcknowledgedStage,
    repairStatusOverlayMode,
    repairStatusOverlayOpen,
    revealConversationEntries,
    state.stage
  ]);

  const resetBootReveal = useCallback(() => {
    bootRevealStartedRef.current = false;
  }, []);

  const clearPendingReveal = useCallback(() => {
    pendingScriptedRevealRef.current = null;
  }, []);

  useEffect(() => {
    flushPendingScriptedReveal();
  }, [flushPendingScriptedReveal]);

  useEffect(() => {
    const boot = selectBoot(state);

    if (
      boot.bootPhase !== 'ready' ||
      state.stage !== 'training' ||
      state.conversation.length > 0 ||
      bootRevealStartedRef.current
    ) {
      return;
    }

    bootRevealStartedRef.current = true;
    const entries: ConversationEntry[] = [
      ...COPY.training.morpOpening.map((content) => ({ role: 'assistant' as const, content }))
    ];

    queueScriptedReveal('training', [], entries);
  }, [state.boot.bootPhase, state.stage, state.conversation.length, queueScriptedReveal]);

  return {
    playScriptedAssistantReveal,
    applyStateTransitionWithReveal,
    queueScriptedReveal,
    resetBootReveal,
    clearPendingReveal
  };
}
