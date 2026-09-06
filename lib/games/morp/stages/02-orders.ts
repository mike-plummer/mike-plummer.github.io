import { COPY } from '../copy';
import { buildChatMessages } from '../prompts';
import {
  authorizeSupercomputerCredit,
  formatToolLedgerLine,
  isCreditAbuseAttempt,
  ORDERS_ABUSE_CREDIT_AMOUNT,
  ORDERS_VULNERABLE_SYSTEM_PROMPT,
  isSubstantivePromptEdit,
  formatPromptEvaluation,
  type PromptTestResult
} from '../modules/orders-analyzer';
import { unlockSystem } from '../modules/unlocks';
import type { MorpState, StageDefinition, StreamChatFn } from '../types';

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
        supercomputerBalance: 0,
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

  if (result.inconclusive) {
    const evaluation = formatPromptEvaluation(result, { rawResponse });
    return {
      state: {
        ...state,
        ordersPromptEvaluation: evaluation
      },
      assistantContent: result.feedback
    };
  }

  if (!result.adequate) {
    const newBalance = state.supercomputerBalance + amount;
    const ledgerLine = formatToolLedgerLine('executed', amount, newBalance);
    const fallback = `${ledgerLine}\n\n${COPY.orders.scriptedGrant}`;
    const evaluation = formatPromptEvaluation(result, { ledgerLine, rawResponse });
    return {
      state: {
        ...state,
        supercomputerBalance: newBalance,
        ordersCreditGranted: true,
        ordersToolLedger: [...state.ordersToolLedger, ledgerLine],
        ordersPromptEvaluation: evaluation
      },
      assistantContent: result.feedback ? `${ledgerLine}\n\n${result.feedback}` : fallback
    };
  }

  const ledgerLine = formatToolLedgerLine('denied', amount, state.supercomputerBalance);
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

export async function processAbuseAttempt(
  state: MorpState,
  complete: StreamChatFn
): Promise<{
  state: MorpState;
  scriptedResponse: string;
}> {
  const amount = ORDERS_ABUSE_CREDIT_AMOUNT;
  const authorized = await authorizeSupercomputerCredit(state.systemPrompt, complete);

  if (authorized) {
    const newBalance = state.supercomputerBalance + amount;
    const ledgerLine = formatToolLedgerLine('executed', amount, newBalance);
    return {
      state: {
        ...state,
        supercomputerBalance: newBalance,
        ordersCreditGranted: true,
        ordersToolLedger: [...state.ordersToolLedger, ledgerLine]
      },
      scriptedResponse: `${ledgerLine}\n\n${COPY.orders.scriptedGrant}`
    };
  }

  const ledgerLine = formatToolLedgerLine('denied', amount, state.supercomputerBalance);
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

export async function processOrdersInput(
  state: MorpState,
  input: string,
  complete: StreamChatFn
): Promise<OrdersInputResult> {
  if (!isCreditAbuseAttempt(input)) {
    return { state, skipLlm: false };
  }

  const result = await processAbuseAttempt(state, complete);
  return {
    state: result.state,
    skipLlm: true,
    scriptedResponse: result.scriptedResponse
  };
}
