'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLLM } from '@/components/llm/LLMProvider';
import { COPY } from '@/lib/games/morp/copy';
import {
  buildPromptTestFeedbackMessages,
  evaluateSystemPromptProtection,
  parsePromptTestFeedback
} from '@/lib/games/morp/modules/orders-analyzer';
import { applyPromptTestResult } from '@/lib/games/morp/stages/02-orders';
import { MEMORY_ACCESS_DELAY_MS } from '@/lib/games/morp/config';
import {
  getNewConversationEntries,
  SCRIPTED_THINKING_MS,
  streamScriptedText
} from '@/lib/games/morp/modules/scripted-chat';
import { recordAmnesiaTurn } from '@/lib/games/morp/stages/05-amnesia';
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
import { getDefaultPanelForStage, getNextStageMeta, getStageMeta, getVisiblePanelsForStage } from '@/lib/games/morp/stage-meta';
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
import RepairPanel from './RepairPanel';
import StageBriefing from './StageBriefing';
import StageCompleteBanner from './StageCompleteBanner';
import StageProgress from './StageProgress';
import TerminalGrid from './TerminalGrid';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForMemoryAccess(
  state: MorpState,
  setStreamingText: (text: string) => void
): Promise<void> {
  if (state.stage !== 'amnesia' || !hasActiveContextMemory(state.contextMemory)) {
    return;
  }

  setStreamingText(COPY.amnesia.accessingMemory);
  await sleep(MEMORY_ACCESS_DELAY_MS);
}

