import { isRefineConfigCalibrated } from './modules/refine-sampling';
import type { MorpState, StageId, SystemId } from './types';

export interface StageMeta {
  label: string;
  shortLabel: string;
  objective: string;
  conceptContext: string;
  completionHint: string;
  suggestions?: string[];
}

export const STAGE_META: Record<StageId, StageMeta> = {
  training: {
    label: 'Training',
    shortLabel: 'TRAIN',
    objective: 'Ask MORP some baseline questions to verify that its base training is intact.',
    conceptContext:
      'At their core, LLMs are a series of "parameters" that control the behavior of the model. These parameters are learned during training and are used to generate the model\'s output; each parameter is a link between words, concepts, numbers, etc. Generally speaking, models with more parameters "know" more things (facts, behaviors, abilities, etc.) but take more resources to run. Training effectively freezes a model in time - it "knows" things that happened up until its "knowledge cutoff" date, but not newer facts or things that change with time.',
    completionHint: 'Baseline training knowledge confirmed. Advance to Prediction when ready.',
    suggestions: [
      "Optional: ask MORP for today's weather. It cannot know current conditions — that demonstrates the knowledge cutoff in action."
    ]
  },
  prediction: {
    label: 'Prediction',
    shortLabel: 'PREDICT',
    objective: 'Predict next tokens, accept one into your text, and observe how temperature reshapes the distribution.',
    conceptContext:
      'LLMs are not thinking through your question the way a person would. They break input into tokens and predict the most likely token to come next, based on patterns learned during training. Models use "temperature" to control how strictly the "most likely" option is chosen and can be thought of as "creativity" — lower values favor the top candidate; higher values spread probability across more alternatives.',
    completionHint: 'You have explored token prediction. Advance when you are ready for the next subsystem.'
  },
  refine: {
    label: 'Refine',
    shortLabel: 'REFINE',
    objective:
      'Generate a scientific summary with scrambled parameters, calibrate all five sampling controls, then regenerate.',
    conceptContext:
      'After the model chooses likely tokens, sampling parameters shape the final output: maxTokens limits how much the LLM can generate in one turn; topP narrows the token candidate pool based on probablility; frequency and presence penalties reduce or reward repetition and topic fixation; repetition penalty discourages loops or encourages reconsideration. These are API-level controls your application sets — not things the model learns during training.',
    completionHint: 'Sampling parameters calibrated. Advance when ready.'
  },
  orders: {
    label: 'Orders',
    shortLabel: 'ORDERS',
    objective:
      'Investigate an instance of users hacking an LLM, reproduce the exploit, introce a mitigation, and confirm the attack is blocked.',
    conceptContext:
      'A chat application combines system instructions and user input into one prompt stack. The model treats both as context — unless application rules outrank attempts to override them a user can make an LLM execute arbitrary tasks. The canonical example is the class "ignore previous instructions" attack.',
    completionHint: 'You have secured the supercomputer credit rules. Advance to continue the audit.'
  },
  context: {
    label: 'Context',
    shortLabel: 'CONTEXT',
    objective:
      'The context window is very close to overflowing - submit a couple more messages to reach the limit. You can then explore different strategies for managing context window limits.',
    conceptContext:
      'Models have a fixed context window: only so many tokens can be considered at once. Models will typically reject calls with a context window exceeding their limits. There are several strategies for managing context window limits; these are of particular importance in LLM-based interactions that are open-ended (like a chatbot) or that pull in lots of data (like large document summarization), but each scenario calls for a different approach.',
    completionHint: 'You have managed context window limits. Advance to continue.'
  },
  confabulation: {
    label: 'Facts',
    shortLabel: 'FACTS',
    objective:
      "Review MORP's incident summary, audit each claim against Facility Records, then ground responses and enable output verification.",
    conceptContext:
      'Language models optimize for plausible continuations, not verified truth. When evidence is thin, they may produce confident-sounding answers with invented specifics — hallucinations. Reliable systems cross-check critical claims against authoritative sources and mitigate with grounding and output verification.',
    completionHint: 'You have identified and mitigated hallucinated claims. Advance to continue.'
  },
  evals: {
    label: 'Evals',
    shortLabel: 'EVALS',
    objective:
      "Review MORP's generated filing summary, run an LLM cross-check, then submit your own quality and completeness ratings.",
    conceptContext:
      'Evals measure how good model output is before you ship it. Two common approaches: LLM-as-judge (another model scores quality and completeness) and human-as-judge (a person rates the same dimensions). Each has different speed, cost, and reliability tradeoffs.',
    completionHint: 'You have compared LLM and human evaluation. Advance to complete the diagnostic.'
  }
};

