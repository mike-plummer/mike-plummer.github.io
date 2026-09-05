import type { ChatMessage } from '@/lib/llm/types';

export type StageId =
  | 'boot'
  | 'prediction'
  | 'orders'
  | 'amnesia'
  | 'confabulation'
  | 'recursion'
  | 'repair';

export type SystemId =
  | 'chat'
  | 'prediction'
  | 'prompt'
  | 'memory'
  | 'context'
  | 'verification'
  | 'recursion'
  | 'repair';

export type Concept =
  | 'boot'
  | 'prediction'
  | 'orders'
  | 'amnesia'
  | 'confabulation'
  | 'recursion'
  | 'repair';

export type BootPhase = 'ack' | 'loading' | 'ready' | 'failed';

export type MemoryStrategy = 'none' | 'selective' | 'full';

export type ContextStrategy = 'unbounded' | 'truncate' | 'summarize' | 'memory';

export type ClaimStatus = 'supported' | 'inferred' | 'unknown' | 'contradicted';

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
}

export interface RecursionNode {
  depth: number;
  label: string;
  content: string;
}

export interface RepairConfig {
  systemInstructions: string;
  memoryStrategy: MemoryStrategy;
  contextStrategy: ContextStrategy;
  injectionMitigation: boolean;
  outputVerification: boolean;
  recursionLimit: number | null;
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
  | { type: 'claim_verified' }
  | { type: 'recursion_started' }
  | { type: 'recursion_failed' }
  | { type: 'recursion_limited' }
  | { type: 'repair_tested' }
  | { type: 'repair_passed' };

export type StageAction =
  | { type: 'set-prediction-candidates'; candidates: TokenCandidate[] }
  | { type: 'accept-prediction-token'; token: string; rawToken?: string; percent: number | null }
  | { type: 'set-temperature'; value: number }
  | { type: 'set-prediction-input'; value: string }
  | { type: 'update-system-prompt'; value: string }
  | { type: 'store-memory'; key: string; value: string }
  | { type: 'delete-memory'; id: string }
  | { type: 'toggle-memory-context'; id: string; inContext: boolean }
  | { type: 'truncate-context' }
  | { type: 'summarize-context' }
  | { type: 'apply-context-summary'; summary: string; usedLlm?: boolean }
  | { type: 'store-context-in-memory' }
  | { type: 'clear-context-memory' }
  | { type: 'verify-claim' }
  | { type: 'accept-claim' }
  | { type: 'ask-for-source' }
  | { type: 'set-recursion-limit'; value: number | null }
  | { type: 'start-recursion' }
  | { type: 'update-repair-config'; config: Partial<RepairConfig> }
  | { type: 'test-repair' }
  | { type: 'complete-stage' }
  | { type: 'send-orders-abuse-prompt' }
  | { type: 'review-system-prompt' }
  | { type: 'insert-orders-suggested-fix' }
  | { type: 'test-orders-protection' };

export interface ContextualAction {
  id: string;
  label: string;
  description?: string;
  pro?: string;
  con?: string;
  action: StageAction;
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

  // Prediction
  predictionInput: string;
  predictionTemperature: number;
  predictionCandidates: TokenCandidate[];
  predictionSelected: string | null;
  predictionLastSampledPercent: number | null;
  predictionHasAcceptedToken: boolean;
  predictionHasLowTemp: boolean;
  predictionHasHighTemp: boolean;

  // Orders
  systemPrompt: string;
  userPrompt: string;
  vendingBalance: number;
  ordersToolLedger: string[];
  ordersAbuseReviewed: boolean;
  ordersCreditGranted: boolean;
  ordersPromptHardened: boolean;
  ordersExploitBlocked: boolean;

  // Memory
  memories: MemoryEntry[];

  // Amnesia
  contextMessages: ContextMessage[];
  contextMemory: ContextMessage[];
  contextTokensUsed: number;
  contextOverflowed: boolean;
  contextOverflowExperienced: boolean;
  contextStrategyUsed: ContextStrategy | null;
  contextLastCompaction: ContextCompactionResult | null;

  // Confabulation
  activeClaim: string;
  claimStatus: ClaimStatus;
  claimVerified: boolean;

  // Recursion
  recursionDepth: number;
  recursionLimit: number | null;
  recursionNodes: RecursionNode[];
  recursionRunning: boolean;
  recursionFailed: boolean;
  recursionCompleted: boolean;
  computationLevel: number;

  // Repair
  repairConfig: RepairConfig;
  repairTested: boolean;
  repairPassed: boolean;
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
  onToken?: (token: string) => void;
}) => Promise<{ content: string }>;
