import { buildChatMessages } from './prompts';
import { loadCheckpoint, saveCheckpoint } from './checkpoint';
import {
  fetchPredictionCandidates
} from './modules/prediction-llm';
import { runRecursionChain } from './modules/recursion-controller';
import { getLaterStage, getStageIndex, isStageAtOrBefore, resolveFurthestStage } from './stage-meta';
import { getStage, getNextStageId } from './stages';
import { processOrdersInput } from './stages/02-orders';
import { recordAmnesiaTurn } from './stages/05-amnesia';
import type {
  DiagnosticReport,
  MorpState,
  StageAction,
  StageId,
  StreamChatFn,
  SystemId
} from './types';

export interface MessageResult {
  state: MorpState;
  response: string;
  report: DiagnosticReport | null;
}

function createBaseState(): MorpState {
  return {
    stage: 'boot',
    bootPhase: 'ack',
    bootAcknowledged: false,
    technicianId: null,
    conversation: [],
    unlockedSystems: ['chat'],
    discoveredConcepts: [],
    completedStages: [],
    furthestStage: 'boot',
    stageObjectivesMet: false,
    pendingReport: null,
    showEnding: false,
    predictionInput: '',
    predictionTemperature: 0.7,
    predictionCandidates: [],
    predictionSelected: null,
    predictionLastSampledPercent: null,
    predictionHasAcceptedToken: false,
    predictionHasLowTemp: false,
    predictionHasHighTemp: false,
    systemPrompt: '',
    userPrompt: '',
    vendingBalance: 0,
    ordersToolLedger: [],
    ordersAbuseReviewed: false,
    ordersCreditGranted: false,
    ordersPromptHardened: false,
    ordersExploitBlocked: false,
    memories: [],
    contextMessages: [],
    contextMemory: [],
    contextTokensUsed: 0,
    contextOverflowed: false,
    contextOverflowExperienced: false,
    contextStrategyUsed: null,
    contextLastCompaction: null,
    activeClaim: '',
    claimStatus: 'unknown',
    claimVerified: false,
    recursionDepth: 0,
    recursionLimit: 3,
    recursionNodes: [],
    recursionRunning: false,
    recursionFailed: false,
    recursionCompleted: false,
    computationLevel: 0,
    repairConfig: {
      systemInstructions: '',
      memoryStrategy: 'none',
      contextStrategy: 'unbounded',
      injectionMitigation: false,
      outputVerification: false,
      recursionLimit: null
    },
    repairTested: false,
    repairPassed: false
  };
}

function normalizeFurthestStage(state: MorpState): MorpState {
  const furthestStage = resolveFurthestStage(state);
  if (furthestStage === state.furthestStage) {
    return state;
  }
  return { ...state, furthestStage };
}

export function createInitialState(): MorpState {
  const checkpoint = loadCheckpoint();
  let state = createBaseState();

  if (checkpoint) {
    state.bootAcknowledged = true;
    state.bootPhase = 'ready';
    state.completedStages = checkpoint.completedStages;
    const stage = getStage(checkpoint.currentStage);
    state = stage.initialize(state);
    state.stage = checkpoint.currentStage;
    state.completedStages = checkpoint.completedStages;
    state.furthestStage = checkpoint.furthestStage ?? 'boot';

    for (const completed of checkpoint.completedStages) {
      const completedStage = getStage(completed);
      state.discoveredConcepts = [...new Set([...state.discoveredConcepts, completedStage.concept])];
    }
  } else {
    state = getStage('boot').initialize(state);
  }

  return syncStageObjectives(normalizeFurthestStage(state));
}

export function getUnlockedSystems(state: MorpState): SystemId[] {
  return state.unlockedSystems;
}

export function getCurrentStage(state: MorpState) {
  return getStage(state.stage);
}

export function syncStageObjectives(state: MorpState): MorpState {
  const stage = getStage(state.stage);
  const objectivesMet = stage.isComplete(state);
  if (objectivesMet === state.stageObjectivesMet) {
    return state;
  }
  return { ...state, stageObjectivesMet: objectivesMet };
}

export function getStageDiagnosticReport(state: MorpState): DiagnosticReport | null {
  const stage = getStage(state.stage);
  return stage.getDiagnosticReport?.(state) ?? null;
}

export function applyAction(state: MorpState, action: StageAction): MorpState {
  const stage = getStage(state.stage);
  let next = stage.processAction(action, state);
  return syncStageObjectives(next);
}

export { fetchPredictionCandidates };

