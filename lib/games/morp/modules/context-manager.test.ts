import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SIMULATED_CONTEXT_LIMIT } from '../config';
import type { ContextMessage } from '../types';
import {
  applyContextSummary,
  computeContextBufferTokens,
  estimateSummarizeTargetReduction,
  estimateTokens,
  getSummarizeBatch
} from './context-manager';

function message(
  id: string,
  role: 'user' | 'assistant',
  content: string,
  tokens?: number
): ContextMessage {
  return { id, role, content, tokens: tokens ?? estimateTokens(content) };
}

test('getSummarizeBatch returns null when history is too short', () => {
  const messages = [message('u1', 'user', 'hello'), message('a1', 'assistant', 'hi')];
  assert.equal(getSummarizeBatch(messages), null);
});

test('getSummarizeBatch grows with overflow pressure', () => {
  const lightOverflow = [
    message('u1', 'user', 'short'),
    message('a1', 'assistant', 'reply'),
    message('u2', 'user', 'another'),
    message('a2', 'assistant', 'ok')
  ];
  const lightBatch = getSummarizeBatch(lightOverflow);
  assert.ok(lightBatch);
  assert.equal(lightBatch.length, 2);

  const heavyOverflow = [
    message('u1', 'user', 'older turn', 100),
    message('a1', 'assistant', 'older reply', 100),
    message('u2', 'user', 'middle turn', 100),
    message('a2', 'assistant', 'middle reply', 100),
    message('u3', 'user', 'more history', 100),
    message('a3', 'assistant', 'more reply', 100),
    message('u4', 'user', 'recent question', 40),
    message('a4', 'assistant', 'recent answer', 40)
  ];
  assert.ok(computeContextBufferTokens(heavyOverflow) > SIMULATED_CONTEXT_LIMIT);

  const heavyBatch = getSummarizeBatch(heavyOverflow);
  assert.ok(heavyBatch);
  assert.ok(heavyBatch.length > lightBatch.length);
  assert.ok(heavyBatch.length <= heavyOverflow.length - 2);
});

test('getSummarizeBatch completes a trailing user turn', () => {
  const messages = [
    message('u1', 'user', 'first'),
    message('a1', 'assistant', 'first reply'),
    message('u2', 'user', 'second question with enough text to force a split after this turn'),
    message('a2', 'assistant', 'second reply'),
    message('u3', 'user', 'recent'),
    message('a3', 'assistant', 'recent reply')
  ];

  const batch = getSummarizeBatch(messages);
  assert.ok(batch);
  const lastInBatch = batch[batch.length - 1];
  assert.notEqual(lastInBatch.role, 'user');
});

test('applyContextSummary replaces the selected batch with one summary message', () => {
  const messages = [
    message('u1', 'user', 'TECH-07 logged in'),
    message('a1', 'assistant', 'Acknowledged'),
    message('u2', 'user', 'Run diagnostics'),
    message('a2', 'assistant', 'Diagnostics complete'),
    message('u3', 'user', 'recent'),
    message('a3', 'assistant', 'recent reply')
  ];
  const batch = getSummarizeBatch(messages);
  assert.ok(batch);

  const summarized = applyContextSummary(messages, 'Earlier login and diagnostics.', batch.map((entry) => entry.id));
  const active = summarized.filter((entry) => !entry.removed);

  assert.equal(active.length, messages.length - batch.length + 1);
  assert.equal(active[0]?.summary, true);
  assert.match(active[0]?.content ?? '', /Earlier login and diagnostics/);
});

test('estimateSummarizeTargetReduction adds headroom when overflowing', () => {
  const overflow = SIMULATED_CONTEXT_LIMIT + 30;
  assert.equal(estimateSummarizeTargetReduction(overflow), 30 + 48);
});
