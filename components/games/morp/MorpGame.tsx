'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useLLM } from '@/components/llm/LLMProvider';
import { COPY } from '@/lib/games/morp/copy';
import {
  patchBoot,
  selectBoot,
  selectConfabulation,
  selectContext,
  selectEvals,
  selectOrders,
  selectTraining
} from '@/lib/games/morp/domain/state';
import { getCurrentStage, setBootPhase, unlockAllStages } from '@/lib/games/morp/engine';
import { getContextWindowSnapshot } from '@/lib/games/morp/modules/context-manager';
import { getTrainingQuestion } from '@/lib/games/morp/modules/training-probes';
import { getDefaultPanelForStage, getVisiblePanelsForStage } from '@/lib/games/morp/stage-meta';
import type { SystemId } from '@/lib/games/morp/types';
import BootSequence from './BootSequence';
import ContextPanel from './ContextPanel';
import ContextualActions from './ContextualActions';
import ConversationPanel from './ConversationPanel';
import DebugUnlockButton from './DebugUnlockButton';
import EndScreen from './EndScreen';
import EvalsPanel from './EvalsPanel';
import GameIntroBriefing from './GameIntroBriefing';
import { useLlmTask } from './hooks/useLlmTask';
import { useMorpSession } from './hooks/useMorpSession';
import { useScriptedReveal } from './hooks/useScriptedReveal';
import { useStageTransition } from './hooks/useStageTransition';
import IncidentReviewPanel from './IncidentReviewPanel';
import MemoryPanel from './MemoryPanel';
import PredictionPanel from './PredictionPanel';
import PromptStackPanel from './PromptStackPanel';
import RefinePanel from './RefinePanel';
import RepairStatusOverlay from './RepairStatusOverlay';
import StageBriefing from './StageBriefing';
import StageProgress from './StageProgress';
import StageReport from './StageReport';
import TerminalGrid from './TerminalGrid';

