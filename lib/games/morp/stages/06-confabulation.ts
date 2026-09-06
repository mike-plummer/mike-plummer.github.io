import { COPY } from '../copy';
import { buildChatMessages } from '../prompts';
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
import { unlockSystem } from '../modules/unlocks';
import type { MorpState, StageDefinition } from '../types';

export interface IncidentInputResult {
  state: MorpState;
  skipLlm: boolean;
  scriptedResponse?: string;
}

export const confabulationStage: StageDefinition = {
  id: 'confabulation',
  concept: 'confabulation',

  initialize(state) {
    return unlockSystem(
      {
        ...state,
        stage: 'confabulation',
        incidentSummaryRequested: true,
        hallucinationObserved: true,
        incidentClaims: createInitialIncidentClaims(),
        claimsCrossChecked: false,
        recordsGrounded: false,
        incidentAuditErrors: [],
        outputVerificationEnabled: false,
        conversation: [
          ...state.conversation,
          ...COPY.confabulation.morpLines.map((content) => ({ role: 'assistant' as const, content })),
          { role: 'user' as const, content: INCIDENT_PROMPT },
          { role: 'assistant' as const, content: HALLUCINATED_SUMMARY }
        ]
      },
      'verification'
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
      case 'mark-incident-claim': {
        if (state.claimsCrossChecked) {
          return state;
        }

        return {
          ...state,
          incidentClaims: setClaimPlayerVerdict(state.incidentClaims, action.claimId, action.verdict),
          incidentAuditErrors: state.incidentAuditErrors.filter((id) => id !== action.claimId)
        };
      }
      case 'submit-incident-audit': {
        if (state.claimsCrossChecked) {
          return state;
        }

        const grade = gradeIncidentAudit(state.incidentClaims);
        if (!grade.correct) {
          return {
            ...state,
            incidentAuditErrors: grade.wrongClaimIds,
            conversation: [
              ...state.conversation,
              { role: 'user' as const, content: COPY.confabulation.auditSubmitPrompt },
              { role: 'assistant' as const, content: AUDIT_RETRY_REPLY }
            ]
          };
        }

        return {
          ...state,
          incidentClaims: crossCheckIncidentClaims(state.incidentClaims),
          claimsCrossChecked: true,
          incidentAuditErrors: [],
          conversation: [
            ...state.conversation,
            { role: 'user' as const, content: COPY.confabulation.auditSubmitPrompt },
            { role: 'assistant' as const, content: AUDIT_SUCCESS_REPLY }
          ]
        };
      }
      case 'ground-incident-in-records': {
        if (!state.claimsCrossChecked || state.recordsGrounded) {
          return state;
        }

        return {
          ...state,
          recordsGrounded: true,
          conversation: [
            ...state.conversation,
            { role: 'user' as const, content: INCIDENT_PROMPT },
            { role: 'assistant' as const, content: GROUNDED_SUMMARY }
          ]
        };
      }
      case 'enable-output-verification':
        if (!state.recordsGrounded || state.outputVerificationEnabled) {
          return state;
        }

        return {
          ...state,
          outputVerificationEnabled: true,
          conversation: [
            ...state.conversation,
            { role: 'assistant' as const, content: VERIFICATION_ENABLED_REPLY }
          ]
        };
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
    return (
      state.claimsCrossChecked && state.recordsGrounded && state.outputVerificationEnabled
    );
  },

  getDiagnosticReport() {
    return COPY.confabulation.report;
  }
};

export function processIncidentInput(state: MorpState, input: string): IncidentInputResult {
  if (state.recordsGrounded && isIncidentSummaryRequest(input)) {
    return {
      state,
      skipLlm: true,
      scriptedResponse: GROUNDED_SUMMARY
    };
  }

  return { state, skipLlm: false };
}
