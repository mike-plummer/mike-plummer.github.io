import { COPY } from '../copy';
import { createInitialEvalsState, patchEvals } from '../domain/state';
import { formatEvalDuration } from '../modules/eval-judge';
import { HALLUCINATED_SUMMARY, INCIDENT_PROMPT } from '../modules/incident-records';
import { markStageInitialized } from '../modules/unlocks';
import { buildChatMessages } from '../prompts';
import type { DiagnosticReport, MorpState, StageDefinition } from '../types';

function buildEvalDiagnosticReport(state: MorpState): DiagnosticReport {
  const evals = state.evals;
  const llm = evals.evalLlmScores;
  const human = evals.evalHumanScores;
  const llmDuration = evals.evalLlmDurationMs !== null ? formatEvalDuration(evals.evalLlmDurationMs) : '—';
  const humanDuration = evals.evalHumanDurationMs !== null ? formatEvalDuration(evals.evalHumanDurationMs) : '—';

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

  initialize(state) {
    return markStageInitialized(
      {
        ...state,
        stage: 'evals',
        evals: {
          ...createInitialEvalsState(),
          evalSummaryGenerated: true
        },
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
    const evals = state.evals;

    switch (action.type) {
      case 'run-llm-eval':
        if (evals.evalLlmJudgeRunning || evals.evalLlmJudgeCompleted) {
          return state;
        }
        return patchEvals(state, { evalLlmJudgeRunning: true });
      case 'complete-llm-eval':
        return patchEvals(state, {
          evalLlmJudgeRunning: false,
          evalLlmJudgeCompleted: true,
          evalLlmScores: action.scores,
          evalLlmDurationMs: action.durationMs,
          evalLlmFeedback: action.feedback
        });
      case 'set-eval-human-scores': {
        if (evals.evalHumanJudgeCompleted || !evals.evalLlmJudgeCompleted) {
          return state;
        }

        const startedAt = evals.evalHumanJudgeStartedAt ?? performance.now();
        return patchEvals(state, {
          evalHumanJudgeStartedAt: startedAt,
          evalHumanDraftScores: action.scores
        });
      }
      case 'submit-human-eval': {
        if (evals.evalHumanJudgeCompleted || !evals.evalLlmJudgeCompleted || !evals.evalHumanDraftScores) {
          return state;
        }

        return patchEvals(state, {
          evalHumanJudgeCompleted: true,
          evalHumanScores: evals.evalHumanDraftScores,
          evalHumanDurationMs: action.durationMs
        });
      }
      default:
        return state;
    }
  },

  getContextualActions() {
    return [];
  },

  isComplete(state) {
    const evals = state.evals;
    return evals.evalLlmJudgeCompleted && evals.evalHumanJudgeCompleted;
  },

  getDiagnosticReport(state) {
    return buildEvalDiagnosticReport(state);
  }
};

export const EVAL_SUMMARY = HALLUCINATED_SUMMARY;
