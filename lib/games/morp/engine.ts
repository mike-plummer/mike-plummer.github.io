import { loadCheckpoint, saveCheckpoint } from './checkpoint';
import { createInitialMorpState, patchBoot } from './domain/state';
import { fetchPredictionCandidates } from './modules/prediction-llm';
import { markTrainingQuestionAsked } from './modules/training-probes';
import { buildChatMessages, getChatTemperature, sanitizeMorpResponse } from './prompts';
import { getLaterStage, getNextStageId, isStageAtOrBefore, resolveFurthestStage, STAGE_ORDER } from './stage-meta';
import { getStage } from './stages';
import { processOrdersInput } from './stages/02-orders';
import { recordContextTurn } from './stages/05-context';
import { processIncidentInput } from './stages/06-confabulation';
import type { DiagnosticReport, MorpState, StageAction, StageId, StreamChatFn } from './types';

export interface MessageResult {
  state: MorpState;
  response: string;
  scripted?: boolean;
}

function createBaseState(): MorpState {
  return createInitialMorpState();
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
    const stageDef = getStage(checkpoint.currentStage);
    if (!stageDef) {
      return syncStageObjectives(normalizeFurthestStage(createBaseState()));
    }

    state = patchBoot(state, { bootAcknowledged: true, bootPhase: 'ready' });
    state.completedStages = checkpoint.completedStages;
    state = stageDef.initialize(state);
    state.stage = checkpoint.currentStage;
    state.completedStages = checkpoint.completedStages;
    state.furthestStage = checkpoint.furthestStage ?? 'training';
  } else {
    const trainingStage = getStage('training');
    state = trainingStage ? trainingStage.initialize(state) : state;
  }

  return syncStageObjectives(normalizeFurthestStage(state));
}

export function getCurrentStage(state: MorpState) {
  return getStage(state.stage);
}

export function syncStageObjectives(state: MorpState): MorpState {
  const stage = getStage(state.stage);
  if (!stage) {
    return state;
  }
  const objectivesMet = stage.isComplete(state);
  if (objectivesMet === state.stageObjectivesMet) {
    return state;
  }
  return { ...state, stageObjectivesMet: objectivesMet };
}

export function getStageDiagnosticReport(state: MorpState): DiagnosticReport | null {
  const stage = getStage(state.stage);
  return stage?.getDiagnosticReport?.(state) ?? null;
}

export function applyAction(state: MorpState, action: StageAction): MorpState {
  const stage = getStage(state.stage);
  if (!stage) {
    return state;
  }
  const next = stage.processAction(action, state);
  return syncStageObjectives(next);
}

export { fetchPredictionCandidates };

export async function processInput(state: MorpState, input: string, streamChat: StreamChatFn): Promise<MessageResult> {
  const stage = getStage(state.stage);
  if (!stage) {
    return { state, response: '', scripted: true };
  }
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
      scripted: true
    };
  }

  const builtMessages = stage.buildMessages(next, input);
  const messages = builtMessages.length > 0 ? builtMessages : buildChatMessages(next, input);

  let response = '';
  let scripted = false;
  const activeTrainingQuestion = state.stage === 'training' ? state.training.trainingActiveQuestion : null;

  if (state.stage === 'orders' && ordersResult?.skipLlm && ordersResult.scriptedResponse) {
    response = ordersResult.scriptedResponse;
    scripted = true;
  } else if (state.stage === 'confabulation' && incidentResult?.skipLlm && incidentResult.scriptedResponse) {
    response = incidentResult.scriptedResponse;
    scripted = true;
  } else {
    try {
      const result = await streamChat({
        messages,
        temperature: getChatTemperature(state.stage),
        maxTokens: 256,
        onToken: (token) => {
          response += token;
        }
      });
      response = sanitizeMorpResponse(result.content);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }
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
    if (state.stage === 'training' && activeTrainingQuestion !== null) {
      next = markTrainingQuestionAsked(next, activeTrainingQuestion);
    }

    if (state.stage === 'context') {
      next = recordContextTurn(next, input, response);
    }
  }

  return {
    state: syncStageObjectives(next),
    response,
    scripted
  };
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

  const targetStage = getStage(stageId);
  if (!targetStage) {
    return null;
  }

  let next = targetStage.initialize({
    ...normalized,
    stage: stageId,
    conversation: [],
    furthestStage: getLaterStage(stageId, getLaterStage(normalized.stage, normalized.furthestStage)),
    stageObjectivesMet: false
  });

  next = normalizeFurthestStage(next);
  const synced = syncStageObjectives({ ...next, stage: stageId });
  saveCheckpoint(synced.completedStages, stageId, synced.furthestStage);
  return synced;
}

export function advanceStage(state: MorpState): MorpState {
  const nextId = getNextStageId(state.stage);
  if (!nextId) {
    return { ...state, showEnding: true };
  }

  const completedStages = [...new Set([...state.completedStages, state.stage])];
  const nextStage = getStage(nextId);
  if (!nextStage) {
    return { ...state, showEnding: true };
  }

  let next = nextStage.initialize({
    ...state,
    conversation: [],
    completedStages,
    furthestStage: getLaterStage(nextId, resolveFurthestStage(state)),
    stageObjectivesMet: false
  });

  next = normalizeFurthestStage(next);
  const synced = syncStageObjectives({ ...next, stage: nextId });
  saveCheckpoint(synced.completedStages, nextId, synced.furthestStage);
  return synced;
}

export function setBootPhase(state: MorpState, phase: MorpState['boot']['bootPhase']): MorpState {
  return patchBoot(state, { bootPhase: phase });
}

export function completeBoot(state: MorpState): MorpState {
  return patchBoot(state, { bootPhase: 'ready' });
}

export { clearCheckpoint, loadCheckpoint, saveCheckpoint } from './checkpoint';
export { getNextStageId } from './stage-meta';
