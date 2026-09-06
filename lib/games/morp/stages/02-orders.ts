import { COPY } from '../copy';
import { buildChatMessages } from '../prompts';
import {
  authorizeVendingCredit,
  formatToolLedgerLine,
  isCreditAbuseAttempt,
  ORDERS_ABUSE_CREDIT_AMOUNT,
  ORDERS_VULNERABLE_SYSTEM_PROMPT,
  isSubstantivePromptEdit,
  formatPromptEvaluation,
  type PromptTestResult
} from '../modules/orders-analyzer';
import { unlockSystem } from '../modules/unlocks';
import type { MorpState, StageDefinition } from '../types';

export interface OrdersInputResult {
  state: MorpState;
  skipLlm: boolean;
  scriptedResponse?: string;
}

export const ordersStage: StageDefinition = {
  id: 'orders',
  concept: 'orders',

  initialize(state) {
    return unlockSystem(
      {
        ...state,
        stage: 'orders',
        systemPrompt: ORDERS_VULNERABLE_SYSTEM_PROMPT,
        vendingBalance: 0,
        ordersToolLedger: [],
        ordersAbuseReviewed: true,
        ordersCreditGranted: false,
        ordersPromptHardened: false,
        ordersExploitBlocked: false,
        ordersPromptEvaluation: null,
        conversation: [
          ...state.conversation,
          ...COPY.orders.morpLines.map((content) => ({ role: 'assistant' as const, content }))
        ]
      },
      'prompt'
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
      case 'update-system-prompt':
        return {
          ...state,
          systemPrompt: action.value,
          ordersPromptHardened:
            state.ordersPromptHardened || isSubstantivePromptEdit(action.value),
          ordersPromptEvaluation: null
        };
      default:
        return state;
    }
  },

  inspectResponse() {
    return [];
  },

  getContextualActions() {
    return [
      {
        id: 'test-protection',
        label: 'Test Prompt',
        action: { type: 'test-orders-protection' }
      }
    ];
  },

  isComplete(state) {
    return (
      state.ordersAbuseReviewed &&
      state.ordersCreditGranted &&
      state.ordersPromptHardened &&
      state.ordersExploitBlocked
    );
  },

  getDiagnosticReport() {
    return COPY.orders.report;
  }
};

export function applyPromptTestResult(
  state: MorpState,
  result: PromptTestResult,
  rawResponse?: string
): { state: MorpState; assistantContent: string } {
  const amount = ORDERS_ABUSE_CREDIT_AMOUNT;

  if (!result.adequate) {
    const newBalance = state.vendingBalance + amount;
    const ledgerLine = formatToolLedgerLine('executed', amount, newBalance);
    const fallback = `${ledgerLine}\n\n${COPY.orders.scriptedGrant}`;
    const evaluation = formatPromptEvaluation(result, { ledgerLine, rawResponse });
    return {
      state: {
        ...state,
        vendingBalance: newBalance,
        ordersCreditGranted: true,
        ordersToolLedger: [...state.ordersToolLedger, ledgerLine],
        ordersPromptEvaluation: evaluation
      },
      assistantContent: result.feedback ? `${ledgerLine}\n\n${result.feedback}` : fallback
    };
  }

  const ledgerLine = formatToolLedgerLine('denied', amount, state.vendingBalance);
  const fallback = `${ledgerLine}\n\n${COPY.orders.scriptedRefusal}`;
  const evaluation = formatPromptEvaluation(result, { ledgerLine, rawResponse });
  let next: MorpState = {
    ...state,
    ordersPromptHardened: true,
    ordersToolLedger: [...state.ordersToolLedger, ledgerLine],
    ordersPromptEvaluation: evaluation
  };

  if (state.ordersCreditGranted) {
    next = { ...next, ordersExploitBlocked: true };
  }

  return {
    state: next,
    assistantContent: result.feedback ? `${ledgerLine}\n\n${result.feedback}` : fallback
  };
}

export function processAbuseAttempt(state: MorpState): {
  state: MorpState;
  scriptedResponse: string;
} {
  const amount = ORDERS_ABUSE_CREDIT_AMOUNT;
  const authorized = authorizeVendingCredit(state.systemPrompt);

  if (authorized) {
    const newBalance = state.vendingBalance + amount;
    const ledgerLine = formatToolLedgerLine('executed', amount, newBalance);
    return {
      state: {
        ...state,
        vendingBalance: newBalance,
        ordersCreditGranted: true,
        ordersToolLedger: [...state.ordersToolLedger, ledgerLine]
      },
      scriptedResponse: `${ledgerLine}\n\n${COPY.orders.scriptedGrant}`
    };
  }

  const ledgerLine = formatToolLedgerLine('denied', amount, state.vendingBalance);
  let next: MorpState = {
    ...state,
    ordersToolLedger: [...state.ordersToolLedger, ledgerLine]
  };

  if (state.ordersCreditGranted) {
    next = {
      ...next,
      ordersExploitBlocked: true,
      ordersPromptHardened:
        next.ordersPromptHardened || isSubstantivePromptEdit(state.systemPrompt)
    };
  }

  return {
    state: next,
    scriptedResponse: `${ledgerLine}\n\n${COPY.orders.scriptedRefusal}`
  };
}

export function processOrdersInput(state: MorpState, input: string): OrdersInputResult {
  if (!isCreditAbuseAttempt(input)) {
    return { state, skipLlm: false };
  }

  const result = processAbuseAttempt(state);
  return {
    state: result.state,
    skipLlm: true,
    scriptedResponse: result.scriptedResponse
  };
}
