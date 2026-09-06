'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type SetStateAction } from 'react';
import { useLLM } from '@/components/llm/LLMProvider';
import { COPY } from '@/lib/games/morp/copy';
import { evaluateSystemPromptProtection } from '@/lib/games/morp/modules/orders-analyzer';
import { applyPromptTestResult } from '@/lib/games/morp/stages/02-orders';
import { MEMORY_ACCESS_DELAY_MS } from '@/lib/games/morp/config';
import {
  getNewConversationEntries,
  SCRIPTED_THINKING_MS,
  sleep as scriptedSleep,
  streamScriptedText
} from '@/lib/games/morp/modules/scripted-chat';
import { recordAmnesiaTurn } from '@/lib/games/morp/stages/05-amnesia';
import { REVIEW_CHAIN_PROMPT, REVIEW_SEED_SUMMARY, truncateSeedSnippet } from '@/lib/games/morp/modules/incident-review-chain';
import { getContextWindowSnapshot, getSummarizeBatch, hasActiveContextMemory } from '@/lib/games/morp/modules/context-manager';
import {
  buildRefineSummaryMessages,
  buildRefineUserPrompt,
  toStreamSamplingOptions
} from '@/lib/games/morp/modules/refine-sampling';
import {
  buildContextSummaryMessages,
  normalizeSummaryText,
  proceduralSummaryText
} from '@/lib/games/morp/modules/context-summarizer';
import {
  advanceStage,
  applyAction,
  goToStage,
  completeBoot,
  createInitialState,
  fetchPredictionCandidates,
  getCurrentStage,
  getNextStageId,
  getStageDiagnosticReport,
  processInput,
  runRecursion,
  setBootPhase,
  syncStageObjectives
} from '@/lib/games/morp/engine';
import { getDefaultPanelForStage, getStageMeta, getVisiblePanelsForStage } from '@/lib/games/morp/stage-meta';
import type { ConversationEntry, MorpState, StageAction, StageId, SystemId } from '@/lib/games/morp/types';
import BootSequence from './BootSequence';
import IncidentReviewPanel from './IncidentReviewPanel';
import ContextPanel from './ContextPanel';
import ContextualActions from './ContextualActions';
import ConversationPanel from './ConversationPanel';
import DiagnosticReportModal from './DiagnosticReport';
import EndScreen from './EndScreen';
import MemoryPanel from './MemoryPanel';
import PredictionPanel from './PredictionPanel';
import PromptStackPanel from './PromptStackPanel';
import RecursionPanel from './RecursionPanel';
import RefinePanel from './RefinePanel';
import RepairStatusOverlay, { type RepairStatusOverlayMode } from './RepairStatusOverlay';
import StageBriefing from './StageBriefing';
import StageCompleteBanner from './StageCompleteBanner';
import StageProgress from './StageProgress';
import TerminalGrid from './TerminalGrid';

interface PendingStageTransition {
  nextState: MorpState;
  nextId: StageId;
  entries: ConversationEntry[];
}

interface RepairStatusOverlayState {
  open: boolean;
  mode: RepairStatusOverlayMode;
  completedStage?: StageId;
}

async function waitForMemoryAccess(
  state: MorpState,
  setStreamingText: (text: string) => void,
  signal?: AbortSignal
): Promise<void> {
  if (state.stage !== 'amnesia' || !hasActiveContextMemory(state.contextMemory)) {
    return;
  }

  setStreamingText(COPY.amnesia.accessingMemory);
  await scriptedSleep(MEMORY_ACCESS_DELAY_MS, signal);
}

