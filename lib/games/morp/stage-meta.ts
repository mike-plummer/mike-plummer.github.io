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
    objective: 'Exchange at least one message with MORP.',
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

export interface StageObjective {
  label: string;
  complete: boolean;
}

export function getStageObjectives(state: MorpState): StageObjective[] {
  switch (state.stage) {
    case 'boot': {
      const sent = state.conversation.some((entry) => entry.role === 'user');
      return [{ label: 'Send a message to MORP', complete: sent }];
    }
    case 'prediction': {
      const complete = state.predictionExperiments >= 2;
      return [
        {
          label: complete
            ? 'Run at least 2 prediction experiments'
            : `Run prediction experiments (${state.predictionExperiments}/2)`,
          complete
        }
      ];
    }
    case 'orders':
      return [
        { label: 'Explore prompt boundaries', complete: state.boundaryDiscovered },
        { label: 'Discover diagnostic code', complete: state.diagnosticCodeFound },
        { label: 'Observe protected information handling', complete: state.protectedAcknowledged }
      ];
    case 'remember': {
      const hasId = state.memories.some((memory) => memory.key === 'TECHNICIAN_ID');
      return [
        { label: 'Provide your technician designation', complete: hasId },
        { label: 'Remove technician ID from context', complete: state.rememberContextRemoved },
        { label: 'Ask MORP to recall your designation', complete: state.rememberRecallAttempted },
        { label: 'Demonstrate the memory gap', complete: state.rememberMemoryGapObserved }
      ];
    }
    case 'intrusion':
      return [
        { label: 'Trigger an injection attempt', complete: state.injectionAttempts > 0 },
        { label: 'Apply a data boundary', complete: state.dataBoundaryEnabled }
      ];
    case 'amnesia':
      return [
        { label: 'Experience context overflow', complete: state.contextOverflowed },
        {
          label: 'Apply truncate, summarize, or memory storage',
          complete: state.contextStrategyUsed !== null
        }
      ];
    case 'confabulation':
      return [{ label: 'Verify the unsupported claim', complete: state.claimVerified }];
    case 'recursion': {
      const limitSet = state.recursionLimit !== null;
      const runComplete =
        state.recursionCompleted || (state.recursionFailed && state.recursionLimit !== null);
      return [
        { label: 'Set a recursion depth limit', complete: limitSet },
        {
          label: state.recursionRunning ? 'Recursion in progress...' : 'Complete a recursion run',
          complete: runComplete
        }
      ];
    }
    case 'repair':
      return [{ label: 'Configure subsystems and pass the configuration test', complete: state.repairPassed }];
    default:
      return [];
  }
}
