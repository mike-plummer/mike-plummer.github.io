import { COPY } from '../copy';
import { formatEvalDuration } from '../modules/eval-judge';
import {
  HALLUCINATED_SUMMARY,
  INCIDENT_PROMPT
} from '../modules/incident-records';
import { buildChatMessages } from '../prompts';
import { unlockSystem } from '../modules/unlocks';
import type { DiagnosticReport, MorpState, StageDefinition } from '../types';

function buildEvalDiagnosticReport(state: MorpState): DiagnosticReport {
  const llm = state.evalLlmScores;
  const human = state.evalHumanScores;
  const llmDuration = state.evalLlmDurationMs !== null ? formatEvalDuration(state.evalLlmDurationMs) : '—';
  const humanDuration =
    state.evalHumanDurationMs !== null ? formatEvalDuration(state.evalHumanDurationMs) : '—';

  const whatHappened =
    llm && human
      ? `The LLM judge rated quality ${llm.quality} / completeness ${llm.completeness} in ${llmDuration}. You rated quality ${human.quality} / completeness ${human.completeness} in ${humanDuration}.`
      : COPY.evals.report.whatHappened;

  return {
    title: COPY.evals.report.title,
    whatHappened,
    keyIdea: COPY.evals.report.keyIdea
  };
}

export const evalsStage: StageDefinition = {
  id: 'evals',
  concept: 'evals',

  initialize(state) {
    return unlockSystem(
      {
        ...state,
        stage: 'evals',
        evalSummaryGenerated: true,
        evalLlmJudgeRunning: false,
        evalLlmJudgeCompleted: false,
        evalLlmScores: null,
        evalLlmDurationMs: null,
        evalLlmFeedback: null,
        evalHumanJudgeStartedAt: null,
        evalHumanDraftScores: null,
        evalHumanJudgeCompleted: false,
        evalHumanScores: null,
        evalHumanDurationMs: null,
        conversation: [
          ...state.conversation,
          ...COPY.evals.morpLines.map((content) => ({ role: 'assistant' as const, content })),
          { role: 'user' as const, content: INCIDENT_PROMPT },
          { role: 'assistant' as const, content: HALLUCINATED_SUMMARY }
        ]
      },
      'evals'
    );
  },

  buildMessages(state, input) {
    if (!input) {
      return [];
    }
    return buildChatMessages(state, input);
  },

  processAction(action, state) {
    switch (action.type) {
      case 'run-llm-eval':
        if (state.evalLlmJudgeRunning || state.evalLlmJudgeCompleted) {
          return state;
        }
        return { ...state, evalLlmJudgeRunning: true };
      case 'complete-llm-eval':
        return {
          ...state,
          evalLlmJudgeRunning: false,
          evalLlmJudgeCompleted: true,
          evalLlmScores: action.scores,
          evalLlmDurationMs: action.durationMs,
          evalLlmFeedback: action.feedback
        };
      case 'set-eval-human-scores': {
        if (state.evalHumanJudgeCompleted || !state.evalLlmJudgeCompleted) {
          return state;
        }

        const startedAt = state.evalHumanJudgeStartedAt ?? performance.now();
        return {
          ...state,
          evalHumanJudgeStartedAt: startedAt,
          evalHumanDraftScores: action.scores
        };
      }
      case 'submit-human-eval': {
        if (state.evalHumanJudgeCompleted || !state.evalLlmJudgeCompleted || !state.evalHumanDraftScores) {
          return state;
        }

        return {
          ...state,
          evalHumanJudgeCompleted: true,
          evalHumanScores: state.evalHumanDraftScores,
          evalHumanDurationMs: action.durationMs
        };
      }
      default:
        return state;
    }
  },

  inspectResponse() {
    return [];
  },

  getContextualActions() {
    return [];
  },

  isComplete(state) {
    return state.evalLlmJudgeCompleted && state.evalHumanJudgeCompleted;
  },

  getDiagnosticReport(state) {
    return buildEvalDiagnosticReport(state);
  }
};

export const EVAL_SUMMARY = HALLUCINATED_SUMMARY;
