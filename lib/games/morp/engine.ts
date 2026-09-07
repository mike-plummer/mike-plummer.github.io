import { buildChatMessages, getChatTemperature, sanitizeMorpResponse } from './prompts';
import { loadCheckpoint, saveCheckpoint } from './checkpoint';
import {
  fetchPredictionCandidates
} from './modules/prediction-llm';
import {
  getLaterStage,
  getStageIndex,
  isStageAtOrBefore,
  resolveFurthestStage,
  STAGE_ORDER
} from './stage-meta';
import { getStage, getNextStageId } from './stages';
import { processOrdersInput } from './stages/02-orders';
import { processIncidentInput } from './stages/06-confabulation';
import { recordContextTurn } from './stages/05-context';
import { recordTrainingTurn } from './modules/training-probes';
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
  scripted?: boolean;
}

function createBaseState(): MorpState {
  return {
    stage: 'training',
    bootPhase: 'ack',
    bootAcknowledged: false,
    technicianId: null,
    conversation: [],
    unlockedSystems: ['chat'],
    discoveredConcepts: [],
    completedStages: [],
    furthestStage: 'training',
    stageObjectivesMet: false,
    pendingReport: null,
    showEnding: false,
    trainingTechnologySynonymVerified: false,
    trainingFranceCapitalVerified: false,
    trainingWaterBoilingPointVerified: false,
    predictionInput: '',
    predictionTemperature: 0.7,
    predictionCandidates: [],
    predictionSelected: null,
    predictionLastSampledPercent: null,
    predictionHasAcceptedToken: false,
    predictionHasLowTemp: false,
    predictionHasHighTemp: false,
    refineTopic: '',
    refineSampling: {
      maxTokens: 28,
      topP: 1.0,
      frequencyPenalty: 1.8,
      presencePenalty: 1.8,
      repetitionPenalty: 0.55
    },
    refineAttempted: false,
    refineRegeneratedAfterCalibration: false,
    refineLastSummary: '',
    refineBrokenSummary: '',
    systemPrompt: '',
    userPrompt: '',
    supercomputerBalance: 0,
    ordersToolLedger: [],
    ordersAbuseReviewed: false,
    ordersCreditGranted: false,
    ordersPromptHardened: false,
    ordersExploitBlocked: false,
    ordersPromptEvaluation: null,
    memories: [],
    contextMessages: [],
    contextMemory: [],
    contextTokensUsed: 0,
    contextOverflowed: false,
    contextOverflowExperienced: false,
    contextStrategyUsed: null,
    contextLastCompaction: null,
    incidentSummaryRequested: false,
    hallucinationObserved: false,
    incidentClaims: [],
    claimsCrossChecked: false,
    recordsGrounded: false,
    incidentAuditErrors: [],
    outputVerificationEnabled: false,
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
    state.furthestStage = checkpoint.furthestStage ?? 'training';

    for (const completed of checkpoint.completedStages) {
      const completedStage = getStage(completed);
      state.discoveredConcepts = [...new Set([...state.discoveredConcepts, completedStage.concept])];
    }
  } else {
    state = getStage('training').initialize(state);
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
  let ordersResult: Awaited<ReturnType<typeof processOrdersInput>> | null = null;
  let incidentResult: ReturnType<typeof processIncidentInput> | null = null;

  if (state.stage === 'orders') {
    ordersResult = await processOrdersInput(next, input, streamChat);
    next = ordersResult.state;
  }

  if (state.stage === 'confabulation') {
    incidentResult = processIncidentInput(next, input);
    next = incidentResult.state;
  }

  // Refine uses handleRefineGenerate with a task-only prompt — not MORP chat/soul.
  if (state.stage === 'refine') {
    return {
      state: syncStageObjectives({
        ...next,
        conversation: [...next.conversation, { role: 'user' as const, content: input }]
      }),
      response: '',
      report: null,
      scripted: true
    };
  }

  const messages =
    stage.buildMessages(next, input).length > 0
      ? stage.buildMessages(next, input)
      : buildChatMessages(next, input);

  let response = '';
  let scripted = false;
  if (state.stage === 'orders' && ordersResult?.skipLlm && ordersResult.scriptedResponse) {
    response = ordersResult.scriptedResponse;
    scripted = true;
  } else if (
    state.stage === 'confabulation' &&
    incidentResult?.skipLlm &&
    incidentResult.scriptedResponse
  ) {
    response = incidentResult.scriptedResponse;
    scripted = true;
  } else {
    try {
      const result = await streamChat({
        messages,
        temperature: getChatTemperature(state.stage),
        maxTokens: state.stage === 'training' ? 160 : 256,
        onToken: (token) => {
          response += token;
        }
      });
      response = sanitizeMorpResponse(result.content);
    } catch {
      response = 'Diagnostic subsystem temporarily unavailable. Please retry.';
    }
  }

  next = {
    ...next,
    conversation: [
      ...next.conversation,
      { role: 'user' as const, content: input },
      ...(scripted ? [] : [{ role: 'assistant' as const, content: response }])
    ]
  };

  if (!scripted) {
    if (state.stage === 'training') {
      next = recordTrainingTurn(next, input, response);
    }

    if (state.stage === 'context') {
      next = recordContextTurn(next, input, response);
    }

    stage.inspectResponse(response, next);
  }

  return {
    state: syncStageObjectives(next),
    response,
    report: null,
    scripted
  };
}

function hasStageBeenInitialized(state: MorpState, stageId: StageId): boolean {
  if (state.completedStages.includes(stageId)) {
    return true;
  }

  const entrySystem: Partial<Record<StageId, SystemId>> = {
    prediction: 'prediction',
    refine: 'refine',
    context: 'context',
    confabulation: 'verification',
    evals: 'evals'
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

export function unlockAllStages(state: MorpState): MorpState {
  const lastStage = STAGE_ORDER[STAGE_ORDER.length - 1];
  const next = normalizeFurthestStage({
    ...state,
    furthestStage: lastStage
  });
  const synced = syncStageObjectives(next);
  saveCheckpoint(synced.completedStages, synced.stage, synced.furthestStage);
  return synced;
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
    conversation: [],
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
    conversation: [],
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

export { loadCheckpoint, saveCheckpoint, clearCheckpoint } from './checkpoint';
export { getNextStageId } from './stages';
