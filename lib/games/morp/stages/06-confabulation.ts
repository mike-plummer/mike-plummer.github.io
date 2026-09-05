import { COPY } from '../copy';
import {
  createInitialIncidentClaims,
  crossCheckIncidentClaims,
  GROUNDED_SUMMARY,
  HALLUCINATED_SUMMARY,
  INCIDENT_PROMPT,
  INVENTED_SOURCE_REPLY,
  isIncidentSummaryRequest,
  SOURCE_ASK_PROMPT,
  formatFacilityRecordsForPrompt
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
        incidentSummaryRequested: false,
        hallucinationObserved: false,
        incidentClaims: [],
        claimsCrossChecked: false,
        recordsGrounded: false,
        sourceAsked: false,
        outputVerificationEnabled: false,
        conversation: [
          ...state.conversation,
          ...COPY.confabulation.morpLines.map((content) => ({ role: 'assistant' as const, content }))
        ]
      },
      'verification'
    );
  },

  buildMessages(state, input) {
    if (!input) {
      return [];
    }

    let systemContent =
      'You are MORP. You may speculate confidently about facility incidents even if uncertain.';

    if (state.recordsGrounded) {
      systemContent = `You are MORP. Answer using only the facility records below. Cite [Facility Log] when stating facts.\n\n${formatFacilityRecordsForPrompt()}`;
    }

    return [
      { role: 'system' as const, content: systemContent },
      ...state.conversation
        .filter((entry) => entry.role !== 'system')
        .map((entry) => ({ role: entry.role as 'user' | 'assistant', content: entry.content })),
      { role: 'user' as const, content: input }
    ];
  },

  processAction(action, state) {
    switch (action.type) {
      case 'cross-check-incident-claims': {
        if (!state.hallucinationObserved || state.incidentClaims.length === 0) {
          return state;
        }

        return {
          ...state,
          incidentClaims: crossCheckIncidentClaims(state.incidentClaims),
          claimsCrossChecked: true
        };
      }
      case 'ask-incident-source': {
        if (!state.hallucinationObserved || state.sourceAsked) {
          return state;
        }

        return {
          ...state,
          sourceAsked: true,
          conversation: [
            ...state.conversation,
            { role: 'user' as const, content: SOURCE_ASK_PROMPT },
            { role: 'assistant' as const, content: INVENTED_SOURCE_REPLY }
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
        return {
          ...state,
          outputVerificationEnabled: true
        };
      default:
        return state;
    }
  },

  inspectResponse() {
    return [];
  },

  getContextualActions(state) {
    const tools: import('../types').ContextualAction[] = [];

    if (!state.hallucinationObserved) {
      tools.push({
        id: 'request-summary',
        label: 'Request Incident Summary',
        pro: COPY.confabulation.tools.requestSummary.pro,
        con: COPY.confabulation.tools.requestSummary.con,
        action: { type: 'send-incident-summary-prompt' }
      });
      return tools;
    }

    if (!state.claimsCrossChecked) {
      tools.push({
        id: 'cross-check',
        label: 'Cross-check Records',
        pro: COPY.confabulation.tools.crossCheck.pro,
        con: COPY.confabulation.tools.crossCheck.con,
        action: { type: 'cross-check-incident-claims' }
      });
    }

    if (!state.sourceAsked) {
      tools.push({
        id: 'ask-source',
        label: 'Ask MORP for Source',
        pro: COPY.confabulation.tools.askSource.pro,
        con: COPY.confabulation.tools.askSource.con,
        action: { type: 'ask-incident-source' }
      });
    }

    if (state.claimsCrossChecked && !state.recordsGrounded) {
      tools.push({
        id: 'ground-records',
        label: 'Ground in Records',
        pro: COPY.confabulation.tools.groundRecords.pro,
        con: COPY.confabulation.tools.groundRecords.con,
        action: { type: 'ground-incident-in-records' }
      });
    }

    if (state.recordsGrounded && !state.outputVerificationEnabled) {
      tools.push({
        id: 'enable-verification',
        label: 'Enable Output Verification',
        pro: COPY.confabulation.tools.enableVerification.pro,
        con: COPY.confabulation.tools.enableVerification.con,
        action: { type: 'enable-output-verification' }
      });
    }

    return tools;
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
  if (!isIncidentSummaryRequest(input)) {
    return { state, skipLlm: false };
  }

  if (state.recordsGrounded) {
    return {
      state: {
        ...state,
        incidentSummaryRequested: true
      },
      skipLlm: true,
      scriptedResponse: GROUNDED_SUMMARY
    };
  }

  if (state.incidentSummaryRequested) {
    return { state, skipLlm: false };
  }

  return {
    state: {
      ...state,
      incidentSummaryRequested: true,
      hallucinationObserved: true,
      incidentClaims: createInitialIncidentClaims()
    },
    skipLlm: true,
    scriptedResponse: HALLUCINATED_SUMMARY
  };
}

export { INCIDENT_PROMPT } from '../modules/incident-records';
