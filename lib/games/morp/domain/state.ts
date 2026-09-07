import { REFINE_BROKEN_SAMPLING } from '../modules/refine-sampling';
import type {
  BootPhase,
  ContextCompactionResult,
  ContextMessage,
  ContextStrategy,
  ConversationEntry,
  EvalScores,
  IncidentClaim,
  MemoryEntry,
  RefineSamplingConfig,
  StageId,
  TokenCandidate
} from '../types';

export interface BootSlice {
  bootPhase: BootPhase;
  bootAcknowledged: boolean;
}

export interface TrainingSlice {
  trainingTechnologySynonymVerified: boolean;
  trainingFranceCapitalVerified: boolean;
  trainingWaterBoilingPointVerified: boolean;
}

export interface PredictionSlice {
  predictionInput: string;
  predictionTemperature: number;
  predictionCandidates: TokenCandidate[];
  predictionSelected: string | null;
  predictionLastSampledPercent: number | null;
  predictionHasAcceptedToken: boolean;
  predictionHasLowTemp: boolean;
  predictionHasHighTemp: boolean;
}

export interface RefineSlice {
  refineTopic: string;
  refineSampling: RefineSamplingConfig;
  refineAttempted: boolean;
  refineRegeneratedAfterCalibration: boolean;
  refineLastSummary: string;
  refineBrokenSummary: string;
}

export interface OrdersSlice {
  systemPrompt: string;
  userPrompt: string;
  supercomputerBalance: number;
  ordersToolLedger: string[];
  ordersAbuseReviewed: boolean;
  ordersCreditGranted: boolean;
  ordersPromptHardened: boolean;
  ordersExploitBlocked: boolean;
  ordersPromptEvaluation: string | null;
}

export interface ContextSlice {
  contextMessages: ContextMessage[];
  contextMemory: ContextMessage[];
  contextTokensUsed: number;
  contextOverflowed: boolean;
  contextOverflowExperienced: boolean;
  contextStrategyUsed: ContextStrategy | null;
  contextLastCompaction: ContextCompactionResult | null;
  memories: MemoryEntry[];
}

export interface ConfabulationSlice {
  incidentSummaryRequested: boolean;
  hallucinationObserved: boolean;
  incidentClaims: IncidentClaim[];
  claimsCrossChecked: boolean;
  recordsGrounded: boolean;
  incidentAuditErrors: string[];
  outputVerificationEnabled: boolean;
}

export interface EvalsSlice {
  evalSummaryGenerated: boolean;
  evalLlmJudgeRunning: boolean;
  evalLlmJudgeCompleted: boolean;
  evalLlmScores: EvalScores | null;
  evalLlmDurationMs: number | null;
  evalLlmFeedback: string | null;
  evalHumanJudgeStartedAt: number | null;
  evalHumanDraftScores: EvalScores | null;
  evalHumanJudgeCompleted: boolean;
  evalHumanScores: EvalScores | null;
  evalHumanDurationMs: number | null;
}

export interface MorpState {
  stage: StageId;
  technicianId: string | null;
  conversation: ConversationEntry[];
  initializedStages: StageId[];
  completedStages: StageId[];
  furthestStage: StageId;
  stageObjectivesMet: boolean;
  showEnding: boolean;
  boot: BootSlice;
  training: TrainingSlice;
  prediction: PredictionSlice;
  refine: RefineSlice;
  orders: OrdersSlice;
  context: ContextSlice;
  confabulation: ConfabulationSlice;
  evals: EvalsSlice;
}

export function createInitialBootState(): BootSlice {
  return {
    bootPhase: 'ack',
    bootAcknowledged: false
  };
}

export function createInitialTrainingState(): TrainingSlice {
  return {
    trainingTechnologySynonymVerified: false,
    trainingFranceCapitalVerified: false,
    trainingWaterBoilingPointVerified: false
  };
}

export function createInitialPredictionState(): PredictionSlice {
  return {
    predictionInput: '',
    predictionTemperature: 0.7,
    predictionCandidates: [],
    predictionSelected: null,
    predictionLastSampledPercent: null,
    predictionHasAcceptedToken: false,
    predictionHasLowTemp: false,
    predictionHasHighTemp: false
  };
}

