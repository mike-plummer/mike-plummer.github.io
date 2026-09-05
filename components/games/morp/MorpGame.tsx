'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLLM } from '@/components/llm/LLMProvider';
import { COPY } from '@/lib/games/morp/copy';
import {
  advanceStage,
  applyAction,
  goToStage,
  completeBoot,
  createInitialState,
  getCurrentStage,
  getNextStageId,
  getStageDiagnosticReport,
  processInput,
  processPredictionGeneration,
  runRecursion,
  setBootPhase,
  syncStageObjectives
} from '@/lib/games/morp/engine';
import { getDefaultPanelForStage, getNextStageMeta, getStageMeta } from '@/lib/games/morp/stage-meta';
import type { MorpState, StageAction, StageId, SystemId } from '@/lib/games/morp/types';
import BootSequence from './BootSequence';
import ConfabulationTools from './ConfabulationTools';
import ContextPanel from './ContextPanel';
import ContextualActions from './ContextualActions';
import ConversationPanel from './ConversationPanel';
import DiagnosticReportModal from './DiagnosticReport';
import EndScreen from './EndScreen';
import MemoryPanel from './MemoryPanel';
import PredictionPanel from './PredictionPanel';
import PromptStackPanel from './PromptStackPanel';
import RecursionPanel from './RecursionPanel';
import RepairPanel from './RepairPanel';
import StageBriefing from './StageBriefing';
import StageCompleteBanner from './StageCompleteBanner';
import StageProgress from './StageProgress';
import SystemStatusBar from './SystemStatusBar';
import TerminalGrid from './TerminalGrid';

export default function MorpGame() {
  const { status, progress, webGPUSupported, loadModel, streamChat } = useLLM();
  const [state, setState] = useState<MorpState>(() => createInitialState());
  const [activePanel, setActivePanel] = useState<SystemId>(() =>
    getDefaultPanelForStage(createInitialState().stage)
  );
  const [isResponding, setIsResponding] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [pendingBriefingStage, setPendingBriefingStage] = useState<StageId | null>('boot');
  const gameRef = useRef<HTMLElement>(null);

  const stage = useMemo(() => getCurrentStage(state), [state]);
  const contextualActions = useMemo(() => stage.getContextualActions(state), [stage, state]);
  const chatPlaceholder = useMemo(() => {
    if (state.stage !== 'remember') {
      return '> Type a message...';
    }
    const hasId = state.memories.some((m) => m.key === 'TECHNICIAN_ID');
    if (!hasId) {
      return '> Enter your designation (e.g. TECH-42)';
    }
    if (!state.rememberContextRemoved) {
      return '> Remove your ID from context in the Memory panel';
    }
    return '> Ask MORP to recall your designation';
  }, [state]);
  const inGameplay = state.bootPhase === 'ready' && status === 'ready' && !state.showEnding;

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
    if (state.bootPhase === 'ready' && state.stage === 'boot' && state.conversation.length === 0) {
      setState((current) => ({
        ...current,
        conversation: [
          { role: 'system', content: COPY.boot.technicianLog },
          ...COPY.boot.morpOpening.map((content) => ({ role: 'assistant' as const, content }))
        ]
      }));
    }
  }, [state.bootPhase, state.stage, state.conversation.length]);

  const resetUiForStage = useCallback((stageId: StageId) => {
    setActivePanel(getDefaultPanelForStage(stageId));
    setStreamingText('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    gameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

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

    setIsResponding(true);
    setStreamingText('');

    const result = await processInput(state, message, handleStreamChat);
    const nextState =
      result.state.stage === 'orders'
        ? syncStageObjectives({ ...result.state, userPrompt: message })
        : result.state;

    setState(nextState);
    setStreamingText('');
    setIsResponding(false);

    if (nextState.stageObjectivesMet && !state.stageObjectivesMet) {
      setAnnouncement(`Stage objectives complete: ${getStageMeta(nextState.stage).label}. Advance when ready.`);
    }
  }

  async function handlePredictionGenerate(count: number) {
    setIsResponding(true);
    setStreamingText('');
    const result = await processPredictionGeneration(state, count, handleStreamChat);
    setState(result.state);
    setStreamingText('');
    setIsResponding(false);

    if (result.state.stageObjectivesMet && !state.stageObjectivesMet) {
      setAnnouncement('Prediction objectives met. You can keep experimenting or advance when ready.');
    }
  }

  function handleAction(action: StageAction) {
    if (action.type === 'ask-recall-designation') {
      void handleSubmit('What was my technician designation?');
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

    setState(next);
    resetUiForStage(nextId);
    setPendingBriefingStage(nextId);

    const nextMeta = getNextStageMeta(state.stage);
    setAnnouncement(
      nextMeta
        ? `Advanced to ${nextMeta.label}. ${nextMeta.objective}`
        : 'Diagnostic complete.'
    );
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
        onInputChange={(value) => handleAction({ type: 'set-prediction-input', value })}
        onGenerateToken={() => handlePredictionGenerate(1)}
        onGenerateTokens={(count) => handlePredictionGenerate(count)}
        onTemperatureChange={(value) => handleAction({ type: 'set-temperature', value })}
      />
    ),
    prompt: (
      <PromptStackPanel
        systemPrompt={state.systemPrompt}
        userPrompt={state.userPrompt}
        onSystemChange={(value) => handleAction({ type: 'update-system-prompt', value })}
      />
    ),
    memory: (
      <MemoryPanel
        memories={state.memories}
        onToggleContext={(id, inContext) => handleAction({ type: 'toggle-memory-context', id, inContext })}
        onDelete={(id) => handleAction({ type: 'delete-memory', id })}
      />
    ),
    context: (
      <ContextPanel
        messages={state.contextMessages}
        tokensUsed={state.contextTokensUsed}
        overflowed={state.contextOverflowed}
      />
    ),
    verification: (
      <ConfabulationTools
        claim={state.activeClaim}
        status={state.claimStatus}
        onAccept={() => handleAction({ type: 'accept-claim' })}
        onVerify={() => handleAction({ type: 'verify-claim' })}
        onAskSource={() => handleAction({ type: 'ask-for-source' })}
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
          onAcknowledge={() => setPendingBriefingStage(null)}
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

          <SystemStatusBar state={state} />

          <ContextualActions actions={contextualActions} onAction={handleAction} disabled={isResponding} />

          <TerminalGrid
            unlockedSystems={state.unlockedSystems}
            activePanel={activePanel}
            onPanelChange={setActivePanel}
            chatPanel={
              <ConversationPanel
                messages={state.conversation}
                streamingText={streamingText}
                isResponding={isResponding}
                onSubmit={handleSubmit}
                disabled={state.stage === 'prediction' || state.stage === 'repair'}
                resetKey={state.stage}
                placeholder={chatPlaceholder}
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