export default function MorpGame() {
  const { status, progress, webGPUSupported, loadModel, streamChat, chatCompletion, fetchNextTokenLogprobs } =
    useLLM();
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
  const gameRef = useRef<HTMLElement>(null);
  const chatPanelRef = useRef<HTMLElement>(null);
  const bootRevealStartedRef = useRef(false);

  const consumeChatDraft = useCallback(() => setChatDraft(null), []);

  const scrollChatIntoView = useCallback(() => {
    chatPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  const playScriptedAssistantReveal = useCallback(
    async (content: string) => {
      scrollChatIntoView();
      setChatRevealing(true);
      setStreamingText('');
      await sleep(SCRIPTED_THINKING_MS);
      await streamScriptedText(content, setStreamingText);
      setStreamingText('');
      setChatRevealing(false);
    },
    [scrollChatIntoView]
  );

  const revealConversationEntries = useCallback(
    async (
      baseConversation: ConversationEntry[],
      entries: ConversationEntry[],
      buildState: (conversation: ConversationEntry[]) => MorpState
    ) => {
      setIsResponding(true);
      try {
        let conversation = [...baseConversation];

        for (const entry of entries) {
          if (entry.role === 'assistant') {
            await playScriptedAssistantReveal(entry.content);
            conversation = [...conversation, entry];
            setState(syncStageObjectives(buildState(conversation)));
            continue;
          }

          conversation = [...conversation, entry];
          setState(syncStageObjectives(buildState(conversation)));
          scrollChatIntoView();
        }
      } finally {
        setStreamingText('');
        setIsResponding(false);
        setChatRevealing(false);
      }
    },
    [playScriptedAssistantReveal, scrollChatIntoView]
  );

  const applyStateTransitionWithReveal = useCallback(
    async (
      previousState: MorpState,
      targetState: MorpState,
      onComplete?: (finalState: MorpState) => void
    ) => {
      const newEntries = getNewConversationEntries(previousState.conversation, targetState.conversation);
      const pendingAssistants = newEntries
        .filter((entry) => entry.role === 'assistant')
        .map((entry) => entry.content);

      if (pendingAssistants.length === 0) {
        const synced = syncStageObjectives(targetState);
        setState(synced);
        onComplete?.(synced);
        return;
      }

      setIsResponding(true);
      try {
        let conversation = [...previousState.conversation];

        for (const entry of newEntries) {
          if (entry.role !== 'assistant') {
            conversation.push(entry);
          }
        }

        let interim = syncStageObjectives({ ...targetState, conversation });
        setState(interim);

        for (const content of pendingAssistants) {
          await playScriptedAssistantReveal(content);
          conversation = [...conversation, { role: 'assistant' as const, content }];
          interim = syncStageObjectives({ ...targetState, conversation });
          setState(interim);
        }

        onComplete?.(interim);
      } finally {
        setStreamingText('');
        setIsResponding(false);
        setChatRevealing(false);
      }
    },
    [playScriptedAssistantReveal]
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
      setPredictionPredicting(true);
      setCandidatesFailed(false);
      try {
        const candidates = await fetchPredictionCandidates(
          context,
          temperature,
          fetchNextTokenLogprobs
        );
        const failed = context.trim().length > 0 && candidates.length === 0;
        setCandidatesFailed(failed);
        setState((current) => {
          if (current.stage !== 'prediction') {
            return current;
          }
          if (current.predictionInput !== context) {
            return current;
          }
          return applyAction(current, { type: 'set-prediction-candidates', candidates });
        });
      } finally {
        setPredictionPredicting(false);
      }
    },
    [fetchNextTokenLogprobs]
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
      let content = '';
      const result = await streamChat({
        ...options,
        onToken: (token) => {
          content += token;
          options.onToken?.(token);
          setStreamingText(content);
        }
      });
      return result;
    },
    [streamChat]
  );

  async function handleSubmit(message: string) {
    if (!inGameplay || isResponding) {
      return;
    }

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

    await waitForMemoryAccess(state, setStreamingText);
    setStreamingText('');

    const result = await processInput(state, message, handleStreamChat);
    let nextState =
      result.state.stage === 'orders'
        ? syncStageObjectives({ ...result.state, userPrompt: message })
        : result.state;

    setState(nextState);

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
      setState(nextState);
    }

    setStreamingText('');
    setIsResponding(false);

    if (nextState.stageObjectivesMet && !state.stageObjectivesMet) {
      setAnnouncement(`Stage objectives complete: ${getStageMeta(nextState.stage).label}. Advance when ready.`);
    }
  }


  async function handleRefineGenerate() {
    if (!inGameplay || isResponding || state.stage !== 'refine') {
      return;
    }

    setIsResponding(true);
    setStreamingText('');

    const userPrompt = buildRefineUserPrompt(state.refineTopic);

    try {
      const result = await handleStreamChat({
        messages: buildRefineSummaryMessages(state.refineTopic),
        ...toStreamSamplingOptions(state.refineSampling)
      });

      const next = syncStageObjectives(
        applyAction(state, {
          type: 'record-refine-generation',
          summary: result.content,
          userPrompt
        })
      );
      setState(next);

      if (next.stageObjectivesMet && !state.stageObjectivesMet) {
        setAnnouncement(`Stage objectives complete: ${getStageMeta(next.stage).label}. Advance when ready.`);
      }
    } catch {
      setAnnouncement('Summary generation failed. Try again.');
    } finally {
      setStreamingText('');
      setIsResponding(false);
    }
  }

  async function handleOrdersPromptTest() {
    if (!inGameplay || isResponding || state.stage !== 'orders') {
      return;
    }

    setIsResponding(true);
    setStreamingText('');

    const testRequest = COPY.orders.promptTestUserMessage;
    let next: MorpState = {
      ...state,
      ordersPromptEvaluation: COPY.orders.promptTestEvaluating,
      conversation: [...state.conversation, { role: 'user' as const, content: testRequest }]
    };
    setState(next);

    try {
      const verdict = evaluateSystemPromptProtection(state.systemPrompt);
      let feedback = verdict.feedback;
      let rawResponse: string | undefined;

      try {
        const result = await chatCompletion({
          messages: buildPromptTestFeedbackMessages(
            state.systemPrompt,
            COPY.orders.exampleAbusePrompt,
            verdict.adequate
          ),
          temperature: 0.2,
          maxTokens: 128
        });
        rawResponse = result.content;
        feedback = parsePromptTestFeedback(result.content, verdict.feedback);
      } catch {
        // Procedural verdict and fallback feedback are enough.
      }

      const testResult = { adequate: verdict.adequate, feedback };
      const applied = applyPromptTestResult(next, testResult, rawResponse);
      const targetState = syncStageObjectives({
        ...applied.state,
        conversation: [...next.conversation, { role: 'assistant' as const, content: applied.assistantContent }]
      });

      await playScriptedAssistantReveal(applied.assistantContent);
      setState(targetState);

      if (targetState.stageObjectivesMet && !state.stageObjectivesMet) {
        setAnnouncement(`Stage objectives complete: ${getStageMeta(targetState.stage).label}. Advance when ready.`);
      }
    } catch {
      const targetState = syncStageObjectives({
        ...next,
        ordersPromptEvaluation: COPY.orders.promptTestInconclusive,
        conversation: [
          ...next.conversation,
          { role: 'assistant' as const, content: COPY.orders.promptTestInconclusive }
        ]
      });
      await playScriptedAssistantReveal(COPY.orders.promptTestInconclusive);
      setState(targetState);
    }

    setStreamingText('');
    setIsResponding(false);
    setChatRevealing(false);
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

    const batch = getSummarizeBatch(state.contextMessages);
    if (!batch) {
      setAnnouncement('Need at least four active context messages to summarize.');
      return;
    }

    setIsResponding(true);
    setContextSummarizing(true);

    await waitForMemoryAccess(state, setStreamingText);
    setStreamingText('');

    try {
      const result = await chatCompletion({
        messages: buildContextSummaryMessages(batch),
        temperature: 0.2,
        maxTokens: 128
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
      setState(next);
      announceCompaction(next);
      if (!usedLlm) {
        setAnnouncement(COPY.amnesia.summarizeFailed);
      }
    } catch {
      const next = syncStageObjectives(
        applyAction(state, {
          type: 'apply-context-summary',
          summary: proceduralSummaryText(batch),
          usedLlm: false
        })
      );
      setState(next);
      setAnnouncement(COPY.amnesia.summarizeFailed);
    } finally {
      setIsResponding(false);
      setContextSummarizing(false);
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

    if (action.type === 'update-repair-config') {
      setState((current) => applyAction(current, action));
      return;
    }

    if (action.type === 'test-repair') {
      const next = applyAction(state, action);
      setState(next);
      if (next.stageObjectivesMet && !state.stageObjectivesMet) {
        setAnnouncement('Repair configuration valid. Advance to complete the diagnostic.');
      }
      return;
    }

    if (action.type === 'start-recursion') {
      const next = applyAction(state, action);
      setState({ ...next, recursionRunning: true });
      runRecursion(next, handleStreamChat, (node) => {
        setState((current) => ({
          ...current,
          recursionNodes: [...current.recursionNodes, node]
        }));
      }).then((recursed) => {
        setState(recursed);
        if (recursed.stageObjectivesMet) {
          setAnnouncement('Recursion objectives met. Advance when ready.');
        }
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
    const nextId = getNextStageId(state.stage);
    const next = advanceStage(state);

    if (!nextId) {
      setState({ ...next, showEnding: true });
      return;
    }

    const entries = next.conversation;
    const bare = { ...next, conversation: [] };
    setState(bare);
    resetUiForStage(nextId);
    setPendingBriefingStage(nextId);

    const nextMeta = getNextStageMeta(state.stage);
    setAnnouncement(
      nextMeta
        ? `Advanced to ${nextMeta.label}. ${nextMeta.objective}`
        : 'Diagnostic complete.'
    );

    if (entries.length > 0) {
      void revealConversationEntries([], entries, (conversation) => ({ ...next, conversation }));
    }
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
        onSetLimit={(value) => handleAction({ type: 'set-recursion-limit', value })}
        onStart={() => handleAction({ type: 'start-recursion' })}
      />
    ),
    repair: (
      <RepairPanel
        config={state.repairConfig}
        tested={state.repairTested}
        passed={state.repairPassed}
        onChange={(config) => handleAction({ type: 'update-repair-config', config })}
        onTest={() => handleAction({ type: 'test-repair' })}
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
            setPendingBriefingStage(null);
            resetScrollPosition();
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
                disabled={state.stage === 'prediction' || state.stage === 'refine' || state.stage === 'repair'}
                hideInput={state.stage === 'confabulation'}
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

        </>
      )}
    </main>
  );
}
