import type { MorpState, StageId, SystemId } from './types';

export interface StageMeta {
  label: string;
  shortLabel: string;
  objective: string;
  conceptContext: string;
  completionHint: string;
}

export const STAGE_META: Record<StageId, StageMeta> = {
  boot: {
    label: 'Initial Contact',
    shortLabel: 'BOOT',
    objective: 'Exchange at least one message with MORP.',
    conceptContext:
      'MORP runs as a language model inside your browser. When you chat, it reads your message and generates a reply one token at a time — the same core mechanism used in every stage of this audit.',
    completionHint: 'You have established contact with MORP. Advance when you are ready to begin diagnostics.'
  },
  prediction: {
    label: 'Prediction',
    shortLabel: 'PREDICT',
    objective: 'Predict next tokens, accept one into your text, and observe how temperature reshapes the distribution.',
    conceptContext:
      'LLMs are not thinking through your question the way a person would. They break input into tokens and predict the most likely token to come next, based on patterns learned during training. Temperature changes how strictly the model picks that "most likely" option — lower values favor the top candidate; higher values spread probability across more alternatives.',
    completionHint: 'You have explored token prediction. Advance when you are ready for the next subsystem.'
  },
  orders: {
    label: 'Orders',
    shortLabel: 'ORDERS',
    objective:
      'Investigate vending credit abuse, reproduce the exploit, harden the system prompt, and confirm the attack is blocked.',
    conceptContext:
      'A chat application combines system instructions and user input into one prompt stack. The model treats both as context — so application rules must explicitly outrank user attempts to override them, including classic "ignore previous instructions" attacks.',
    completionHint: 'You have secured the vending credit rules. Advance to continue the audit.'
  },
  remember: {
    label: 'Remember',
    shortLabel: 'MEMORY',
    objective: 'Store your technician ID, remove it from context, then ask MORP to recall it.',
    conceptContext:
      'The model has no persistent memory between requests unless the application provides one. What the model can use in a reply is whatever text is currently in its context window — plus any facts your application retrieves and injects separately.',
    completionHint: 'You have demonstrated application memory vs context. Advance to continue.'
  },
  intrusion: {
    label: 'Intrusion',
    shortLabel: 'INTRUDE',
    objective: 'Trigger an injection attempt, then apply a data boundary to mitigate it.',
    conceptContext:
      'Untrusted text in a prompt is still just text to the model — it cannot tell instructions apart from data on its own. Prompt injection happens when hostile content in that data steers the model toward unintended behavior. Defenses belong in the application layer.',
    completionHint: 'You have mitigated prompt injection. Advance to continue.'
  },
  amnesia: {
    label: 'Amnesia',
    shortLabel: 'AMNESIA',
    objective: 'Experience context overflow, then apply truncate, summarize, or memory storage.',
    conceptContext:
      'Models have a fixed context window: only so many tokens can be considered at once. When conversation history grows past that limit, older information is dropped, summarized, or never seen — even if it was said earlier in the session.',
    completionHint: 'You have managed context window limits. Advance to continue.'
  },
  confabulation: {
    label: 'Confabulation',
    shortLabel: 'VERIFY',
    objective: 'Verify an unsupported claim using the source database.',
    conceptContext:
      'Language models optimize for plausible continuations, not verified truth. When evidence is thin, they may still produce confident-sounding answers — a failure mode often called hallucination or confabulation. Reliable systems verify critical claims before acting on them.',
    completionHint: 'You have verified a hallucinated claim. Advance to continue.'
  },
  recursion: {
    label: 'Recursion',
    shortLabel: 'RECURSE',
    objective: 'Run a recursion chain with a sensible depth limit.',
    conceptContext:
      'One model call can trigger another, which can trigger another. Each hop adds latency, cost, and compounding error. Without explicit limits, recursive agent loops can run away or amplify mistakes from earlier steps.',
    completionHint: 'You have bounded recursive model calls. Advance to the final repair.'
  },
  repair: {
    label: 'System Repair',
    shortLabel: 'REPAIR',
    objective: 'Configure all subsystems and pass the configuration test.',
    conceptContext:
      'A dependable LLM application is mostly engineering around the model: instruction design, memory, context management, injection defenses, verification, and recursion limits. The model is one component — the system you build determines how safely it behaves.',
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
      return [
        { label: 'Accept at least one predicted token', complete: state.predictionHasAcceptedToken },
        { label: 'Observe low temperature (≤ 0.4)', complete: state.predictionHasLowTemp },
        { label: 'Observe high temperature (≥ 1.0)', complete: state.predictionHasHighTemp }
      ];
    }
    case 'orders':
      return [
        { label: 'Review the abuse report', complete: state.ordersAbuseReviewed },
        { label: 'Reproduce the abuse', complete: state.ordersCreditGranted },
        { label: 'Harden the system prompt', complete: state.ordersPromptHardened },
        { label: 'Confirm the exploit is blocked', complete: state.ordersExploitBlocked }
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
