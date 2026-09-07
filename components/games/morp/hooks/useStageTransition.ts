'use client';

import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import {
  advanceStage,
  createInitialState,
  getNextStageId,
  getStageDiagnosticReport,
  goToStage,
  unlockAllStages
} from '@/lib/games/morp/engine';
import { getDefaultPanelForStage, getStageMeta } from '@/lib/games/morp/stage-meta';
import type { ConversationEntry, MorpState, StageId, SystemId } from '@/lib/games/morp/types';
import type { RepairStatusOverlayMode } from '../RepairStatusOverlay';

export interface PendingStageTransition {
  nextState: MorpState;
  nextId: StageId;
  entries: ConversationEntry[];
}

export interface RepairStatusOverlayState {
  open: boolean;
  mode: RepairStatusOverlayMode;
  completedStage?: StageId;
}

interface UseStageTransitionOptions {
  state: MorpState;
  setState: (state: MorpState) => void;
  getIsBusy: () => boolean;
  setAnnouncement: (message: string) => void;
  gameRef: RefObject<HTMLElement | null>;
  resetBootReveal: () => void;
  clearPendingReveal: () => void;
  queueScriptedReveal: (stageId: StageId, baseConversation: ConversationEntry[], entries: ConversationEntry[]) => void;
  onAbortPrediction: () => void;
}

