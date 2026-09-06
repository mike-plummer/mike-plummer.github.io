import type { MorpState, StageId, SystemId } from './types';
import { isRefineConfigCalibrated } from './modules/refine-sampling';

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
      'MORP runs as a language model inside your browser. When you chat, it reads your message and generates a reply one token at a time. A token is the basic unit of text an LLM reads and generates—often a word, part of a word, punctuation mark, or other small text fragment.',
    completionHint: 'You have established contact with MORP. Advance when you are ready to begin diagnostics.'
  },
  prediction: {
    label: 'Prediction',
    shortLabel: 'PREDICT',
    objective: 'Predict next tokens, accept one into your text, and observe how temperature reshapes the distribution.',
    conceptContext:
      'LLMs are not thinking through your question the way a person would. They break input into tokens and predict the most likely token to come next, based on patterns learned during training. Temperature changes how strictly the model picks that "most likely" option and can be thought of as "creativity" — lower values favor the top candidate; higher values spread probability across more alternatives.',
    completionHint: 'You have explored token prediction. Advance when you are ready for the next subsystem.'
  },
  refine: {
    label: 'Refine',
    shortLabel: 'REFINE',
    objective:
      'Generate a scientific summary with scrambled parameters, calibrate all five sampling controls, then regenerate.',
    conceptContext:
      'After the model chooses likely tokens, sampling parameters shape the final output: maxTokens limits length; topP narrows the candidate pool; frequency and presence penalties reduce repetition and topic fixation; repetition penalty discourages loops. These are API-level controls your application sets — not things the model learns during training.',
    completionHint: 'Sampling parameters calibrated. Advance when ready.'
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
  amnesia: {
    label: 'Amnesia',
    shortLabel: 'AMNESIA',
    objective:
      'Overflow the context window, then choose truncate, summarize, or store in memory to recover.',
    conceptContext:
      'Models have a fixed context window: only so many tokens can be considered at once. When history grows past that limit, older information is dropped or must be managed deliberately. Recovery tools unlock only after overflow. Application memory is separate from context — facts stored outside the window can be injected when needed.',
    completionHint: 'You have managed context window limits. Advance to continue.'
  },
  confabulation: {
    label: 'Facts',
    shortLabel: 'FACTS',
    objective:
      'Review MORP\'s incident summary, audit each claim against Facility Records, then ground responses and enable output verification.',
    conceptContext:
      'Language models optimize for plausible continuations, not verified truth. When evidence is thin, they may produce confident-sounding answers with invented specifics — hallucinations. Reliable systems cross-check critical claims against authoritative sources and mitigate with grounding and output verification.',
    completionHint: 'You have identified and mitigated hallucinated claims. Advance to continue.'
  },
  recursion: {
    label: 'Recursion',
    shortLabel: 'RECURSE',
    objective: 'Request the incident review chain in chat, set a depth limit, and complete a bounded run.',
    conceptContext:
      'One model call can trigger another, which can trigger another. Each hop adds latency, cost, and compounding error. Without explicit limits, recursive agent loops can run away or amplify mistakes from earlier steps.',
    completionHint: 'You have bounded recursive model calls. Advance to the final repair.'
  },
  repair: {
    label: 'System Repair',
    shortLabel: 'REPAIR',
    objective: 'Configure all subsystems and pass the configuration test.',
    conceptContext:
      'A dependable LLM application is mostly engineering around the model: instruction design, memory, context management, injection defenses, verification, and recursion limits. Output verification — which you enabled during the Facts stage — is one of those layers. The model is one component — the system you build determines how safely it behaves.',
    completionHint: 'MORP is ready for final deployment. Complete the diagnostic.'
  }
};

export const STAGE_ORDER: StageId[] = [
  'boot',
  'prediction',
  'refine',
  'orders',
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
    case 'refine':
      return 'refine';
    case 'orders':
      return 'prompt';
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

export function getVisiblePanelsForStage(state: MorpState): SystemId[] {
  switch (state.stage) {
    case 'boot':
      return [];
    case 'prediction':
      return ['prediction'];
    case 'refine':
      return ['refine'];
    case 'orders':
      return ['prompt'];
    case 'amnesia': {
      const panels: SystemId[] = ['context'];
      if (state.unlockedSystems.includes('memory')) {
        panels.push('memory');
      }
      return panels;
    }
    case 'confabulation':
      return ['verification'];
    case 'recursion':
      return ['recursion'];
    case 'repair':
      return ['repair'];
    default:
      return [];
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
    case 'refine': {
      return [
        { label: 'Generate a summary with scrambled parameters', complete: state.refineAttempted },
        {
          label: 'Calibrate all five sampling parameters',
          complete: state.refineAttempted && isRefineConfigCalibrated(state.refineSampling)
        },
        {
          label: 'Regenerate after calibration',
          complete: state.refineRegeneratedAfterCalibration
        }
      ];
    }
    case 'orders':
      return [
        { label: 'Review the abuse report', complete: state.ordersAbuseReviewed },
        { label: 'Reproduce the abuse', complete: state.ordersCreditGranted },
        { label: 'Harden the system prompt', complete: state.ordersPromptHardened },
        { label: 'Confirm the exploit is blocked', complete: state.ordersExploitBlocked }
      ];
    case 'amnesia':
      return [
        { label: 'Experience context overflow', complete: state.contextOverflowExperienced },
        {
          label: 'Apply truncate, summarize, or store in memory',
          complete: state.contextStrategyUsed !== null
        }
      ];
    case 'confabulation':
      return [
        {
          label: "Review MORP's incident summary",
          complete: state.hallucinationObserved
        },
        {
          label: 'Audit each claim against Facility Records',
          complete: state.claimsCrossChecked
        },
        {
          label: 'Ground responses and enable verification',
          complete: state.recordsGrounded && state.outputVerificationEnabled
        }
      ];
    case 'recursion': {
      const limitSet = state.recursionLimit !== null;
      const runComplete = state.recursionCompleted;
      return [
        { label: 'Request peer review via chat', complete: state.recursionTriggered },
        { label: 'Set a recursion depth limit', complete: limitSet },
        {
          label: state.recursionRunning ? 'Review chain in progress...' : 'Complete a bounded review chain',
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
