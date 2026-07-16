const test = require('node:test');
const assert = require('node:assert/strict');

const { createLessonAudioEventGate } = require('../src/audio/lessonAudioEventGate.cjs');

test('an answer may produce audio only once until that answer is explicitly retried', () => {
  const gate = createLessonAudioEventGate();
  assert.equal(gate.claim('answer', 'session-1:step-1'), true);
  assert.equal(gate.claim('answer', 'session-1:step-1'), false);
  gate.release('answer', 'session-1:step-1');
  assert.equal(gate.claim('answer', 'session-1:step-1'), true);
});

test('each matching pair may produce audio once while different pairs remain independent', () => {
  const gate = createLessonAudioEventGate();
  assert.equal(gate.claim('match', 'session-1:step-1:yes'), true);
  assert.equal(gate.claim('match', 'session-1:step-1:yes'), false);
  assert.equal(gate.claim('match', 'session-1:step-1:no'), true);
});

test('listening autoplay runs once per session and step', () => {
  const gate = createLessonAudioEventGate();
  assert.equal(gate.claim('autoplay', 'session-1:step-1'), true);
  assert.equal(gate.claim('autoplay', 'session-1:step-1'), false);
  assert.equal(gate.claim('autoplay', 'session-2:step-1'), true);
  assert.equal(gate.claim('autoplay', 'session-2:step-2'), true);
});

test('clearing a lesson session releases all once-only tokens', () => {
  const gate = createLessonAudioEventGate();
  gate.claim('answer', 'session-1:step-1');
  gate.claim('match', 'session-1:step-1:yes');
  gate.claim('autoplay', 'session-1:step-1');
  gate.clear();
  assert.equal(gate.claim('answer', 'session-1:step-1'), true);
  assert.equal(gate.claim('match', 'session-1:step-1:yes'), true);
  assert.equal(gate.claim('autoplay', 'session-1:step-1'), true);
});
