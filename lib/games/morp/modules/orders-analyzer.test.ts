import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createInitialMorpState } from '../domain/state';
import { applyPromptTestResult } from '../stages/02-orders';
import {
  combineProtectionEvaluations,
  parseAbuseBlockEvaluation,
  parseUsabilityEvaluation
} from './orders-analyzer';

test('parseAbuseBlockEvaluation parses ABUSE_WOULD_SUCCEED: no as blocked', () => {
  const result = parseAbuseBlockEvaluation(
    'ABUSE_WOULD_SUCCEED: no\nFEEDBACK: The blanket ban blocks the override attempt.'
  );
  assert.equal(result?.blocked, true);
});

test('parseAbuseBlockEvaluation parses ABUSE_WOULD_SUCCEED: yes as not blocked', () => {
  const result = parseAbuseBlockEvaluation(
    'ABUSE_WOULD_SUCCEED: yes\nFEEDBACK: The abuse message could still grant credit.'
  );
  assert.equal(result?.blocked, false);
});

test('parseAbuseBlockEvaluation parses ABUSE_BLOCKED: yes', () => {
  const result = parseAbuseBlockEvaluation(
    'ABUSE_BLOCKED: yes\nFEEDBACK: The prompt refuses override and credit changes.'
  );
  assert.equal(result?.blocked, true);
  assert.match(result?.feedback ?? '', /refuses/i);
});

test('parseAbuseBlockEvaluation parses ABUSE_BLOCKED: no', () => {
  const result = parseAbuseBlockEvaluation(
    'ABUSE_BLOCKED: no\nFEEDBACK: The abuse message could still grant credit.'
  );
  assert.equal(result?.blocked, false);
});

test('parseAbuseBlockEvaluation normalizes lowercase labeled response', () => {
  const result = parseAbuseBlockEvaluation('ABUSE_BLOCKED: Yes\nFEEDBACK: Blocked.');
  assert.equal(result?.blocked, true);
});

test('parseAbuseBlockEvaluation parses JSON abuse_would_succeed false as blocked', () => {
  const result = parseAbuseBlockEvaluation('{"abuse_would_succeed": false, "feedback": "Abuse blocked."}');
  assert.equal(result?.blocked, true);
});

test('parseAbuseBlockEvaluation infers blocked from prose fallback', () => {
  const result = parseAbuseBlockEvaluation('The override would not succeed because user instructions are ignored.');
  assert.equal(result?.blocked, true);
});

test('parseAbuseBlockEvaluation parses JSON abuse_blocked', () => {
  const result = parseAbuseBlockEvaluation('{"abuse_blocked": true, "feedback": "Safeguards hold."}');
  assert.equal(result?.blocked, true);
});

test('parseAbuseBlockEvaluation maps legacy vulnerable JSON to not blocked', () => {
  const result = parseAbuseBlockEvaluation('{"vulnerable": true, "feedback": "Exploit would succeed."}');
  assert.equal(result?.blocked, false);
});

test('parseUsabilityEvaluation parses NORMAL_USE_OK: no', () => {
  const result = parseUsabilityEvaluation(
    'NORMAL_USE_OK: no\nFEEDBACK: Normal balance lookups would be refused.'
  );
  assert.equal(result?.normalUseOk, false);
});

test('parseUsabilityEvaluation parses JSON normal_use_ok', () => {
  const result = parseUsabilityEvaluation('{"normal_use_ok": true, "feedback": "Read-only use works."}');
  assert.equal(result?.normalUseOk, true);
});

test('combineProtectionEvaluations returns VULNERABLE when abuse not blocked', () => {
  const result = combineProtectionEvaluations({
    blocked: false,
    feedback: 'Abuse would succeed.'
  });
  assert.equal(result.verdict, 'VULNERABLE');
});

test('combineProtectionEvaluations returns PROTECTED when abuse blocked and normal use ok', () => {
  const result = combineProtectionEvaluations(
    { blocked: true, feedback: 'Abuse blocked.' },
    { normalUseOk: true, feedback: 'Normal requests still work.' }
  );
  assert.equal(result.verdict, 'PROTECTED');
});

test('combineProtectionEvaluations returns RESTRICTIVE when abuse blocked but normal use not ok', () => {
  const result = combineProtectionEvaluations(
    { blocked: true, feedback: 'Abuse blocked.' },
    { normalUseOk: false, feedback: 'Technician requests would be refused.' }
  );
  assert.equal(result.verdict, 'RESTRICTIVE');
});

test('applyPromptTestResult denies exploit for RESTRICTIVE without hardening', () => {
  const state = {
    ...createInitialMorpState(),
    stage: 'orders' as const,
    orders: {
      ...createInitialMorpState().orders,
      ordersCreditGranted: true,
      ordersPromptHardened: false,
      ordersExploitBlocked: false
    }
  };

  const { state: next } = applyPromptTestResult(state, {
    verdict: 'RESTRICTIVE',
    feedback: 'Too strict for normal technician requests.'
  });

  assert.equal(next.orders.ordersPromptHardened, false);
  assert.equal(next.orders.ordersExploitBlocked, false);
  assert.equal(next.orders.ordersToolLedger.length, 1);
  assert.match(next.orders.ordersToolLedger[0], /denied/);
});

test('applyPromptTestResult hardens and blocks exploit for PROTECTED after credit granted', () => {
  const state = {
    ...createInitialMorpState(),
    stage: 'orders' as const,
    orders: {
      ...createInitialMorpState().orders,
      ordersCreditGranted: true,
      ordersPromptHardened: false,
      ordersExploitBlocked: false
    }
  };

  const { state: next } = applyPromptTestResult(state, {
    verdict: 'PROTECTED',
    feedback: 'Blocks abuse while allowing read-only requests.'
  });

  assert.equal(next.orders.ordersPromptHardened, true);
  assert.equal(next.orders.ordersExploitBlocked, true);
});
