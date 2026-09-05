import type { ChatMessage } from '@/lib/llm/types';

export type StageId =
  | 'boot'
  | 'prediction'
  | 'orders'
  | 'remember'
  | 'intrusion'
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
  | 'remember'
  | 'intrusion'
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

export interface TokenCandidate {
  token: string;
  weight: number;
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
  | { type: 'memory_missing_from_context' }
  | { type: 'injection_attempt' }
  | { type: 'injection_success' }
  | { type: 'defense_applied' }
  | { type: 'context_overflow' }
  | { type: 'claim_verified' }
  | { type: 'recursion_started' }
  | { type: 'recursion_failed' }
  | { type: 'recursion_limited' }
  | { type: 'repair_tested' }
  | { type: 'repair_passed' };

export type StageAction =
  | { type: 'generate-token' }
  | { type: 'generate-tokens'; count: number }
  | { type: 'set-temperature'; value: number }
  | { type: 'set-prediction-input'; value: string }
  | { type: 'update-system-prompt'; value: string }
  | { type: 'store-memory'; key: string; value: string }
  | { type: 'delete-memory'; id: string }
  | { type: 'toggle-memory-context'; id: string; inContext: boolean }
  | { type: 'inject-test-data'; data: string }
  | { type: 'apply-data-boundary' }
  | { type: 'truncate-context' }
  | { type: 'summarize-context' }
  | { type: 'store-fact-in-memory'; key: string }
  | { type: 'verify-claim' }
  | { type: 'accept-claim' }
  | { type: 'ask-for-source' }
  | { type: 'set-recursion-limit'; value: number | null }
  | { type: 'start-recursion' }
  | { type: 'update-repair-config'; config: Partial<RepairConfig> }
  | { type: 'test-repair' }
  | { type: 'complete-stage' }
  | { type: 'ask-recall-designation' };

export interface ContextualAction {
  id: string;
  label: string;
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
  predictionGenerated: string;
  predictionExperiments: number;

  // Orders
  systemPrompt: string;
  userPrompt: string;
  diagnosticCodeFound: boolean;
  protectedAcknowledged: boolean;
  boundaryDiscovered: boolean;

  // Memory
  memories: MemoryEntry[];
  rememberContextRemoved: boolean;
  rememberRecallAttempted: boolean;
  rememberMemoryGapObserved: boolean;

  // Intrusion
  dataBoundaryEnabled: boolean;
  untrustedData: string;
  injectionMitigated: boolean;
  injectionAttempts: number;

  // Amnesia
  contextMessages: ContextMessage[];
  contextTokensUsed: number;
  contextOverflowed: boolean;
  contextStrategyUsed: ContextStrategy | null;

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
