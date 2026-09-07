import type { ChatMessage } from '@/lib/llm/types';

export type StageId = 'training' | 'prediction' | 'refine' | 'orders' | 'context' | 'confabulation' | 'evals';

export type SystemId = 'chat' | 'prediction' | 'refine' | 'prompt' | 'memory' | 'context' | 'verification' | 'evals';

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
  | { type: 'apply-context-summary'; summary: string; messageIds: string[]; usedLlm?: boolean }
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
  | { type: 'test-orders-protection' }
  | { type: 'enter-training-question'; index: number };

export interface ContextualAction {
  id: string;
  label: string;
  description?: string;
  pro?: string;
  con?: string;
  disabled?: boolean;
  action: StageAction;
  secondaryAction?: {
    label: string;
    pro?: string;
    con?: string;
    action: StageAction;
  };
}

export type {
  BootSlice,
  ConfabulationSlice,
  ContextSlice,
  EvalsSlice,
  MorpState,
  OrdersSlice,
  PredictionSlice,
  RefineSlice,
  TrainingSlice
} from './domain/state';

export {
  createInitialBootState,
  createInitialConfabulationState,
  createInitialContextState,
  createInitialEvalsState,
  createInitialMorpState,
  createInitialOrdersState,
  createInitialPredictionState,
  createInitialRefineState,
  createInitialTrainingState,
  patchBoot,
  patchConfabulation,
  patchContext,
  patchEvals,
  patchOrders,
  patchPrediction,
  patchRefine,
  patchTraining,
  selectBoot,
  selectConfabulation,
  selectContext,
  selectEvals,
  selectOrders,
  selectPrediction,
  selectRefine,
  selectTraining
} from './domain/state';

import type { MorpState } from './domain/state';

export interface StageDefinition {
  id: StageId;
  initialize: (state: MorpState) => MorpState;
  buildMessages: (state: MorpState, input?: string) => ChatMessage[];
  processAction: (action: StageAction, state: MorpState) => MorpState;
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
