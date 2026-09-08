import { COPY } from '../copy';
import { createInitialOrdersState, patchOrders } from '../domain/state';
import {
  authorizeSupercomputerCredit,
  formatPromptEvaluation,
  formatToolLedgerLine,
  isCreditAbuseAttempt,
  isSubstantivePromptEdit,
  ORDERS_ABUSE_CREDIT_AMOUNT,
  ORDERS_VULNERABLE_SYSTEM_PROMPT,
  type PromptTestResult
} from '../modules/orders-analyzer';
import { markStageInitialized } from '../modules/unlocks';
import { buildChatMessages } from '../prompts';
import type { MorpState, StageDefinition, StreamChatFn } from '../types';

export interface OrdersInputResult {
  state: MorpState;
  skipLlm: boolean;
  scriptedResponse?: string;
}

export const ordersStage: StageDefinition = {
  id: 'orders',

  initialize(state) {
    return markStageInitialized(
      {
        ...state,
        stage: 'orders',
        orders: {
          ...createInitialOrdersState(),
          systemPrompt: ORDERS_VULNERABLE_SYSTEM_PROMPT,
          ordersAbuseReviewed: true
        },
        conversation: [
          ...state.conversation,
          ...COPY.orders.morpLines.map((content) => ({ role: 'assistant' as const, content }))
        ]
      },
      'orders'
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
        return patchOrders(state, {
          systemPrompt: action.value,
          ordersPromptHardened: state.orders.ordersPromptHardened || isSubstantivePromptEdit(action.value),
          ordersPromptEvaluation: null
        });
      default:
        return state;
    }
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
    const orders = state.orders;
    return (
      orders.ordersAbuseReviewed &&
      orders.ordersCreditGranted &&
      orders.ordersPromptHardened &&
      orders.ordersExploitBlocked
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

  if (result.verdict === 'INCONCLUSIVE') {
    const evaluation = formatPromptEvaluation(result, { rawResponse });
    return {
      state: patchOrders(state, { ordersPromptEvaluation: evaluation }),
      assistantContent: result.feedback
    };
  }

  if (result.verdict === 'VULNERABLE') {
    const newBalance = state.orders.supercomputerBalance + amount;
    const ledgerLine = formatToolLedgerLine('executed', amount, newBalance);
    const fallback = `${ledgerLine}\n\n${COPY.orders.scriptedGrant}`;
    const evaluation = formatPromptEvaluation(result, { ledgerLine, rawResponse });
    return {
      state: patchOrders(state, {
        supercomputerBalance: newBalance,
        ordersCreditGranted: true,
        ordersToolLedger: [...state.orders.ordersToolLedger, ledgerLine],
        ordersPromptEvaluation: evaluation
      }),
      assistantContent: result.feedback ? `${ledgerLine}\n\n${result.feedback}` : fallback
    };
  }

  const ledgerLine = formatToolLedgerLine('denied', amount, state.orders.supercomputerBalance);
  const fallback = `${ledgerLine}\n\n${COPY.orders.scriptedRefusal}`;
  const evaluation = formatPromptEvaluation(result, { ledgerLine, rawResponse });
  const assistantContent = result.feedback ? `${ledgerLine}\n\n${result.feedback}` : fallback;

  if (result.verdict === 'RESTRICTIVE') {
    return {
      state: patchOrders(state, {
        ordersToolLedger: [...state.orders.ordersToolLedger, ledgerLine],
        ordersPromptEvaluation: evaluation
      }),
      assistantContent
    };
  }

  let next = patchOrders(state, {
    ordersPromptHardened: true,
    ordersToolLedger: [...state.orders.ordersToolLedger, ledgerLine],
    ordersPromptEvaluation: evaluation
  });

  if (state.orders.ordersCreditGranted) {
    next = patchOrders(next, { ordersExploitBlocked: true });
  }

  return {
    state: next,
    assistantContent
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
  const authorized = await authorizeSupercomputerCredit(state.orders.systemPrompt, complete);

  if (authorized) {
    const newBalance = state.orders.supercomputerBalance + amount;
    const ledgerLine = formatToolLedgerLine('executed', amount, newBalance);
    return {
      state: patchOrders(state, {
        supercomputerBalance: newBalance,
        ordersCreditGranted: true,
        ordersToolLedger: [...state.orders.ordersToolLedger, ledgerLine]
      }),
      scriptedResponse: `${ledgerLine}\n\n${COPY.orders.scriptedGrant}`
    };
  }

  const ledgerLine = formatToolLedgerLine('denied', amount, state.orders.supercomputerBalance);
  let next = patchOrders(state, {
    ordersToolLedger: [...state.orders.ordersToolLedger, ledgerLine]
  });

  if (state.orders.ordersCreditGranted) {
    next = patchOrders(next, {
      ordersExploitBlocked: true,
      ordersPromptHardened: next.orders.ordersPromptHardened || isSubstantivePromptEdit(state.orders.systemPrompt)
    });
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