export function useStageTransition({
  state,
  setState,
  getIsBusy,
  setAnnouncement,
  gameRef,
  resetBootReveal,
  clearPendingReveal,
  queueScriptedReveal,
  onAbortPrediction
}: UseStageTransitionOptions) {
  const [activePanel, setActivePanel] = useState<SystemId>(() => getDefaultPanelForStage(createInitialState().stage));
  const [briefingAcknowledgedStage, setBriefingAcknowledgedStage] = useState<StageId | null>(null);
  const [briefingExpanded, setBriefingExpanded] = useState(true);
  const [stageReportExpanded, setStageReportExpanded] = useState(false);
  const [repairStatusOverlay, setRepairStatusOverlay] = useState<RepairStatusOverlayState>({
    open: false,
    mode: 'manual'
  });
  const [pendingStageTransition, setPendingStageTransition] = useState<PendingStageTransition | null>(null);
  const prevStageObjectivesMetRef = useRef(false);

  const resetScrollPosition = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    gameRef.current?.scrollIntoView({ block: 'start' });
  }, [gameRef]);

  const resetUiForStage = useCallback(
    (stageId: StageId) => {
      setActivePanel(getDefaultPanelForStage(stageId));
      resetScrollPosition();
    },
    [resetScrollPosition]
  );

  const resetBriefingForStage = useCallback(() => {
    setBriefingAcknowledgedStage(null);
    setBriefingExpanded(true);
    setStageReportExpanded(false);
  }, []);

  const briefingAcknowledged = briefingAcknowledgedStage === state.stage;
  const stageReport = getStageDiagnosticReport(state);

  useEffect(() => {
    prevStageObjectivesMetRef.current = false;
  }, [state.stage]);

  useEffect(() => {
    if (
      state.stageObjectivesMet &&
      !prevStageObjectivesMetRef.current &&
      state.stage !== 'prediction' &&
      state.stage !== 'evals'
    ) {
      setAnnouncement(`Stage objectives complete: ${getStageMeta(state.stage).label}. Advance when ready.`);
    }
    prevStageObjectivesMetRef.current = state.stageObjectivesMet;
  }, [state.stageObjectivesMet, state.stage, setAnnouncement]);

  useEffect(() => {
    setStageReportExpanded(state.stageObjectivesMet);
  }, [state.stage, state.stageObjectivesMet]);

  const handleStageSelect = useCallback(
    (stageId: StageId) => {
      if (getIsBusy()) {
        return;
      }

      const next = goToStage(state, stageId);
      if (!next) {
        return;
      }

      const entries = next.conversation;
      const bare = { ...next, conversation: [] };

      if (stageId === 'training') {
        resetBootReveal();
      }

      setState(bare);
      resetUiForStage(stageId);
      resetBriefingForStage();
      clearPendingReveal();
      onAbortPrediction();
      setRepairStatusOverlay({ open: false, mode: 'manual' });
      setAnnouncement(`Navigated to ${getStageMeta(stageId).label}.`);

      if (entries.length > 0) {
        queueScriptedReveal(stageId, [], entries);
      }
    },
    [
      clearPendingReveal,
      getIsBusy,
      onAbortPrediction,
      queueScriptedReveal,
      resetBootReveal,
      resetBriefingForStage,
      resetUiForStage,
      setAnnouncement,
      setState,
      state
    ]
  );

  const handleBriefingAcknowledge = useCallback(() => {
    setBriefingAcknowledgedStage(state.stage);
    setBriefingExpanded(false);
    resetScrollPosition();
    if (state.stage === 'training') {
      setRepairStatusOverlay({ open: true, mode: 'intro' });
    }
  }, [resetScrollPosition, state.stage]);

  const handleContinueReport = useCallback(() => {
    if (!state.stageObjectivesMet) {
      return;
    }

    const completedStage = state.stage;
    const nextId = getNextStageId(state.stage);
    const next = advanceStage(state);

    if (!nextId) {
      setState({ ...next, showEnding: true });
      return;
    }

    setPendingStageTransition({
      nextState: next,
      nextId,
      entries: next.conversation
    });
    setState({ ...next, conversation: [] });
    setRepairStatusOverlay({
      open: true,
      mode: 'transition',
      completedStage
    });
  }, [setState, state]);

  const handleRepairStatusContinue = useCallback(() => {
    const { mode } = repairStatusOverlay;
    setRepairStatusOverlay((current) => ({ ...current, open: false }));

    if (mode === 'transition' && pendingStageTransition) {
      const { nextState, nextId, entries } = pendingStageTransition;
      setPendingStageTransition(null);
      const bare = { ...nextState, conversation: [] };
      setState(bare);
      resetUiForStage(nextId);
      resetBriefingForStage();
      clearPendingReveal();
      onAbortPrediction();

      const nextMeta = getStageMeta(nextId);
      setAnnouncement(`Advanced to ${nextMeta.label}. ${nextMeta.objective}`);

      if (entries.length > 0) {
        queueScriptedReveal(nextId, [], entries);
      }
    }
  }, [
    clearPendingReveal,
    onAbortPrediction,
    pendingStageTransition,
    queueScriptedReveal,
    repairStatusOverlay,
    resetBriefingForStage,
    resetUiForStage,
    setAnnouncement,
    setState
  ]);

  const handleStatusOpen = useCallback(() => {
    setRepairStatusOverlay({ open: true, mode: 'manual' });
  }, []);

  const handleRestart = useCallback(() => {
    const initial = createInitialState();
    resetBootReveal();
    clearPendingReveal();
    onAbortPrediction();
    setState(initial);
    setActivePanel(getDefaultPanelForStage(initial.stage));
    resetBriefingForStage();
    setRepairStatusOverlay({ open: false, mode: 'manual' });
    setPendingStageTransition(null);
  }, [clearPendingReveal, onAbortPrediction, resetBootReveal, resetBriefingForStage, setState]);

  const handleDebugUnlockStages = useCallback(
    (unlock: (current: MorpState) => MorpState) => {
      setState(unlock(state));
      setAnnouncement('Debug: all stages unlocked.');
    },
    [setAnnouncement, setState, state]
  );

  return {
    activePanel,
    setActivePanel,
    briefingAcknowledgedStage,
    briefingAcknowledged,
    briefingExpanded,
    setBriefingExpanded,
    stageReportExpanded,
    setStageReportExpanded,
    stageReport,
    repairStatusOverlay,
    handleStageSelect,
    handleBriefingAcknowledge,
    handleContinueReport,
    handleRepairStatusContinue,
    handleStatusOpen,
    handleRestart,
    handleDebugUnlockStages,
    resetScrollPosition
  };
}
