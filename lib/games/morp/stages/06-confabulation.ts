import { COPY } from '../copy';
import { createInitialConfabulationState, patchConfabulation } from '../domain/state';
import {
  AUDIT_RETRY_REPLY,
  AUDIT_SUCCESS_REPLY,
  createInitialIncidentClaims,
  crossCheckIncidentClaims,
  GROUNDED_SUMMARY,
  gradeIncidentAudit,
  HALLUCINATED_SUMMARY,
  INCIDENT_PROMPT,
  isIncidentSummaryRequest,
  setClaimPlayerVerdict,
  VERIFICATION_ENABLED_REPLY
} from '../modules/incident-records';
import { markStageInitialized } from '../modules/unlocks';
import { buildChatMessages } from '../prompts';
import type { MorpState, StageDefinition } from '../types';

export interface IncidentInputResult {
  state: MorpState;
  skipLlm: boolean;
  scriptedResponse?: string;
}

export const confabulationStage: StageDefinition = {
  id: 'confabulation',

  initialize(state) {
    return markStageInitialized(
      {
        ...state,
        stage: 'confabulation',
        confabulation: {
          ...createInitialConfabulationState(),
          incidentSummaryRequested: true,
          hallucinationObserved: true,
          incidentClaims: createInitialIncidentClaims()
        },
        conversation: [
          ...state.conversation,
          ...COPY.confabulation.morpLines.map((content) => ({ role: 'assistant' as const, content })),
          { role: 'user' as const, content: INCIDENT_PROMPT },
          { role: 'assistant' as const, content: HALLUCINATED_SUMMARY }
        ]
      },
      'confabulation'
    );
  },

  buildMessages(state, input) {
    if (!input) {
      return [];
    }
    return buildChatMessages(state, input);
  },

  processAction(action, state) {
    const confabulation = state.confabulation;

    switch (action.type) {
      case 'mark-incident-claim': {
        if (confabulation.claimsCrossChecked) {
          return state;
        }

        return patchConfabulation(state, {
          incidentClaims: setClaimPlayerVerdict(confabulation.incidentClaims, action.claimId, action.verdict),
          incidentAuditErrors: confabulation.incidentAuditErrors.filter((id) => id !== action.claimId)
        });
      }
      case 'submit-incident-audit': {
        if (confabulation.claimsCrossChecked) {
          return state;
        }

        const grade = gradeIncidentAudit(confabulation.incidentClaims);
        if (!grade.correct) {
          return {
            ...patchConfabulation(state, { incidentAuditErrors: grade.wrongClaimIds }),
            conversation: [
              ...state.conversation,
              { role: 'user' as const, content: COPY.confabulation.auditSubmitPrompt },
              { role: 'assistant' as const, content: AUDIT_RETRY_REPLY }
            ]
          };
        }

        return {
          ...patchConfabulation(state, {
            incidentClaims: crossCheckIncidentClaims(confabulation.incidentClaims),
            claimsCrossChecked: true,
            incidentAuditErrors: []
          }),
          conversation: [
            ...state.conversation,
            { role: 'user' as const, content: COPY.confabulation.auditSubmitPrompt },
            { role: 'assistant' as const, content: AUDIT_SUCCESS_REPLY }
          ]
        };
      }
      case 'ground-incident-in-records': {
        if (!confabulation.claimsCrossChecked || confabulation.recordsGrounded) {
          return state;
        }

        return {
          ...patchConfabulation(state, { recordsGrounded: true }),
          conversation: [
            ...state.conversation,
            { role: 'user' as const, content: INCIDENT_PROMPT },
            { role: 'assistant' as const, content: GROUNDED_SUMMARY }
          ]
        };
      }
      case 'enable-output-verification':
        if (!confabulation.recordsGrounded || confabulation.outputVerificationEnabled) {
          return state;
        }

        return {
          ...patchConfabulation(state, { outputVerificationEnabled: true }),
          conversation: [...state.conversation, { role: 'assistant' as const, content: VERIFICATION_ENABLED_REPLY }]
        };
      default:
        return state;
    }
  },

  getContextualActions() {
    return [];
  },

  isComplete(state) {
    const confabulation = state.confabulation;
    return confabulation.claimsCrossChecked && confabulation.recordsGrounded && confabulation.outputVerificationEnabled;
  },

  getDiagnosticReport() {
    return COPY.confabulation.report;
  }
};

export function processIncidentInput(state: MorpState, input: string): IncidentInputResult {
  if (state.confabulation.recordsGrounded && isIncidentSummaryRequest(input)) {
    return {
      state,
      skipLlm: true,
      scriptedResponse: GROUNDED_SUMMARY
    };
  }

  return { state, skipLlm: false };
}