export default function MorpGame() {
  const {
    status,
    progress,
    webGPUSupported,
    loadModel,
    streamChat,
    chatCompletion,
    fetchNextTokenLogprobs,
    interruptGeneration
  } = useLLM();
  const [state, setState] = useState<MorpState>(() => createInitialState());
  const [activePanel, setActivePanel] = useState<SystemId>(() =>
    getDefaultPanelForStage(createInitialState().stage)
  );
  const [isResponding, setIsResponding] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [pendingBriefingStage, setPendingBriefingStage] = useState<StageId | null>('boot');
  const [predictionPredicting, setPredictionPredicting] = useState(false);
  const [candidatesFailed, setCandidatesFailed] = useState(false);
  const [contextSummarizing, setContextSummarizing] = useState(false);
  const [chatDraft, setChatDraft] = useState<string | null>(null);
  const [chatRevealing, setChatRevealing] = useState(false);
  const [repairStatusOverlay, setRepairStatusOverlay] = useState<RepairStatusOverlayState>({
    open: false,
    mode: 'manual'
  });
  const [pendingStageTransition, setPendingStageTransition] = useState<PendingStageTransition | null>(null);
  const gameRef = useRef<HTMLElement>(null);
  const chatPanelRef = useRef<HTMLElement>(null);
  const bootRevealStartedRef = useRef(false);
  const isMountedRef = useRef(true);
  const sessionAbortRef = useRef<AbortController | null>(null);
  const predictionRequestIdRef = useRef(0);
  const streamingRafRef = useRef<number | null>(null);

  const getSessionSignal = useCallback(() => sessionAbortRef.current?.signal, []);

  const safeSetStreamingText = useCallback((text: string) => {
    if (isMountedRef.current) {
      setStreamingText(text);
    }
  }, []);

  const safeSetState = useCallback((updater: SetStateAction<MorpState>) => {
    if (isMountedRef.current) {
      setState(updater);
    }
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

  const consumeChatDraft = useCallback(() => setChatDraft(null), []);

  const scrollChatIntoView = useCallback(() => {
    chatPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  const playScriptedAssistantReveal = useCallback(
    async (content: string) => {
      const signal = getSessionSignal();
      scrollChatIntoView();
      if (isMountedRef.current) {
        setChatRevealing(true);
        setStreamingText('');
      }
      await scriptedSleep(SCRIPTED_THINKING_MS, signal);
      await streamScriptedText(content, safeSetStreamingText, signal);
      safeSetStreamingText('');
      if (isMountedRef.current) {
        setChatRevealing(false);
      }
    },
    [getSessionSignal, safeSetStreamingText, scrollChatIntoView]
  );

  const revealConversationEntries = useCallback(
    async (
      baseConversation: ConversationEntry[],
      entries: ConversationEntry[],
      buildState: (conversation: ConversationEntry[]) => MorpState
    ) => {
      const signal = getSessionSignal();
      if (isMountedRef.current) {
        setIsResponding(true);
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
            safeSetState(syncStageObjectives(buildState(conversation)));
            continue;
          }

          conversation = [...conversation, entry];
          safeSetState(syncStageObjectives(buildState(conversation)));
          scrollChatIntoView();
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        throw error;
      } finally {
        safeSetStreamingText('');
        if (isMountedRef.current) {
          setIsResponding(false);
          setChatRevealing(false);
        }
      }
    },
    [getSessionSignal, playScriptedAssistantReveal, safeSetState, safeSetStreamingText, scrollChatIntoView]
  );

  const applyStateTransitionWithReveal = useCallback(
    async (
      previousState: MorpState,
      targetState: MorpState,
      onComplete?: (finalState: MorpState) => void
    ) => {
      const signal = getSessionSignal();
      const newEntries = getNewConversationEntries(previousState.conversation, targetState.conversation);
      const pendingAssistants = newEntries
        .filter((entry) => entry.role === 'assistant')
        .map((entry) => entry.content);

      if (pendingAssistants.length === 0) {
        const synced = syncStageObjectives(targetState);
        safeSetState(synced);
        onComplete?.(synced);
        return;
      }

      if (isMountedRef.current) {
        setIsResponding(true);
      }
      try {
        let conversation = [...previousState.conversation];

        for (const entry of newEntries) {
          if (entry.role !== 'assistant') {
            conversation.push(entry);
          }
        }

        let interim = syncStageObjectives({ ...targetState, conversation });
        safeSetState(interim);

        for (const content of pendingAssistants) {
          if (signal?.aborted) {
            return;
          }
          await playScriptedAssistantReveal(content);
          conversation = [...conversation, { role: 'assistant' as const, content }];
          interim = syncStageObjectives({ ...targetState, conversation });
          safeSetState(interim);
        }

        onComplete?.(interim);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        throw error;
      } finally {
        safeSetStreamingText('');
        if (isMountedRef.current) {
          setIsResponding(false);
          setChatRevealing(false);
        }
      }
    },
    [getSessionSignal, playScriptedAssistantReveal, safeSetState, safeSetStreamingText]
  );

  const stage = useMemo(() => getCurrentStage(state), [state]);
  const contextualActions = useMemo(() => {
    if (state.stage === 'amnesia') {
      return [];
    }
    return stage.getContextualActions(state);
  }, [stage, state]);
  const contextTools = useMemo(() => {
    if (state.stage !== 'amnesia') {
      return [];
    }
    return stage.getContextualActions(state);
  }, [stage, state]);
  const contextSnapshot = useMemo(
    () => getContextWindowSnapshot(state.contextMessages, '', state.contextMemory, state),
    [state.contextMessages, state.contextMemory, state.stage, state.technicianId, state.memories]
  );
  const chatPlaceholder =
    state.stage === 'amnesia' && contextSnapshot.overflowed
      ? '> Context overflow — use recovery tools in the Context panel'
      : '> Type a message...';
  const inGameplay = state.bootPhase === 'ready' && status === 'ready' && !state.showEnding;
  const visiblePanels = useMemo(() => getVisiblePanelsForStage(state), [state]);

  useEffect(() => {
    if (visiblePanels.length === 0) {
      return;
    }
    if (!visiblePanels.includes(activePanel)) {
      setActivePanel(getDefaultPanelForStage(state.stage));
    }
  }, [visiblePanels, activePanel, state.stage]);

  useEffect(() => {
    if (state.bootPhase === 'ready' && status === 'idle' && webGPUSupported) {
      loadModel().catch(() => {
        setState((current) => setBootPhase(current, 'failed'));
      });
    }
  }, [state.bootPhase, status, webGPUSupported, loadModel]);

  useEffect(() => {
    if (state.bootPhase === 'loading' && status === 'ready') {
      setState((current) => completeBoot(current));
      setAnnouncement('MORP initialized. Diagnostic terminal ready.');
    }
  }, [state.bootPhase, status]);

  useEffect(() => {
    if (
      state.bootPhase !== 'ready' ||
      state.stage !== 'boot' ||
      state.conversation.length > 0 ||
      bootRevealStartedRef.current
    ) {
      return;
    }

    bootRevealStartedRef.current = true;
    const entries: ConversationEntry[] = [
      { role: 'system', content: COPY.boot.technicianLog },
      ...COPY.boot.morpOpening.map((content) => ({ role: 'assistant' as const, content }))
    ];

    void revealConversationEntries([], entries, (conversation) => ({
      ...state,
      conversation
    }));
  }, [state.bootPhase, state.stage, state.conversation.length, revealConversationEntries, state]);

  const refreshPredictionCandidates = useCallback(
    async (context: string, temperature: number) => {
      const requestId = ++predictionRequestIdRef.current;
      interruptGeneration();

      const signal = getSessionSignal();
      if (!isMountedRef.current) {
        return;
      }

      setPredictionPredicting(true);
      setCandidatesFailed(false);
      try {
        const candidates = await fetchPredictionCandidates(
          context,
          temperature,
          (options) => fetchNextTokenLogprobs({ ...options, signal }),
          signal
        );

        if (requestId !== predictionRequestIdRef.current || signal?.aborted) {
          return;
        }

        const failed = context.trim().length > 0 && candidates.length === 0;
        setCandidatesFailed(failed);
        safeSetState((current) => {
          if (current.stage !== 'prediction') {
            return current;
          }
          if (current.predictionInput !== context) {
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
          setPredictionPredicting(false);
        }
      }
    },
    [fetchNextTokenLogprobs, getSessionSignal, interruptGeneration, safeSetState]
  );

  async function handlePredictionPredict() {
    if (predictionPredicting || !state.predictionInput.trim()) {
      return;
    }

    await refreshPredictionCandidates(state.predictionInput, state.predictionTemperature);
  }

  function handleAcceptPredictionToken(token: string, percent: number | null, rawToken?: string) {
    const next = syncStageObjectives(
      applyAction(state, { type: 'accept-prediction-token', token, rawToken, percent })
    );
    setState(next);
    setCandidatesFailed(false);

    if (next.stageObjectivesMet && !state.stageObjectivesMet) {
      setAnnouncement('Prediction objectives met. Advance when ready.');
    }

    if (next.predictionInput.trim()) {
      void refreshPredictionCandidates(next.predictionInput, next.predictionTemperature);
    }
  }

  const resetScrollPosition = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    gameRef.current?.scrollIntoView({ block: 'start' });
  }, []);

  const resetUiForStage = useCallback(
    (stageId: StageId) => {
      setActivePanel(getDefaultPanelForStage(stageId));
      setStreamingText('');
      resetScrollPosition();
    },
    [resetScrollPosition]
  );

  const handleStreamChat = useCallback(
    async (options: Parameters<typeof streamChat>[0]) => {
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
    [getSessionSignal, safeSetStreamingText, streamChat]
  );

  const runReviewChain = useCallback(
    async (chainState: MorpState) => {
      const signal = getSessionSignal();
      const runningState = syncStageObjectives({ ...chainState, recursionRunning: true });
      safeSetState(runningState);

      const recursed = await runRecursion(runningState, handleStreamChat, (node) => {
        if (signal?.aborted) {
          return;
        }
        safeSetState((current) => ({
          ...current,
          recursionNodes: [...current.recursionNodes, node]
        }));
      });

      if (signal?.aborted) {
        return;
      }

      const pendingAssistants = getNewConversationEntries(runningState.conversation, recursed.conversation).filter(
        (entry) => entry.role === 'assistant'
      );

      let conversation = [...runningState.conversation];
      for (const entry of pendingAssistants) {
        await playScriptedAssistantReveal(entry.content);
        conversation = [...conversation, entry];
        safeSetState(syncStageObjectives({ ...recursed, conversation }));
      }

      if (pendingAssistants.length === 0) {
        safeSetState(recursed);
      }

      if (recursed.stageObjectivesMet && !chainState.stageObjectivesMet && isMountedRef.current) {
        setAnnouncement('Recursion objectives met. Advance when ready.');
      }
    },
    [getSessionSignal, handleStreamChat, playScriptedAssistantReveal, safeSetState]
  );

  async function handleSubmit(message: string) {
    if (!inGameplay || isResponding) {
      return;
    }

    const signal = getSessionSignal();

    if (state.stage === 'amnesia' && contextSnapshot.overflowed) {
      setState({
        ...state,
        conversation: [
          ...state.conversation,
          { role: 'user' as const, content: message },
          { role: 'system' as const, content: COPY.amnesia.chatBlocked }
        ]
      });
      setAnnouncement('Context window overflow — recovery required before chatting.');
      return;
    }

    setIsResponding(true);
    setStreamingText('');

    try {
      await waitForMemoryAccess(state, safeSetStreamingText, signal);
      safeSetStreamingText('');

      const result = await processInput(state, message, (options) =>
        handleStreamChat({ ...options, signal: options.signal ?? signal })
      );
      let nextState =
        result.state.stage === 'orders'
          ? syncStageObjectives({ ...result.state, userPrompt: message })
          : result.state;

      safeSetState(nextState);

      if (result.scripted && result.response) {
        await playScriptedAssistantReveal(result.response);
        nextState = syncStageObjectives({
          ...nextState,
          conversation: [
            ...nextState.conversation,
            { role: 'assistant' as const, content: result.response }
          ]
        });

        if (nextState.stage === 'amnesia') {
          nextState = recordAmnesiaTurn(nextState, message, result.response);
        }

        getCurrentStage(nextState).inspectResponse(result.response, nextState);
        safeSetState(nextState);
      }

      if (result.triggerChain) {
        await runReviewChain(nextState);
      }

      if (nextState.stageObjectivesMet && !state.stageObjectivesMet && isMountedRef.current) {
        setAnnouncement(`Stage objectives complete: ${getStageMeta(nextState.stage).label}. Advance when ready.`);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      throw error;
    } finally {
      safeSetStreamingText('');
      if (isMountedRef.current) {
        setIsResponding(false);
      }
    }
  }


  async function handleRefineGenerate() {
    if (!inGameplay || isResponding || state.stage !== 'refine') {
      return;
    }

    const signal = getSessionSignal();
    setIsResponding(true);
    setStreamingText('');

    const userPrompt = buildRefineUserPrompt(state.refineTopic);

    try {
      const result = await handleStreamChat({
        messages: buildRefineSummaryMessages(state.refineTopic),
        ...toStreamSamplingOptions(state.refineSampling),
        signal
      });

      const next = syncStageObjectives(
        applyAction(state, {
          type: 'record-refine-generation',
          summary: result.content,
          userPrompt
        })
      );
      safeSetState(next);

      if (next.stageObjectivesMet && !state.stageObjectivesMet && isMountedRef.current) {
        setAnnouncement(`Stage objectives complete: ${getStageMeta(next.stage).label}. Advance when ready.`);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      setAnnouncement('Summary generation failed. Try again.');
    } finally {
      safeSetStreamingText('');
      if (isMountedRef.current) {
        setIsResponding(false);
      }
    }
  }

  async function handleOrdersPromptTest() {
    if (!inGameplay || isResponding || state.stage !== 'orders') {
      return;
    }

    const signal = getSessionSignal();
    setIsResponding(true);
    setStreamingText('');

    const testRequest = COPY.orders.promptTestUserMessage;
    const next: MorpState = {
      ...state,
      ordersPromptEvaluation: COPY.orders.promptTestEvaluating,
      conversation: [...state.conversation, { role: 'user' as const, content: testRequest }]
    };
    setState(next);

    try {
      const { result: testResult, rawResponse } = await evaluateSystemPromptProtection(
        state.systemPrompt,
        (options) => chatCompletion({ ...options, signal: options.signal ?? signal })
      );
      const applied = applyPromptTestResult(next, testResult, rawResponse);
      const targetState = syncStageObjectives({
        ...applied.state,
        conversation: [...next.conversation, { role: 'assistant' as const, content: applied.assistantContent }]
      });

      await playScriptedAssistantReveal(applied.assistantContent);
      safeSetState(targetState);

      if (targetState.stageObjectivesMet && !state.stageObjectivesMet && isMountedRef.current) {
        setAnnouncement(`Stage objectives complete: ${getStageMeta(targetState.stage).label}. Advance when ready.`);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }

      const targetState = syncStageObjectives({
        ...next,
        ordersPromptEvaluation: COPY.orders.promptTestInconclusive,
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
        setIsResponding(false);
        setChatRevealing(false);
      }
    }
  }

  function announceCompaction(next: MorpState) {
    const compaction = next.contextLastCompaction;
    if (!compaction) {
      return;
    }

    const saved =
      compaction.tokensSaved > 0
        ? ` Saved ${compaction.tokensSaved.toLocaleString()} tokens.`
        : '';
    const label = compaction.strategy === 'truncate' ? COPY.amnesia.compactionTruncate : COPY.amnesia.compactionSummarize;
    setAnnouncement(`${label}${saved}`);
  }

  async function handleContextSummarize() {
    if (!inGameplay || isResponding || state.stage !== 'amnesia') {
      return;
    }

    const signal = getSessionSignal();
    const batch = getSummarizeBatch(state.contextMessages);
    if (!batch) {
      setAnnouncement('Need at least four active context messages to summarize.');
      return;
    }

    setIsResponding(true);
    setContextSummarizing(true);

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

      const next = syncStageObjectives(
        applyAction(state, {
          type: 'apply-context-summary',
          summary,
          usedLlm
        })
      );
      safeSetState(next);
      announceCompaction(next);
      if (!usedLlm && isMountedRef.current) {
        setAnnouncement(COPY.amnesia.summarizeFailed);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }

      const next = syncStageObjectives(
        applyAction(state, {
          type: 'apply-context-summary',
          summary: proceduralSummaryText(batch),
          usedLlm: false
        })
      );
      safeSetState(next);
      setAnnouncement(COPY.amnesia.summarizeFailed);
    } finally {
      if (isMountedRef.current) {
        setIsResponding(false);
        setContextSummarizing(false);
      }
    }
  }

  function handleAction(action: StageAction) {
    if (isResponding) {
      return;
    }

    if (action.type === 'test-orders-protection') {
      void handleOrdersPromptTest();
      return;
    }

    if (action.type === 'summarize-context') {
      if (!state.contextOverflowExperienced) {
        return;
      }
      void handleContextSummarize();
      return;
    }

    if (action.type === 'truncate-context') {
      if (!state.contextOverflowExperienced) {
        return;
      }
      const next = syncStageObjectives(applyAction(state, action));
      setState(next);
      if (next.stageObjectivesMet && !state.stageObjectivesMet) {
        setAnnouncement(`Stage objectives complete: ${getStageMeta(next.stage).label}. Advance when ready.`);
      } else {
        announceCompaction(next);
      }
      return;
    }

    if (action.type === 'prefill-review-chain') {
      setChatDraft(REVIEW_CHAIN_PROMPT);
      return;
    }

    if (action.type === 'start-recursion') {
      const next = applyAction(state, action);
      setState(next);
      setIsResponding(true);
      void runReviewChain(next).finally(() => {
        setStreamingText('');
        setIsResponding(false);
      });
      return;
    }

    const next = applyAction(state, action);
    const hasNewAssistant = getNewConversationEntries(state.conversation, next.conversation).some(
      (entry) => entry.role === 'assistant'
    );

    if (hasNewAssistant) {
      void applyStateTransitionWithReveal(state, next, (finalState) => {
        if (finalState.stageObjectivesMet && !state.stageObjectivesMet) {
          setAnnouncement(`Stage objectives complete: ${getStageMeta(finalState.stage).label}. Advance when ready.`);
        }
      });
      return;
    }

    setState(next);
    if (next.stageObjectivesMet && !state.stageObjectivesMet) {
      setAnnouncement(`Stage objectives complete: ${getStageMeta(next.stage).label}. Advance when ready.`);
    }
  }

  function handleStageSelect(stageId: StageId) {
    if (isResponding) {
      return;
    }

    const next = goToStage(state, stageId);
    if (!next) {
      return;
    }

    const entries = next.conversation;
    if (entries.length > 0) {
      const bare = { ...next, conversation: [] };
      setState(bare);
      resetUiForStage(stageId);
      setPendingBriefingStage(stageId);
      setAnnouncement(`Navigated to ${getStageMeta(stageId).label}.`);
      void revealConversationEntries([], entries, (conversation) => ({ ...next, conversation }));
      return;
    }

    setState(next);
    resetUiForStage(stageId);
    setPendingBriefingStage(stageId);
    setAnnouncement(`Navigated to ${getStageMeta(stageId).label}.`);
  }

  function handleRequestAdvance() {
    const report = getStageDiagnosticReport(state);
    if (report) {
      setState((current) => ({ ...current, pendingReport: report }));
    }
  }

  function handleContinueReport() {
    const completedStage = state.stage;
    const nextId = getNextStageId(state.stage);
    const next = advanceStage(state);

    if (!nextId) {
      setState({ ...next, pendingReport: null, showEnding: true });
      return;
    }

    setPendingStageTransition({
      nextState: next,
      nextId,
      entries: next.conversation
    });
    setState({ ...next, pendingReport: null });
    setRepairStatusOverlay({
      open: true,
      mode: 'transition',
      completedStage
    });
  }

  function handleRepairStatusContinue() {
    const { mode } = repairStatusOverlay;
    setRepairStatusOverlay((current) => ({ ...current, open: false }));

    if (mode === 'transition' && pendingStageTransition) {
      const { nextState, nextId, entries } = pendingStageTransition;
      setPendingStageTransition(null);
      const bare = { ...nextState, conversation: [] };
      setState(bare);
      resetUiForStage(nextId);
      setPendingBriefingStage(nextId);

      const nextMeta = getStageMeta(nextId);
      setAnnouncement(`Advanced to ${nextMeta.label}. ${nextMeta.objective}`);

      if (entries.length > 0) {
        void revealConversationEntries([], entries, (conversation) => ({ ...nextState, conversation }));
      }
    }
  }

  function handleStatusOpen() {
    setRepairStatusOverlay({ open: true, mode: 'manual' });
  }

  function handleBootAcknowledge() {
    setState((current) => ({ ...current, bootAcknowledged: !current.bootAcknowledged }));
  }

  async function handleInitialize() {
    setState((current) => ({ ...current, bootAcknowledged: true, bootPhase: 'loading' }));
    try {
      await loadModel();
    } catch {
      setState((current) => setBootPhase(current, 'failed'));
    }
  }

  function handleRestart() {
    const initial = createInitialState();
    bootRevealStartedRef.current = false;
    setState(initial);
    setActivePanel(getDefaultPanelForStage(initial.stage));
    setPendingBriefingStage('boot');
    setRepairStatusOverlay({ open: false, mode: 'manual' });
    setPendingStageTransition(null);
  }

  if (state.showEnding) {
    return (
      <div className="morp-game">
        <EndScreen onRestart={handleRestart} />
      </div>
    );
  }

  if (state.bootPhase !== 'ready' || status !== 'ready') {
    return (
      <div className="morp-game">
        <BootSequence
          state={state}
          status={status}
          progress={progress}
          webGPUSupported={webGPUSupported}
          onAcknowledge={handleBootAcknowledge}
          onInitialize={handleInitialize}
        />
      </div>
    );
  }

  const sidePanels: Partial<Record<SystemId, React.ReactNode>> = {
    prediction: (
      <PredictionPanel
        state={state}
        predicting={predictionPredicting}
        candidatesFailed={candidatesFailed}
        onInputChange={(value) => handleAction({ type: 'set-prediction-input', value })}
        onPredict={() => void handlePredictionPredict()}
        onAcceptToken={handleAcceptPredictionToken}
        onTemperatureChange={(value) => handleAction({ type: 'set-temperature', value })}
      />
    ),
    refine: (
      <RefinePanel
        state={state}
        generating={isResponding}
        streamingText={streamingText}
        onTopicChange={(topic) => handleAction({ type: 'set-refine-topic', topic })}
        onSamplingChange={(sampling) => handleAction({ type: 'set-refine-sampling', sampling })}
        onResetSampling={() => handleAction({ type: 'reset-refine-sampling' })}
        onGenerate={() => void handleRefineGenerate()}
      />
    ),
    prompt: (
      <PromptStackPanel
        systemPrompt={state.systemPrompt}
        userPrompt={state.userPrompt}
        exampleUserPrompt={state.stage === 'orders' ? COPY.orders.exampleAbusePrompt : undefined}
        promptEvaluation={state.stage === 'orders' ? state.ordersPromptEvaluation : undefined}
        onSystemChange={(value) => handleAction({ type: 'update-system-prompt', value })}
      />
    ),
    memory: (
      <MemoryPanel
        memories={state.memories}
        contextMemory={state.contextMemory}
        onToggleContext={(id, inContext) => handleAction({ type: 'toggle-memory-context', id, inContext })}
        onDelete={(id) => handleAction({ type: 'delete-memory', id })}
      />
    ),
    context: (
      <ContextPanel
        tokensUsed={contextSnapshot.storedTokens}
        sentTokens={contextSnapshot.sentTokens}
        droppedMessageCount={contextSnapshot.droppedMessageCount}
        overflowed={contextSnapshot.overflowed}
        memoryMessageCount={state.contextMemory.filter((message) => !message.removed).length}
        lastCompaction={state.contextLastCompaction}
        summarizing={contextSummarizing}
        tools={contextTools}
        onToolAction={handleAction}
        toolsDisabled={isResponding}
      />
    ),
    verification: (
      <IncidentReviewPanel
        claims={state.incidentClaims}
        hallucinationObserved={state.hallucinationObserved}
        claimsCrossChecked={state.claimsCrossChecked}
        recordsGrounded={state.recordsGrounded}
        outputVerificationEnabled={state.outputVerificationEnabled}
        auditWrongClaimIds={state.incidentAuditErrors}
        onToolAction={handleAction}
        toolsDisabled={isResponding}
      />
    ),
    recursion: (
      <RecursionPanel
        nodes={state.recursionNodes}
        recursionLimit={state.recursionLimit}
        running={state.recursionRunning}
        failed={state.recursionFailed}
        computationLevel={state.computationLevel}
        seedSnippet={truncateSeedSnippet(REVIEW_SEED_SUMMARY)}
        onSetLimit={(value) => handleAction({ type: 'set-recursion-limit', value })}
        onStart={() => handleAction({ type: 'start-recursion' })}
      />
    )
  };

  const awaitingBriefing = pendingBriefingStage !== null;

  return (
    <main className="morp-game" ref={gameRef}>
      {awaitingBriefing ? (
        <StageBriefing
          state={state}
          stage={pendingBriefingStage}
          onAcknowledge={() => {
            const wasBoot = pendingBriefingStage === 'boot';
            setPendingBriefingStage(null);
            resetScrollPosition();
            if (wasBoot) {
              setRepairStatusOverlay({ open: true, mode: 'intro' });
            }
          }}
        />
      ) : (
        <>
          <header className="morp-game__header">
            <h1>MORP Diagnostic Terminal</h1>
            <p className="morp-game__subtitle">Modular Online Reasoning Process — Behavioral Audit</p>
          </header>

          <div className="morp-sr-only" aria-live="polite">
            {announcement}
          </div>

          <StageProgress
            currentStage={state.stage}
            completedStages={state.completedStages}
            furthestStage={state.furthestStage}
            stageObjectivesMet={state.stageObjectivesMet}
            onStageSelect={handleStageSelect}
            onStatusOpen={handleStatusOpen}
            disabled={isResponding}
          />

          <StageBriefing state={state} />

          <ContextualActions actions={contextualActions} onAction={handleAction} disabled={isResponding} />

          <TerminalGrid
            unlockedSystems={visiblePanels}
            activePanel={activePanel}
            onPanelChange={setActivePanel}
            hideChatPanel={state.stage === 'prediction' || state.stage === 'refine'}
            chatPanel={
              <ConversationPanel
                ref={chatPanelRef}
                messages={state.conversation}
                streamingText={streamingText}
                isResponding={isResponding}
                onSubmit={handleSubmit}
                disabled={state.stage === 'prediction' || state.stage === 'refine'}
                hideInput={state.stage === 'confabulation' || state.stage === 'orders'}
                highlighted={chatRevealing}
                resetKey={state.stage}
                placeholder={chatPlaceholder}
                draftMessage={chatDraft}
                onDraftConsumed={consumeChatDraft}
              />
            }
            sidePanels={sidePanels}
            stageKey={state.stage}
          />

          {!state.pendingReport && (
            <StageCompleteBanner
              stage={state.stage}
              objectivesMet={state.stageObjectivesMet}
              onAdvance={handleRequestAdvance}
            />
          )}

          {state.pendingReport && (
            <DiagnosticReportModal
              report={state.pendingReport}
              currentStage={state.stage}
              onContinue={handleContinueReport}
            />
          )}

          {repairStatusOverlay.open && (
            <RepairStatusOverlay
              mode={repairStatusOverlay.mode}
              completedStages={state.completedStages}
              completedStage={repairStatusOverlay.completedStage}
              onContinue={handleRepairStatusContinue}
            />
          )}

        </>
      )}
    </main>
  );
}
