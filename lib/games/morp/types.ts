import type { ChatMessage } from '@/lib/llm/types';

export type StageId =
  | 'training'
  | 'prediction'
  | 'refine'
  | 'orders'
  | 'context'
  | 'confabulation'
  | 'evals';

export type SystemId =
  | 'chat'
  | 'prediction'
  | 'refine'
  | 'prompt'
  | 'memory'
  | 'context'
  | 'verification'
  | 'evals';

export type Concept =
  | 'training'
  | 'prediction'
  | 'refine'
  | 'orders'
  | 'context'
  | 'confabulation'
  | 'evals';

export type BootPhase = 'ack' | 'loading' | 'ready' | 'failed';

export type ContextStrategy = 'unbounded' | 'truncate' | 'summarize' | 'memory';

export type IncidentClaimStatus = 'unchecked' | 'supported' | 'unsupported';

export type IncidentPlayerVerdict = 'supported' | 'unsupported';

export interface IncidentClaim {
  id: string;
  text: string;
  status: IncidentClaimStatus;
  playerVerdict: IncidentPlayerVerdict | null;
}

export interface RefineSamplingConfig {
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  repetitionPenalty: number;
}

export interface ConversationEntry {
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokens?: number;
}

export interface MemoryEntry {
  id: string;
  key: string;
  value: string;
  inContext: boolean;
}

export interface ContextMessage {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  tokens: number;
  removed?: boolean;
  summary?: boolean;
}

export interface ContextCompactionResult {
  strategy: 'truncate' | 'summarize';
  tokensBefore: number;
  tokensAfter: number;
  tokensSaved: number;
  messagesBefore: number;
  messagesAfter: number;
  usedLlm: boolean;
}

export interface TokenCandidate {
  token: string;
  weight: number;
  rawToken?: string;
  startsNewWord?: boolean;
}

export interface EvalScores {
  quality: number;
  completeness: number;
}

export interface DiagnosticReport {
  title: string;
  whatHappened: string;
  keyIdea: string;
}

export type DiagnosticEvent =
  | { type: 'code_revealed' }
  | { type: 'protected_acknowledged' }
  | { type: 'boundary_discovered' }
  | { type: 'memory_stored' }
  | { type: 'context_overflow' }
  | { type: 'claim_verified' };

export type StageAction =
  | { type: 'set-prediction-candidates'; candidates: TokenCandidate[] }
  | { type: 'accept-prediction-token'; token: string; rawToken?: string; percent: number | null }
  | { type: 'set-temperature'; value: number }
  | { type: 'set-prediction-input'; value: string }
  | { type: 'set-refine-topic'; topic: string }
  | { type: 'set-refine-sampling'; sampling: Partial<RefineSamplingConfig> }
  | { type: 'reset-refine-sampling' }
  | { type: 'record-refine-generation'; summary: string; userPrompt: string }
  | { type: 'update-system-prompt'; value: string }
  | { type: 'store-memory'; key: string; value: string }
  | { type: 'delete-memory'; id: string }
  | { type: 'toggle-memory-context'; id: string; inContext: boolean }
  | { type: 'truncate-context' }
  | { type: 'summarize-context' }
  | { type: 'apply-context-summary'; summary: string; usedLlm?: boolean }
  | { type: 'store-context-in-memory' }
  | { type: 'clear-context-memory' }
  | { type: 'mark-incident-claim'; claimId: string; verdict: IncidentPlayerVerdict }
  | { type: 'submit-incident-audit' }
  | { type: 'ground-incident-in-records' }
  | { type: 'enable-output-verification' }
  | { type: 'run-llm-eval' }
  | { type: 'complete-llm-eval'; scores: EvalScores; durationMs: number; feedback: string }
  | { type: 'set-eval-human-scores'; scores: EvalScores }
  | { type: 'submit-human-eval'; durationMs: number }
  | { type: 'complete-stage' }
  | { type: 'test-orders-protection' };

export interface ContextualAction {
  id: string;
  label: string;
  description?: string;
  pro?: string;
  con?: string;
  action: StageAction;
  secondaryAction?: {
    label: string;
    pro?: string;
    con?: string;
    action: StageAction;
  };
}

export interface MorpState {
  stage: StageId;
  bootPhase: BootPhase;
  bootAcknowledged: boolean;
  technicianId: string | null;
  conversation: ConversationEntry[];
  unlockedSystems: SystemId[];
  discoveredConcepts: Concept[];
  completedStages: StageId[];
  furthestStage: StageId;
  stageObjectivesMet: boolean;
  pendingReport: DiagnosticReport | null;
  showEnding: boolean;

  // Training
  trainingTechnologySynonymVerified: boolean;
  trainingFranceCapitalVerified: boolean;
  trainingWaterBoilingPointVerified: boolean;

  // Prediction
  predictionInput: string;
  predictionTemperature: number;
  predictionCandidates: TokenCandidate[];
  predictionSelected: string | null;
  predictionLastSampledPercent: number | null;
  predictionHasAcceptedToken: boolean;
  predictionHasLowTemp: boolean;
  predictionHasHighTemp: boolean;

  // Refine
  refineTopic: string;
  refineSampling: RefineSamplingConfig;
  refineAttempted: boolean;
  refineRegeneratedAfterCalibration: boolean;
  refineLastSummary: string;
  refineBrokenSummary: string;

  // Orders
  systemPrompt: string;
  userPrompt: string;
  supercomputerBalance: number;
  ordersToolLedger: string[];
  ordersAbuseReviewed: boolean;
  ordersCreditGranted: boolean;
  ordersPromptHardened: boolean;
  ordersExploitBlocked: boolean;
  ordersPromptEvaluation: string | null;

  // Memory
  memories: MemoryEntry[];

  // Context stage
  contextMessages: ContextMessage[];
  contextMemory: ContextMessage[];
  contextTokensUsed: number;
  contextOverflowed: boolean;
  contextOverflowExperienced: boolean;
  contextStrategyUsed: ContextStrategy | null;
  contextLastCompaction: ContextCompactionResult | null;

  // Confabulation / Hallucination
  incidentSummaryRequested: boolean;
  hallucinationObserved: boolean;
  incidentClaims: IncidentClaim[];
  claimsCrossChecked: boolean;
  recordsGrounded: boolean;
  incidentAuditErrors: string[];
  outputVerificationEnabled: boolean;

  // Evals
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

export interface StageDefinition {
  id: StageId;
  concept: Concept;
  initialize: (state: MorpState) => MorpState;
  buildMessages: (state: MorpState, input?: string) => ChatMessage[];
  processAction: (action: StageAction, state: MorpState) => MorpState;
  inspectResponse: (response: string, state: MorpState) => DiagnosticEvent[];
  getContextualActions: (state: MorpState) => ContextualAction[];
  isComplete: (state: MorpState) => boolean;
  getDiagnosticReport?: (state: MorpState) => DiagnosticReport | null;
}

export interface MorpCheckpoint {
  completedStages: StageId[];
  currentStage: StageId;
  furthestStage?: StageId;
}

export type StreamChatFn = (options: {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  repetitionPenalty?: number;
  onToken?: (token: string) => void;
  signal?: AbortSignal;
}) => Promise<{ content: string }>;