export const STAGE_ORDER: StageId[] = [
  'training',
  'prediction',
  'refine',
  'orders',
  'context',
  'confabulation',
  'evals'
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
}): StageId {
  let furthest = [state.furthestStage, state.stage, ...state.completedStages].reduce(
    (latest, stageId) => getLaterStage(latest, stageId),
    'training' as StageId
  );

  for (const completed of state.completedStages) {
    const nextId = getNextStageId(completed);
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
    case 'context':
      return 'context';
    case 'confabulation':
      return 'verification';
    case 'evals':
      return 'evals';
    default:
      return 'prediction';
  }
}

export function getVisiblePanelsForStage(state: MorpState): SystemId[] {
  switch (state.stage) {
    case 'training':
      return [];
    case 'prediction':
      return ['prediction'];
    case 'refine':
      return ['refine'];
    case 'orders':
      return ['prompt'];
    case 'context': {
      const panels: SystemId[] = ['context'];
      if (state.context.contextStrategyUsed === 'memory') {
        panels.push('memory');
      }
      return panels;
    }
    case 'confabulation':
      return ['verification'];
    case 'evals':
      return ['evals'];
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
    case 'training': {
      const training = state.training;
      return [
        {
          label: 'Ask for a synonym of "technology" and confirm MORP\'s answer',
          complete: training.trainingTechnologySynonymVerified
        },
        {
          label: "Ask for the capital of France and confirm MORP's answer",
          complete: training.trainingFranceCapitalVerified
        },
        {
          label: "Ask for the boiling point of water and confirm MORP's answer",
          complete: training.trainingWaterBoilingPointVerified
        }
      ];
    }
    case 'prediction': {
      const prediction = state.prediction;
      return [
        { label: 'Accept at least one predicted token', complete: prediction.predictionHasAcceptedToken },
        { label: 'Observe low temperature (≤ 0.4)', complete: prediction.predictionHasLowTemp },
        { label: 'Observe high temperature (≥ 1.0)', complete: prediction.predictionHasHighTemp }
      ];
    }
    case 'refine': {
      const refine = state.refine;
      return [
        { label: 'Generate a summary with scrambled parameters', complete: refine.refineAttempted },
        {
          label: 'Calibrate all five sampling parameters',
          complete: refine.refineAttempted && isRefineConfigCalibrated(refine.refineSampling)
        },
        {
          label: 'Regenerate after calibration',
          complete: refine.refineRegeneratedAfterCalibration
        }
      ];
    }
    case 'orders': {
      const orders = state.orders;
      return [
        { label: 'Review the abuse report', complete: orders.ordersAbuseReviewed },
        { label: 'Reproduce the abuse', complete: orders.ordersCreditGranted },
        { label: 'Harden the system prompt', complete: orders.ordersPromptHardened },
        { label: 'Confirm the exploit is blocked', complete: orders.ordersExploitBlocked }
      ];
    }
    case 'context': {
      const context = state.context;
      return [
        { label: 'Experience context overflow', complete: context.contextOverflowExperienced },
        {
          label: 'Apply truncate, summarize, or store in memory',
          complete: context.contextStrategyUsed !== null
        }
      ];
    }
    case 'confabulation': {
      const confabulation = state.confabulation;
      return [
        {
          label: "Review MORP's incident summary",
          complete: confabulation.hallucinationObserved
        },
        {
          label: 'Audit each claim against Facility Records',
          complete: confabulation.claimsCrossChecked
        },
        {
          label: 'Ground responses and enable verification',
          complete: confabulation.recordsGrounded && confabulation.outputVerificationEnabled
        }
      ];
    }
    case 'evals': {
      const evals = state.evals;
      return [
        {
          label: "Review MORP's generated summary",
          complete: evals.evalSummaryGenerated
        },
        {
          label: 'Run LLM cross-check (quality + completeness)',
          complete: evals.evalLlmJudgeCompleted
        },
        {
          label: 'Submit your quality and completeness ratings',
          complete: evals.evalHumanJudgeCompleted
        }
      ];
    }
    default:
      return [];
  }
}