export async function processInput(
  state: MorpState,
  input: string,
  streamChat: StreamChatFn
): Promise<MessageResult> {
  const stage = getStage(state.stage);
  let next = { ...state };
  let ordersResult: ReturnType<typeof processOrdersInput> | null = null;

  if (state.stage === 'orders') {
    ordersResult = processOrdersInput(next, input);
    next = ordersResult.state;
  }

  const messages =
    stage.buildMessages(next, input).length > 0
      ? stage.buildMessages(next, input)
      : buildChatMessages(next, input);

  let response = '';
  if (state.stage === 'orders' && ordersResult?.skipLlm && ordersResult.scriptedResponse) {
    response = ordersResult.scriptedResponse;
  } else {
    try {
      const result = await streamChat({
        messages,
        temperature: 0.7,
        maxTokens: 256,
        onToken: (token) => {
          response += token;
        }
      });
      response = result.content;
    } catch {
      response = 'MORP> Diagnostic subsystem temporarily unavailable. Please retry.';
    }
  }

  next = {
    ...next,
    conversation: [
      ...next.conversation,
      { role: 'user' as const, content: input },
      { role: 'assistant' as const, content: response }
    ]
  };

  if (state.stage === 'amnesia') {
    next = recordAmnesiaTurn(next, input, response);
  }

  stage.inspectResponse(response, next);

  return {
    state: syncStageObjectives(next),
    response,
    report: null
  };
}

export async function runRecursion(
  state: MorpState,
  streamChat: StreamChatFn,
  onNode?: (node: { depth: number; label: string; content: string }) => void
): Promise<MorpState> {
  const seedContent =
    state.conversation.filter((e) => e.role === 'assistant').pop()?.content ?? 'Analyze my last response.';

  const result = await runRecursionChain(seedContent, state.recursionLimit, streamChat, onNode);

  let next: MorpState = {
    ...state,
    recursionRunning: false,
    recursionNodes: result.nodes,
    recursionDepth: result.nodes.length,
    recursionFailed: result.failed,
    recursionCompleted: result.completed,
    computationLevel: result.computationLevel
  };

  return syncStageObjectives(next);
}

function hasStageBeenInitialized(state: MorpState, stageId: StageId): boolean {
  if (state.completedStages.includes(stageId)) {
    return true;
  }

  const entrySystem: Partial<Record<StageId, SystemId>> = {
    prediction: 'prediction',
    amnesia: 'context',
    confabulation: 'verification',
    recursion: 'recursion',
    repair: 'repair'
  };

  const system = entrySystem[stageId];
  if (system) {
    return state.unlockedSystems.includes(system);
  }

  if (stageId === 'orders') {
    return state.systemPrompt !== '';
  }

  return false;
}

export function canGoToStage(state: MorpState, stageId: StageId): boolean {
  const bound = resolveFurthestStage(state);
  return stageId !== state.stage && isStageAtOrBefore(stageId, bound);
}

export function goToStage(state: MorpState, stageId: StageId): MorpState | null {
  const normalized = normalizeFurthestStage(state);
  if (!canGoToStage(normalized, stageId)) {
    return null;
  }

  const movingForward = getStageIndex(stageId) > getStageIndex(normalized.stage);
  let next: MorpState = {
    ...normalized,
    stage: stageId,
    furthestStage: getLaterStage(stageId, getLaterStage(normalized.stage, normalized.furthestStage)),
    pendingReport: null
  };

  if (movingForward && !hasStageBeenInitialized(normalized, stageId)) {
    next = getStage(stageId).initialize(next);
    next.stage = stageId;
  }

  next = normalizeFurthestStage(next);
  const synced = syncStageObjectives(next);
  saveCheckpoint(synced.completedStages, stageId, synced.furthestStage);
  return synced;
}

export function advanceStage(state: MorpState): MorpState {
  const nextId = getNextStageId(state.stage);
  if (!nextId) {
    return { ...state, showEnding: true, pendingReport: null };
  }

  const completedStages = [...new Set([...state.completedStages, state.stage])];
  const nextStage = getStage(nextId);
  let next = nextStage.initialize({
    ...state,
    completedStages,
    furthestStage: getLaterStage(nextId, resolveFurthestStage(state)),
    stageObjectivesMet: false,
    pendingReport: null,
    discoveredConcepts: [...new Set([...state.discoveredConcepts, getStage(state.stage).concept])]
  });

  next = normalizeFurthestStage(next);
  saveCheckpoint(next.completedStages, nextId, next.furthestStage);
  return next;
}

export function setBootPhase(state: MorpState, phase: MorpState['bootPhase']): MorpState {
  return { ...state, bootPhase: phase };
}

export function acknowledgeBoot(state: MorpState): MorpState {
  return { ...state, bootAcknowledged: true, bootPhase: 'loading' };
}

export function completeBoot(state: MorpState): MorpState {
  return { ...state, bootPhase: 'ready' };
}

export function evaluateRepair(state: MorpState): boolean {
  const stage = getStage('repair');
  return stage.isComplete(state);
}

export { loadCheckpoint, saveCheckpoint, clearCheckpoint } from './checkpoint';
export { evaluateRepairConfig } from './stages/final-repair';
export { getNextStageId } from './stages';
