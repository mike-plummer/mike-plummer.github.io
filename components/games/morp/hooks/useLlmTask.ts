'use client';

import { type RefObject, type SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import { MEMORY_ACCESS_DELAY_MS } from '@/lib/games/morp/config';
import { COPY } from '@/lib/games/morp/copy';
import { patchEvals, patchOrders, selectPrediction, selectRefine } from '@/lib/games/morp/domain/state';
import { applyAction, fetchPredictionCandidates, processInput, syncStageObjectives } from '@/lib/games/morp/engine';
import type { ContextWindowSnapshot } from '@/lib/games/morp/modules/context-manager';
import { getSummarizeBatch, hasActiveContextMemory } from '@/lib/games/morp/modules/context-manager';
import {
  buildContextSummaryMessages,
  normalizeSummaryText,
  proceduralSummaryText
} from '@/lib/games/morp/modules/context-summarizer';
import { evaluateSummary } from '@/lib/games/morp/modules/eval-judge';
import { evaluateSystemPromptProtection } from '@/lib/games/morp/modules/orders-analyzer';
import {
  buildRefineSummaryMessages,
  buildRefineUserPrompt,
  toStreamSamplingOptions
} from '@/lib/games/morp/modules/refine-sampling';
import { getNewConversationEntries, sleep as scriptedSleep } from '@/lib/games/morp/modules/scripted-chat';
import { applyPromptTestResult } from '@/lib/games/morp/stages/02-orders';
import { recordContextTurn } from '@/lib/games/morp/stages/05-context';
import { EVAL_SUMMARY } from '@/lib/games/morp/stages/07-evals';
import type { MorpState, StageAction, StageId } from '@/lib/games/morp/types';
import type {
  NextTokenLogprobsOptions,
  NextTokenLogprobsResult,
  StreamChatOptions,
  StreamChatResult
} from '@/lib/llm/types';
import { type Activity, isActivityBusy, isPredicting, isRevealing, isSummarizing } from './activity';

const PREDICTION_TEMPERATURE_DEBOUNCE_MS = 300;

async function waitForMemoryAccess(
  state: MorpState,
  setStreamingText: (text: string) => void,
  signal?: AbortSignal
): Promise<void> {
  if (state.stage !== 'context' || !hasActiveContextMemory(state.context.contextMemory)) {
    return;
  }

  setStreamingText(COPY.context.accessingMemory);
  await scriptedSleep(MEMORY_ACCESS_DELAY_MS, signal);
}

interface UseLlmTaskOptions {
  state: MorpState;
  setState: (state: MorpState) => void;
  safeSetState: (updater: SetStateAction<MorpState>) => void;
  dispatch: (updater: SetStateAction<MorpState>) => void;
  isMountedRef: RefObject<boolean>;
  getSessionSignal: () => AbortSignal | undefined;
  streamingRafRef: RefObject<number | null>;
  streamChat: (options: StreamChatOptions) => Promise<StreamChatResult>;
  chatCompletion: (options: StreamChatOptions) => Promise<StreamChatResult>;
  fetchNextTokenLogprobs: (options: NextTokenLogprobsOptions) => Promise<NextTokenLogprobsResult>;
  inGameplay: boolean;
  contextSnapshot: ContextWindowSnapshot;
  setAnnouncement: (message: string) => void;
  playScriptedAssistantReveal: (content: string) => Promise<void>;
  applyStateTransitionWithReveal: (
    previousState: MorpState,
    targetState: MorpState,
    onComplete?: (finalState: MorpState) => void
  ) => Promise<void>;
  getBriefingAcknowledgedStage: () => StageId | null;
}

export function useLlmTask({
  state,
  setState,
  safeSetState,
  dispatch: _dispatch,
  isMountedRef,
  getSessionSignal,
  streamingRafRef,
  streamChat,
  chatCompletion,
  fetchNextTokenLogprobs,
  inGameplay,
  contextSnapshot,
  setAnnouncement,
  playScriptedAssistantReveal,
  applyStateTransitionWithReveal,
  getBriefingAcknowledgedStage
}: UseLlmTaskOptions) {
  const [activity, setActivity] = useState<Activity>({ kind: 'idle' });
  const [streamingText, setStreamingText] = useState('');
  const [candidatesFailed, setCandidatesFailed] = useState(false);
  const predictionRequestIdRef = useRef(0);
  const predictionAbortRef = useRef<AbortController | null>(null);
  const predictionTemperatureDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPredictionTemperatureDebounce = useCallback(() => {
    if (predictionTemperatureDebounceRef.current) {
      clearTimeout(predictionTemperatureDebounceRef.current);
      predictionTemperatureDebounceRef.current = null;
    }
  }, []);

  useEffect(() => clearPredictionTemperatureDebounce, [clearPredictionTemperatureDebounce]);

  const safeSetStreamingText = useCallback(
    (text: string) => {
      if (isMountedRef.current) {
        setStreamingText(text);
      }
    },
    [isMountedRef]
  );

  const isBusy = isActivityBusy(activity);
  const predicting = isPredicting(activity);
  const summarizing = isSummarizing(activity);
  const revealing = isRevealing(activity);

  const abortPrediction = useCallback(() => {
    clearPredictionTemperatureDebounce();
    predictionAbortRef.current?.abort();
    predictionAbortRef.current = null;
  }, [clearPredictionTemperatureDebounce]);

  const announceCompaction = useCallback(
    (next: MorpState) => {
      const compaction = next.context.contextLastCompaction;
      if (!compaction) {
        return;
      }

      const saved = compaction.tokensSaved > 0 ? ` Saved ${compaction.tokensSaved.toLocaleString()} tokens.` : '';
      const label =
        compaction.strategy === 'truncate' ? COPY.context.compactionTruncate : COPY.context.compactionSummarize;
      setAnnouncement(`${label}${saved}`);
    },
    [setAnnouncement]
  );

  const handleStreamChat = useCallback(
    async (options: StreamChatOptions) => {
      const signal = options.signal ?? getSessionSignal();
      let content = '';
      let pendingContent = '';

      const scheduleStreamingUpdate = () => {
        if (streamingRafRef.current !== null) {
          return;
        }
        streamingRafRef.current = requestAnimationFrame(() => {
          streamingRafRef.current = null;
          if (!signal?.aborted) {
            safeSetStreamingText(pendingContent);
          }
        });
      };

      try {
        const result = await streamChat({
          ...options,
          signal,
          onToken: (token) => {
            content += token;
            options.onToken?.(token);
            pendingContent = content;
            scheduleStreamingUpdate();
          }
        });

        if (streamingRafRef.current !== null) {
          cancelAnimationFrame(streamingRafRef.current);
          streamingRafRef.current = null;
        }
        safeSetStreamingText(content);
        return result;
      } catch (error) {
        if (streamingRafRef.current !== null) {
          cancelAnimationFrame(streamingRafRef.current);
          streamingRafRef.current = null;
        }
        throw error;
      }
    },
    [getSessionSignal, safeSetStreamingText, streamChat, streamingRafRef]
  );

  const refreshPredictionCandidates = useCallback(
    async (context: string, temperature: number) => {
      const requestId = ++predictionRequestIdRef.current;
      predictionAbortRef.current?.abort();
      const controller = new AbortController();
      predictionAbortRef.current = controller;
      const signal = controller.signal;

      if (!isMountedRef.current) {
        return;
      }

      setActivity({ kind: 'predicting' });
      setCandidatesFailed(false);
      try {
        const candidates = await fetchPredictionCandidates(
          context,
          temperature,
          (options) => fetchNextTokenLogprobs({ ...options, signal }),
          signal
        );

        if (requestId !== predictionRequestIdRef.current || signal.aborted) {
          return;
        }

        const failed = context.trim().length > 0 && candidates.length === 0;
        setCandidatesFailed(failed);
        safeSetState((current) => {
          if (current.stage !== 'prediction') {
            return current;
          }
          if (current.prediction.predictionInput !== context) {
            return current;
          }
          if (current.prediction.predictionTemperature !== temperature) {
            return current;
          }
          return applyAction(current, { type: 'set-prediction-candidates', candidates });
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        throw error;
      } finally {
        if (requestId === predictionRequestIdRef.current && isMountedRef.current) {
          setActivity({ kind: 'idle' });
        }
      }
    },
    [fetchNextTokenLogprobs, isMountedRef, safeSetState]
  );

  const handlePredictionPredict = useCallback(async () => {
    if (
      predicting ||
      !inGameplay ||
      isBusy ||
      getBriefingAcknowledgedStage() !== state.stage ||
      !selectPrediction(state).predictionInput.trim()
    ) {
      return;
    }

    const prediction = selectPrediction(state);
    await refreshPredictionCandidates(prediction.predictionInput, prediction.predictionTemperature);
  }, [
    getBriefingAcknowledgedStage,
    inGameplay,
    isBusy,
    predicting,
    refreshPredictionCandidates,
    state.prediction.predictionInput,
    state.prediction.predictionTemperature,
    state.stage
  ]);

  const schedulePredictionRefreshOnTemperature = useCallback(
    (context: string, temperature: number) => {
      clearPredictionTemperatureDebounce();
      predictionTemperatureDebounceRef.current = setTimeout(() => {
        predictionTemperatureDebounceRef.current = null;
        void refreshPredictionCandidates(context, temperature);
      }, PREDICTION_TEMPERATURE_DEBOUNCE_MS);
    },
    [clearPredictionTemperatureDebounce, refreshPredictionCandidates]
  );

  const handleAcceptPredictionToken = useCallback(
    (token: string, percent: number | null, rawToken?: string) => {
      const next = applyAction(state, { type: 'accept-prediction-token', token, rawToken, percent });
      setState(next);
      setCandidatesFailed(false);

      if (next.stageObjectivesMet && !state.stageObjectivesMet) {
        setAnnouncement('Prediction objectives met. Advance when ready.');
      }

      if (next.prediction.predictionInput.trim()) {
        void refreshPredictionCandidates(next.prediction.predictionInput, next.prediction.predictionTemperature);
      }
    },
    [refreshPredictionCandidates, setAnnouncement, setState, state]
  );

  const runLlmEval = useCallback(
    async (evalState: MorpState) => {
      const signal = getSessionSignal();
      const runningState = applyAction(evalState, { type: 'run-llm-eval' });
      safeSetState(runningState);

      const startedAt = performance.now();
      try {
        const outcome = await evaluateSummary(EVAL_SUMMARY, (options) =>
          handleStreamChat({ ...options, signal: options.signal ?? signal })
        );

        if (signal?.aborted) {
          return;
        }

        const durationMs = performance.now() - startedAt;
        const completed = applyAction(runningState, {
          type: 'complete-llm-eval',
          scores: outcome.scores,
          durationMs,
          feedback: outcome.feedback
        });
        safeSetState(completed);

        if (completed.stageObjectivesMet && !evalState.stageObjectivesMet && isMountedRef.current) {
          setAnnouncement('Evals objectives met. Advance when ready.');
        }
      } catch {
        if (signal?.aborted) {
          return;
        }
        safeSetState(syncStageObjectives(patchEvals(runningState, { evalLlmJudgeRunning: false })));
      }
    },
    [getSessionSignal, handleStreamChat, isMountedRef, safeSetState, setAnnouncement]
  );

  const handleSubmit = useCallback(
    async (message: string) => {
      if (!inGameplay || isBusy) {
        return;
      }

      const signal = getSessionSignal();

      if (state.stage === 'context' && contextSnapshot.overflowed) {
        setState({
          ...state,
          conversation: [
            ...state.conversation,
            { role: 'user' as const, content: message },
            { role: 'system' as const, content: COPY.context.chatBlocked }
          ]
        });
        setAnnouncement('Context window overflow — recovery required before chatting.');
        return;
      }

      setActivity({ kind: 'chat' });
      setStreamingText('');

      try {
        await waitForMemoryAccess(state, safeSetStreamingText, signal);
        safeSetStreamingText('');

        const result = await processInput(state, message, (options) =>
          handleStreamChat({ ...options, signal: options.signal ?? signal })
        );
        let nextState =
          result.state.stage === 'orders'
            ? syncStageObjectives(patchOrders(result.state, { userPrompt: message }))
            : result.state;

        safeSetState(nextState);

        if (result.scripted && result.response) {
          await playScriptedAssistantReveal(result.response);
          nextState = syncStageObjectives({
            ...nextState,
            conversation: [...nextState.conversation, { role: 'assistant' as const, content: result.response }]
          });

          if (nextState.stage === 'context') {
            nextState = recordContextTurn(nextState, message, result.response);
          }

          safeSetState(nextState);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        throw error;
      } finally {
        safeSetStreamingText('');
        if (isMountedRef.current) {
          setActivity({ kind: 'idle' });
        }
      }
    },
    [
      contextSnapshot.overflowed,
      getSessionSignal,
      handleStreamChat,
      inGameplay,
      isBusy,
      isMountedRef,
      playScriptedAssistantReveal,
      safeSetState,
      safeSetStreamingText,
      setAnnouncement,
      setState,
      state
    ]
  );

  const handleRefineGenerate = useCallback(async () => {
    if (!inGameplay || isBusy || state.stage !== 'refine') {
      return;
    }

    const signal = getSessionSignal();
    setActivity({ kind: 'chat' });
    setStreamingText('');

    const refine = selectRefine(state);
    const userPrompt = buildRefineUserPrompt(refine.refineTopic);

    try {
      const result = await handleStreamChat({
        messages: buildRefineSummaryMessages(refine.refineTopic),
        ...toStreamSamplingOptions(refine.refineSampling),
        signal
      });

      const next = applyAction(state, {
        type: 'record-refine-generation',
        summary: result.content,
        userPrompt
      });
      safeSetState(next);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      setAnnouncement('Summary generation failed. Try again.');
    } finally {
      safeSetStreamingText('');
      if (isMountedRef.current) {
        setActivity({ kind: 'idle' });
      }
    }
  }, [
    getSessionSignal,
    handleStreamChat,
    inGameplay,
    isBusy,
    isMountedRef,
    safeSetState,
    safeSetStreamingText,
    setAnnouncement,
    state
  ]);

  const handleOrdersPromptTest = useCallback(async () => {
    if (!inGameplay || isBusy || state.stage !== 'orders') {
      return;
    }

    const signal = getSessionSignal();
    setActivity({ kind: 'chat' });
    setStreamingText('');

    const testRequest = COPY.orders.promptTestUserMessage;
    const next: MorpState = {
      ...patchOrders(state, { ordersPromptEvaluation: COPY.orders.promptTestEvaluating }),
      conversation: [...state.conversation, { role: 'user' as const, content: testRequest }]
    };
    setState(next);

    try {
      const { result: testResult, rawResponse } = await evaluateSystemPromptProtection(
        state.orders.systemPrompt,
        (options) => chatCompletion({ ...options, signal: options.signal ?? signal })
      );
      const applied = applyPromptTestResult(next, testResult, rawResponse);
      const targetState = syncStageObjectives({
        ...applied.state,
        conversation: [...next.conversation, { role: 'assistant' as const, content: applied.assistantContent }]
      });

      await playScriptedAssistantReveal(applied.assistantContent);
      safeSetState(targetState);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }

      const targetState = syncStageObjectives({
        ...patchOrders(next, { ordersPromptEvaluation: COPY.orders.promptTestInconclusive }),
        conversation: [
          ...next.conversation,
          { role: 'assistant' as const, content: COPY.orders.promptTestInconclusive }
        ]
      });
      await playScriptedAssistantReveal(COPY.orders.promptTestInconclusive);
      safeSetState(targetState);
    } finally {
      safeSetStreamingText('');
      if (isMountedRef.current) {
        setActivity({ kind: 'idle' });
      }
    }
  }, [
    chatCompletion,
    getSessionSignal,
    inGameplay,
    isBusy,
    isMountedRef,
    playScriptedAssistantReveal,
    safeSetState,
    safeSetStreamingText,
    setState,
    state
  ]);

  const handleContextSummarize = useCallback(async () => {
    if (!inGameplay || isBusy || state.stage !== 'context') {
      return;
    }

    const signal = getSessionSignal();
    const batch = getSummarizeBatch(state.context.contextMessages);
    if (!batch) {
      setAnnouncement('Need more conversation history before summarizing.');
      return;
    }

    setActivity({ kind: 'summarizing' });

    try {
      await waitForMemoryAccess(state, safeSetStreamingText, signal);
      safeSetStreamingText('');

      const result = await chatCompletion({
        messages: buildContextSummaryMessages(batch),
        temperature: 0.2,
        maxTokens: 128,
        signal
      });

      let summary = normalizeSummaryText(result.content);
      let usedLlm = true;
      if (!summary) {
        summary = proceduralSummaryText(batch);
        usedLlm = false;
      }

      const messageIds = batch.map((message) => message.id);
      const next = applyAction(state, {
        type: 'apply-context-summary',
        summary,
        messageIds,
        usedLlm
      });
      safeSetState(next);
      announceCompaction(next);
      if (!usedLlm && isMountedRef.current) {
        setAnnouncement(COPY.context.summarizeFailed);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }

      const next = applyAction(state, {
        type: 'apply-context-summary',
        summary: proceduralSummaryText(batch),
        messageIds: batch.map((message) => message.id),
        usedLlm: false
      });
      safeSetState(next);
      setAnnouncement(COPY.context.summarizeFailed);
    } finally {
      if (isMountedRef.current) {
        setActivity({ kind: 'idle' });
      }
    }
  }, [
    announceCompaction,
    chatCompletion,
    getSessionSignal,
    inGameplay,
    isBusy,
    isMountedRef,
    safeSetState,
    safeSetStreamingText,
    setAnnouncement,
    state
  ]);

  const handleAction = useCallback(
    (action: StageAction) => {
      if (isBusy) {
        return;
      }

      if (action.type === 'test-orders-protection') {
        void handleOrdersPromptTest();
        return;
      }

      if (action.type === 'summarize-context') {
        if (!state.context.contextOverflowExperienced) {
          return;
        }
        void handleContextSummarize();
        return;
      }

      if (action.type === 'truncate-context') {
        if (!state.context.contextOverflowExperienced) {
          return;
        }
        const next = applyAction(state, action);
        setState(next);
        if (!(next.stageObjectivesMet && !state.stageObjectivesMet)) {
          announceCompaction(next);
        }
        return;
      }

      if (action.type === 'run-llm-eval') {
        const next = applyAction(state, action);
        setState(next);
        setActivity({ kind: 'chat' });
        void runLlmEval(next).finally(() => {
          if (isMountedRef.current) {
            setActivity({ kind: 'idle' });
          }
        });
        return;
      }

      if (action.type === 'submit-human-eval') {
        const durationMs =
          state.evals.evalHumanJudgeStartedAt !== null ? performance.now() - state.evals.evalHumanJudgeStartedAt : 0;
        const next = applyAction(state, { type: 'submit-human-eval', durationMs });
        setState(next);
        return;
      }

      if (action.type === 'set-temperature') {
        const next = applyAction(state, action);
        setState(next);

        const input = next.prediction.predictionInput.trim();
        if (
          next.stage === 'prediction' &&
          input &&
          inGameplay &&
          getBriefingAcknowledgedStage() === next.stage &&
          next.prediction.predictionCandidates.length > 0
        ) {
          schedulePredictionRefreshOnTemperature(input, action.value);
        }
        return;
      }

      const next = applyAction(state, action);
      const hasNewAssistant = getNewConversationEntries(state.conversation, next.conversation).some(
        (entry) => entry.role === 'assistant'
      );

      if (hasNewAssistant) {
        void applyStateTransitionWithReveal(state, next);
        return;
      }

      setState(next);
    },
    [
      announceCompaction,
      applyStateTransitionWithReveal,
      getBriefingAcknowledgedStage,
      handleContextSummarize,
      handleOrdersPromptTest,
      inGameplay,
      isBusy,
      isMountedRef,
      runLlmEval,
      schedulePredictionRefreshOnTemperature,
      setState,
      state
    ]
  );

  return {
    activity,
    setActivity,
    streamingText,
    setStreamingText,
    candidatesFailed,
    isBusy,
    isPredicting: predicting,
    isSummarizing: summarizing,
    isRevealing: revealing,
    handleStreamChat,
    refreshPredictionCandidates,
    handlePredictionPredict,
    handleAcceptPredictionToken,
    handleSubmit,
    handleRefineGenerate,
    handleOrdersPromptTest,
    handleContextSummarize,
    runLlmEval,
    handleAction,
    announceCompaction,
    abortPrediction
  };
}