export default function MorpGame() {
  const {
    status,
    progress,
    webGPUSupported,
    webGPUChecked,
    loadModel,
    streamChat,
    chatCompletion,
    fetchNextTokenLogprobs,
    interruptGeneration
  } = useLLM();

  const gameRef = useRef<HTMLElement>(null);
  const chatPanelRef = useRef<HTMLElement>(null);
  const revealRef = useRef<ReturnType<typeof useScriptedReveal> | null>(null);
  const llmRef = useRef<ReturnType<typeof useLlmTask> | null>(null);
  const transitionRef = useRef<ReturnType<typeof useStageTransition> | null>(null);

  const session = useMorpSession({
    llmStatus: status,
    webGPUSupported,
    loadModel,
    interruptGeneration
  });

  const {
    state,
    setState,
    safeSetState,
    announcement,
    setAnnouncement,
    isMountedRef,
    getSessionSignal,
    streamingRafRef
  } = session;

  const boot = selectBoot(state);
  const context = selectContext(state);
  const orders = selectOrders(state);
  const confabulation = selectConfabulation(state);
  const evals = selectEvals(state);
  const training = selectTraining(state);

  const contextSnapshot = useMemo(
    () => getContextWindowSnapshot(context.contextMessages, '', context.contextMemory, state),
    [context.contextMessages, context.contextMemory, state.stage, state.technicianId, context.memories]
  );

  const inGameplay = boot.bootPhase === 'ready' && status === 'ready' && !state.showEnding;

  const transition = useStageTransition({
    state,
    setState,
    getIsBusy: () => llmRef.current?.isBusy ?? false,
    setAnnouncement,
    gameRef,
    resetBootReveal: () => revealRef.current?.resetBootReveal(),
    clearPendingReveal: () => revealRef.current?.clearPendingReveal(),
    queueScriptedReveal: (...args) => revealRef.current!.queueScriptedReveal(...args),
    onAbortPrediction: () => llmRef.current?.abortPrediction()
  });

  transitionRef.current = transition;

  const llm = useLlmTask({
    state,
    setState,
    safeSetState,
    dispatch: setState,
    isMountedRef,
    getSessionSignal,
    streamingRafRef,
    streamChat,
    chatCompletion,
    fetchNextTokenLogprobs,
    inGameplay,
    contextSnapshot,
    setAnnouncement,
    playScriptedAssistantReveal: (content) => revealRef.current!.playScriptedAssistantReveal(content),
    applyStateTransitionWithReveal: (...args) => revealRef.current!.applyStateTransitionWithReveal(...args),
    getBriefingAcknowledgedStage: () => transitionRef.current?.briefingAcknowledgedStage ?? null
  });

  llmRef.current = llm;

  const reveal = useScriptedReveal({
    state,
    briefingAcknowledgedStage: transition.briefingAcknowledgedStage,
    repairStatusOverlayOpen: transition.repairStatusOverlay.open,
    repairStatusOverlayMode: transition.repairStatusOverlay.mode,
    isMountedRef,
    getSessionSignal,
    safeSetState,
    setStreamingText: llm.setStreamingText,
    setActivity: llm.setActivity,
    chatPanelRef
  });

  revealRef.current = reveal;

  const stage = useMemo(() => getCurrentStage(state), [state]);
  const contextualActions = useMemo(() => {
    if (state.stage === 'context' || !stage) {
      return [];
    }
    return stage.getContextualActions(state);
  }, [stage, state]);
  const contextTools = useMemo(() => {
    if (state.stage !== 'context' || !stage) {
      return [];
    }
    return stage.getContextualActions(state);
  }, [stage, state]);

  const chatPlaceholder =
    state.stage === 'context' && contextSnapshot.overflowed
      ? '> Context overflow — use recovery tools in the Context panel'
      : state.stage === 'orders'
        ? COPY.orders.chatPlaceholder
        : state.stage === 'confabulation'
          ? COPY.confabulation.chatPlaceholder
          : '> Type a message...';

  const lockedTrainingQuestion =
    state.stage === 'training' && training.trainingActiveQuestion !== null
      ? getTrainingQuestion(training.trainingActiveQuestion)
      : null;

  const visiblePanels = useMemo(() => getVisiblePanelsForStage(state), [state]);

  useEffect(() => {
    if (visiblePanels.length === 0) {
      return;
    }
    if (!visiblePanels.includes(transition.activePanel)) {
      transition.setActivePanel(getDefaultPanelForStage(state.stage));
    }
  }, [visiblePanels, transition.activePanel, state.stage, transition.setActivePanel]);

  const debugUnlockButton = (
    <DebugUnlockButton
      onUnlock={() => {
        setState((current) => unlockAllStages(current));
        setAnnouncement('Debug: all stages unlocked.');
      }}
    />
  );

  if (state.showEnding) {
    return (
      <>
        {debugUnlockButton}
        <div className="morp-game">
          <EndScreen onRestart={transition.handleRestart} />
        </div>
      </>
    );
  }

  if (!webGPUChecked) {
    return (
      <>
        {debugUnlockButton}
        <div className="morp-game">
          <div className="morp-boot">
            <div className="morp-boot__frame">
              <h2>Checking hardware compatibility...</h2>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (boot.bootPhase !== 'ready' || status !== 'ready') {
    return (
      <>
        {debugUnlockButton}
        <div className="morp-game">
          <BootSequence
            state={state}
            status={status}
            progress={progress}
            webGPUSupported={webGPUSupported}
            onAcknowledge={() =>
              setState((current) => patchBoot(current, { bootAcknowledged: !current.boot.bootAcknowledged }))
            }
            onInitialize={async () => {
              setState((current) => patchBoot(current, { bootAcknowledged: true, bootPhase: 'loading' }));
              try {
                await loadModel();
              } catch {
                setState((current) => setBootPhase(current, 'failed'));
              }
            }}
          />
        </div>
      </>
    );
  }

  const sidePanels: Partial<Record<SystemId, React.ReactNode>> = {
    prediction: (
      <PredictionPanel
        state={state}
        predicting={llm.isPredicting}
        candidatesFailed={llm.candidatesFailed}
        onInputChange={(value) => llm.handleAction({ type: 'set-prediction-input', value })}
        onPredict={() => void llm.handlePredictionPredict()}
        onAcceptToken={llm.handleAcceptPredictionToken}
        onTemperatureChange={(value) => llm.handleAction({ type: 'set-temperature', value })}
      />
    ),
    refine: (
      <RefinePanel
        state={state}
        generating={llm.activity.kind === 'chat'}
        streamingText={llm.streamingText}
        onTopicChange={(topic) => llm.handleAction({ type: 'set-refine-topic', topic })}
        onSamplingChange={(sampling) => llm.handleAction({ type: 'set-refine-sampling', sampling })}
        onResetSampling={() => llm.handleAction({ type: 'reset-refine-sampling' })}
        onGenerate={() => void llm.handleRefineGenerate()}
      />
    ),
    prompt: (
      <PromptStackPanel
        systemPrompt={orders.systemPrompt}
        userPrompt={orders.userPrompt}
        promptEvaluation={state.stage === 'orders' ? orders.ordersPromptEvaluation : null}
        onSystemChange={(value) => llm.handleAction({ type: 'update-system-prompt', value })}
      />
    ),
    memory: (
      <MemoryPanel
        memories={context.memories}
        contextMemory={context.contextMemory}
        onToggleContext={(id, inContext) => llm.handleAction({ type: 'toggle-memory-context', id, inContext })}
        onDelete={(id) => llm.handleAction({ type: 'delete-memory', id })}
      />
    ),
    context: (
      <ContextPanel
        tokensUsed={contextSnapshot.storedTokens}
        sentTokens={contextSnapshot.sentTokens}
        droppedMessageCount={contextSnapshot.droppedMessageCount}
        overflowed={contextSnapshot.overflowed}
        contextMessages={context.contextMessages}
        contextMemory={context.contextMemory}
        includedMessageIds={[...contextSnapshot.includedIds]}
        memoryMessageCount={context.contextMemory.filter((message) => !message.removed).length}
        lastCompaction={context.contextLastCompaction}
        summarizing={llm.isSummarizing}
        tools={contextTools}
        onToolAction={llm.handleAction}
        toolsDisabled={llm.isBusy}
      />
    ),
    verification: (
      <IncidentReviewPanel
        claims={confabulation.incidentClaims}
        hallucinationObserved={confabulation.hallucinationObserved}
        claimsCrossChecked={confabulation.claimsCrossChecked}
        recordsGrounded={confabulation.recordsGrounded}
        outputVerificationEnabled={confabulation.outputVerificationEnabled}
        auditWrongClaimIds={confabulation.incidentAuditErrors}
        onToolAction={llm.handleAction}
        toolsDisabled={llm.isBusy}
      />
    ),
    evals: (
      <EvalsPanel
        llmJudgeRunning={evals.evalLlmJudgeRunning}
        llmJudgeCompleted={evals.evalLlmJudgeCompleted}
        llmScores={evals.evalLlmScores}
        llmDurationMs={evals.evalLlmDurationMs}
        llmFeedback={evals.evalLlmFeedback}
        humanJudgeCompleted={evals.evalHumanJudgeCompleted}
        humanDraftScores={evals.evalHumanDraftScores}
        humanScores={evals.evalHumanScores}
        humanDurationMs={evals.evalHumanDurationMs}
        onToolAction={llm.handleAction}
        toolsDisabled={llm.isBusy}
      />
    )
  };

  return (
    <>
      {debugUnlockButton}
      <main
        className={`morp-game${transition.briefingAcknowledged ? '' : ' morp-game--briefing-pending'}`}
        ref={gameRef}
      >
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
          onStageSelect={transition.handleStageSelect}
          onStatusOpen={transition.handleStatusOpen}
          disabled={llm.isBusy || !transition.briefingAcknowledged}
        />

        {state.stage === 'training' && !transition.gameIntroAcknowledged ? (
          <GameIntroBriefing onAcknowledge={transition.handleGameIntroAcknowledge} />
        ) : (
          <StageBriefing
            state={state}
            acknowledged={transition.briefingAcknowledged}
            expanded={transition.briefingExpanded}
            onAcknowledge={transition.handleBriefingAcknowledge}
            onToggleExpanded={() => transition.setBriefingExpanded((current) => !current)}
          />
        )}

        <div className="morp-game__workspace">
          <ContextualActions
            actions={contextualActions}
            onAction={llm.handleAction}
            disabled={llm.isBusy || !transition.briefingAcknowledged}
          />

          <TerminalGrid
            unlockedSystems={visiblePanels}
            activePanel={transition.activePanel}
            onPanelChange={transition.setActivePanel}
            hideChatPanel={state.stage === 'prediction' || state.stage === 'refine'}
            chatPanel={
              <ConversationPanel
                ref={chatPanelRef}
                messages={state.conversation}
                streamingText={llm.streamingText}
                isResponding={llm.isBusy}
                onSubmit={llm.handleSubmit}
                disabled={
                  !transition.briefingAcknowledged ||
                  state.stage === 'prediction' ||
                  state.stage === 'refine'
                }
                hideInput={state.stage === 'evals'}
                highlighted={llm.isRevealing}
                resetKey={state.stage}
                placeholder={chatPlaceholder}
                lockedInputValue={lockedTrainingQuestion}
              />
            }
            sidePanels={sidePanels}
            stageKey={state.stage}
          />
        </div>

        {transition.briefingAcknowledged && inGameplay && (
          <StageReport
            report={transition.stageReport}
            currentStage={state.stage}
            objectivesMet={state.stageObjectivesMet}
            expanded={transition.stageReportExpanded}
            onToggleExpanded={() => transition.setStageReportExpanded((current) => !current)}
            onContinue={transition.handleContinueReport}
            onOpenBriefing={() => {
              transition.setBriefingExpanded(true);
              transition.resetScrollPosition();
            }}
          />
        )}

        {transition.repairStatusOverlay.open && (
          <RepairStatusOverlay
            mode={transition.repairStatusOverlay.mode}
            completedStages={state.completedStages}
            completedStage={transition.repairStatusOverlay.completedStage}
            onContinue={transition.handleRepairStatusContinue}
          />
        )}
      </main>
    </>
  );
}
