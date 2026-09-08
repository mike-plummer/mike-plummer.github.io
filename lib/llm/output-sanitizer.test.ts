import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createThinkingBlockStreamFilter,
  normalizeModelOutput,
  stripThinkingBlocks
} from './output-sanitizer';

const THINKING_OPEN = `<${'redacted_thinking'}>`;
const THINKING_CLOSE = `</${'redacted_thinking'}>`;
const ASYMMETRIC_CLOSE = `</${'thinking'}>`;

test('stripThinkingBlocks removes empty redacted thinking blocks', () => {
  const input = `${THINKING_OPEN}   ${THINKING_CLOSE}\n\nHello technician.`;
  assert.equal(stripThinkingBlocks(input), '\n\nHello technician.');
});

test('stripThinkingBlocks removes asymmetric thinking blocks', () => {
  const input = `${THINKING_OPEN}\n\n${ASYMMETRIC_CLOSE}\n\nPhotosynthesis is the process`;
  assert.equal(normalizeModelOutput(input), 'Photosynthesis is the process');
});

test('createThinkingBlockStreamFilter holds open block across chunks', () => {
  const filter = createThinkingBlockStreamFilter();
  assert.equal(filter.push(`${THINKING_OPEN}\n\n`), '');
  assert.equal(filter.push(`${THINKING_CLOSE}\n\nPhotosynthesis is t`), 'Photosynthesis is t');
  assert.equal(filter.flush(), '');
});

test('createThinkingBlockStreamFilter holds split tags until complete', () => {
  const filter = createThinkingBlockStreamFilter();
  assert.equal(filter.push(THINKING_OPEN.slice(0, 14)), '');
  assert.equal(filter.push(`${THINKING_OPEN.slice(14)}\n\n${THINKING_CLOSE}\n\nHi`), 'Hi');
  assert.equal(filter.flush(), '');
});

test('createThinkingBlockStreamFilter streams token by token', () => {
  const filter = createThinkingBlockStreamFilter();
  const text = `${THINKING_OPEN}\n\n${THINKING_CLOSE}\n\nPhotosynthesis is t`;
  let visible = '';

  for (const char of text) {
    visible += filter.push(char);
  }

  assert.equal(visible, 'Photosynthesis is t');
  assert.equal(filter.flush(), '');
});