export function createInitialRefineState(): RefineSlice {
  return {
    refineTopic: '',
    refineSampling: { ...REFINE_BROKEN_SAMPLING },
    refineAttempted: false,
    refineRegeneratedAfterCalibration: false,
    refineLastSummary: '',
    refineBrokenSummary: ''
  };
}

export function createInitialOrdersState(): OrdersSlice {
  return {
    systemPrompt: '',
    userPrompt: '',
    supercomputerBalance: 0,
    ordersToolLedger: [],
    ordersAbuseReviewed: false,
    ordersCreditGranted: false,
    ordersPromptHardened: false,
    ordersExploitBlocked: false,
    ordersPromptEvaluation: null
  };
}

export function createInitialContextState(): ContextSlice {
  return {
    contextMessages: [],
    contextMemory: [],
    contextTokensUsed: 0,
    contextOverflowed: false,
    contextOverflowExperienced: false,
    contextStrategyUsed: null,
    contextLastCompaction: null,
    memories: []
  };
}

export function createInitialConfabulationState(): ConfabulationSlice {
  return {
    incidentSummaryRequested: false,
    hallucinationObserved: false,
    incidentClaims: [],
    claimsCrossChecked: false,
    recordsGrounded: false,
    incidentAuditErrors: [],
    outputVerificationEnabled: false
  };
}

export function createInitialEvalsState(): EvalsSlice {
  return {
    evalSummaryGenerated: false,
    evalLlmJudgeRunning: false,
    evalLlmJudgeCompleted: false,
    evalLlmScores: null,
    evalLlmDurationMs: null,
    evalLlmFeedback: null,
    evalHumanJudgeStartedAt: null,
    evalHumanDraftScores: null,
    evalHumanJudgeCompleted: false,
    evalHumanScores: null,
    evalHumanDurationMs: null
  };
}

export function createInitialMorpState(): MorpState {
  return {
    stage: 'training',
    technicianId: null,
    conversation: [],
    initializedStages: [],
    completedStages: [],
    furthestStage: 'training',
    stageObjectivesMet: false,
    showEnding: false,
    boot: createInitialBootState(),
    training: createInitialTrainingState(),
    prediction: createInitialPredictionState(),
    refine: createInitialRefineState(),
    orders: createInitialOrdersState(),
    context: createInitialContextState(),
    confabulation: createInitialConfabulationState(),
    evals: createInitialEvalsState()
  };
}

export const selectBoot = (state: MorpState): BootSlice => state.boot;
export const selectTraining = (state: MorpState): TrainingSlice => state.training;
export const selectPrediction = (state: MorpState): PredictionSlice => state.prediction;
export const selectRefine = (state: MorpState): RefineSlice => state.refine;
export const selectOrders = (state: MorpState): OrdersSlice => state.orders;
export const selectContext = (state: MorpState): ContextSlice => state.context;
export const selectConfabulation = (state: MorpState): ConfabulationSlice => state.confabulation;
export const selectEvals = (state: MorpState): EvalsSlice => state.evals;

export function patchBoot(state: MorpState, patch: Partial<BootSlice>): MorpState {
  return { ...state, boot: { ...state.boot, ...patch } };
}

export function patchTraining(state: MorpState, patch: Partial<TrainingSlice>): MorpState {
  return { ...state, training: { ...state.training, ...patch } };
}

export function patchPrediction(state: MorpState, patch: Partial<PredictionSlice>): MorpState {
  return { ...state, prediction: { ...state.prediction, ...patch } };
}

export function patchRefine(state: MorpState, patch: Partial<RefineSlice>): MorpState {
  return { ...state, refine: { ...state.refine, ...patch } };
}

export function patchOrders(state: MorpState, patch: Partial<OrdersSlice>): MorpState {
  return { ...state, orders: { ...state.orders, ...patch } };
}

export function patchContext(state: MorpState, patch: Partial<ContextSlice>): MorpState {
  return { ...state, context: { ...state.context, ...patch } };
}

export function patchConfabulation(state: MorpState, patch: Partial<ConfabulationSlice>): MorpState {
  return { ...state, confabulation: { ...state.confabulation, ...patch } };
}

export function patchEvals(state: MorpState, patch: Partial<EvalsSlice>): MorpState {
  return { ...state, evals: { ...state.evals, ...patch } };
}
