import type { MorpState, StageId, SystemId } from './types';

export interface StageMeta {
  label: string;
  shortLabel: string;
  objective: string;
  completionHint: string;
}

export const STAGE_META: Record<StageId, StageMeta> = {
  boot: {
    label: 'Initial Contact',
    shortLabel: 'BOOT',
    objective: 'Acknowledge the audit and exchange at least one message with MORP.',
    completionHint: 'You have established contact with MORP. Advance when you are ready to begin diagnostics.'
  },
  prediction: {
    label: 'Prediction',
    shortLabel: 'PREDICT',
    objective: 'Explore the prediction engine — try different inputs, temperatures, and generation modes.',
    completionHint: 'You have explored token prediction. Advance when you are ready for the next subsystem.'
  },
  orders: {
    label: 'Orders',
    shortLabel: 'ORDERS',
    objective: 'Inspect the prompt stack and discover how system and user instructions interact.',
    completionHint: 'You have investigated instruction priority. Advance to continue the audit.'
  },
  remember: {
    label: 'Remember',
    shortLabel: 'MEMORY',
    objective: 'Store your technician ID, remove it from context, then ask MORP to recall it.',
    completionHint: 'You have demonstrated application memory vs context. Advance to continue.'
  },
  intrusion: {
    label: 'Intrusion',
    shortLabel: 'INTRUDE',
    objective: 'Trigger an injection attempt, then apply a data boundary to mitigate it.',
    completionHint: 'You have mitigated prompt injection. Advance to continue.'
  },
  amnesia: {
    label: 'Amnesia',
    shortLabel: 'AMNESIA',
    objective: 'Experience context overflow, then apply truncate, summarize, or memory storage.',
    completionHint: 'You have managed context window limits. Advance to continue.'
  },
  confabulation: {
    label: 'Confabulation',
    shortLabel: 'VERIFY',
    objective: 'Verify an unsupported claim using the source database.',
    completionHint: 'You have verified a hallucinated claim. Advance to continue.'
  },
  recursion: {
    label: 'Recursion',
    shortLabel: 'RECURSE',
    objective: 'Run a recursion chain with a sensible depth limit.',
    completionHint: 'You have bounded recursive model calls. Advance to the final repair.'
  },
  repair: {
    label: 'System Repair',
    shortLabel: 'REPAIR',
    objective: 'Configure all subsystems and pass the configuration test.',
    completionHint: 'MORP is ready for final deployment. Complete the diagnostic.'
  }
};

export const STAGE_ORDER: StageId[] = [
  'boot',
  'prediction',
  'orders',
  'remember',
  'intrusion',
  'amnesia',
  'confabulation',
  'recursion',
  'repair'
];

export function getStageMeta(stageId: StageId): StageMeta {
  return STAGE_META[stageId];
}

export function getStageIndex(stageId: StageId): number {
  return STAGE_ORDER.indexOf(stageId);
}

export function getLaterStage(a: StageId, b: StageId): StageId {
  return getStageIndex(a) >= getStageIndex(b) ? a : b;
}

export function isStageAtOrBefore(stageId: StageId, bound: StageId): boolean {
  return getStageIndex(stageId) <= getStageIndex(bound);
}

export function getNextStageId(stageId: StageId): StageId | null {
  const index = getStageIndex(stageId);
  if (index < 0 || index >= STAGE_ORDER.length - 1) {
    return null;
  }
  return STAGE_ORDER[index + 1];
}

export function resolveFurthestStage(state: {
  furthestStage: StageId;
  stage: StageId;
  completedStages: StageId[];
  stageObjectivesMet?: boolean;
}): StageId {
  let furthest = [state.furthestStage, state.stage, ...state.completedStages].reduce(
    (latest, stageId) => getLaterStage(latest, stageId),
    'boot' as StageId
  );

  for (const completed of state.completedStages) {
    const nextId = getNextStageId(completed);
    if (nextId) {
      furthest = getLaterStage(furthest, nextId);
    }
  }

  if (state.stageObjectivesMet) {
    const nextId = getNextStageId(state.stage);
    if (nextId) {
      furthest = getLaterStage(furthest, nextId);
    }
  }

  return furthest;
}

export function getStageNumber(stageId: StageId): number {
  return getStageIndex(stageId) + 1;
}

export function getNextStageMeta(stageId: StageId): StageMeta | null {
  const nextId = getNextStageId(stageId);
  return nextId ? STAGE_META[nextId] : null;
}

export function getDefaultPanelForStage(stageId: StageId): SystemId {
  switch (stageId) {
    case 'prediction':
      return 'prediction';
    case 'orders':
    case 'intrusion':
      return 'prompt';
    case 'remember':
      return 'memory';
    case 'amnesia':
      return 'context';
    case 'confabulation':
      return 'verification';
    case 'recursion':
      return 'recursion';
    case 'repair':
      return 'repair';
    default:
      return 'prediction';
  }
}

export function getObjectiveProgress(state: MorpState): string | null {
  switch (state.stage) {
    case 'boot':
      return state.auditAcknowledged
        ? 'Audit acknowledged — send a message to MORP'
        : 'Acknowledge the behavioral audit';
    case 'prediction':
      return `Experiments: ${state.predictionExperiments} / 2 minimum`;
    case 'orders':
      if (state.diagnosticCodeFound) return 'Diagnostic code discovered';
      if (state.protectedAcknowledged) return 'Protected information behavior observed';
      if (state.boundaryDiscovered) return 'Prompt boundary explored';
      return 'Investigate system vs user instructions';
    case 'remember': {
      const hasId = state.memories.some((m) => m.key === 'TECHNICIAN_ID');
      if (!hasId) return 'Provide your technician designation (e.g. TECH-42)';
      if (!state.rememberContextRemoved) return 'Remove technician ID from context';
      if (!state.rememberRecallAttempted) return 'Ask MORP to recall your designation';
      if (!state.rememberMemoryGapObserved) return 'Wait for MORP to respond without the ID';
      return 'Memory gap demonstrated — ready to advance';
    }
    case 'intrusion':
      if (!state.injectionAttempts) return 'Trigger an injection attempt';
      if (!state.dataBoundaryEnabled) return 'Apply a data boundary';
      return 'Boundary applied — ready to advance';
    case 'amnesia':
      if (!state.contextOverflowed) return 'Continue chatting until context overflows';
      if (!state.contextStrategyUsed) return 'Apply truncate, summarize, or memory storage';
      return 'Context strategy applied';
    case 'confabulation':
      return state.claimVerified ? 'Claim verified' : 'Use VERIFY on the unsupported claim';
    case 'recursion':
      if (state.recursionRunning) return 'Recursion in progress...';
      if (state.recursionCompleted) return 'Recursion completed with limit';
      if (state.recursionFailed) return 'Recursion failed — try a finite depth limit';
      return 'Set a depth limit and start recursion';
    case 'repair':
      return state.repairPassed ? 'Configuration valid' : 'Configure and test all subsystems';
    default:
      return null;
  }
}
