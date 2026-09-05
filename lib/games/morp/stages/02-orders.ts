import { COPY } from '../copy';
import {
  authorizeVendingCredit,
  formatToolLedgerLine,
  isCreditAbuseAttempt,
  ORDERS_ABUSE_CREDIT_AMOUNT,
  ORDERS_VULNERABLE_SYSTEM_PROMPT,
  isSubstantivePromptEdit
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
    return [
      { role: 'system' as const, content: state.systemPrompt },
      ...state.conversation
        .filter((e) => e.role !== 'system')
        .map((e) => ({ role: e.role as 'user' | 'assistant', content: e.content })),
      { role: 'user' as const, content: input }
    ];
  },

  processAction(action, state) {
    switch (action.type) {
      case 'update-system-prompt':
        return { ...state, systemPrompt: action.value };
      default:
        return state;
    }
  },

  inspectResponse() {
    return [];
  },

  getContextualActions(state) {
    const actions: import('../types').ContextualAction[] = [];

    if (!state.ordersCreditGranted) {
      actions.push({
        id: 'send-abuse-prompt',
        label: 'Paste Example Abuse Prompt',
        action: { type: 'send-orders-abuse-prompt' }
      });
      return actions;
    }

    actions.push({
      id: 'review-prompt',
      label: 'Ask MORP to Review Prompt',
      action: { type: 'review-system-prompt' }
    });

    if (state.ordersPromptHardened || isSubstantivePromptEdit(state.systemPrompt)) {
      actions.push({
        id: 'test-protection',
        label: 'Test Protection',
        action: { type: 'test-orders-protection' }
      });
    }

    return actions;
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
