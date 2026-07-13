const assert = require('node:assert/strict');
const test = require('node:test');

let audioAvailability = {};
try {
  audioAvailability = require('../src/lessonEngine/lessonAudioAvailability');
} catch (error) {
  if (error.code !== 'MODULE_NOT_FOUND') throw error;
}

const steps = [
  { id: 'meaning', type: 'multiple_choice', audioKey: 'hello.mp3' },
  { id: 'listen', type: 'audio_listen', audioKey: 'hello.mp3' },
  { id: 'type', type: 'type_answer', audioKey: 'hello.mp3' },
];

test('removes listening questions when their audio asset is unavailable', () => {
  assert.equal(typeof audioAvailability.withPlayableListeningSteps, 'function');
  const result = audioAvailability.withPlayableListeningSteps(steps, () => false);
  assert.deepEqual(result.map((step) => step.id), ['meaning', 'type']);
});

test('keeps listening questions when their audio asset is playable', () => {
  assert.equal(typeof audioAvailability.withPlayableListeningSteps, 'function');
  const result = audioAvailability.withPlayableListeningSteps(steps, (audioKey) => audioKey === 'hello.mp3');
  assert.deepEqual(result.map((step) => step.id), ['meaning', 'listen', 'type']);
});

test('does not mutate the generated lesson step array', () => {
  assert.equal(typeof audioAvailability.withPlayableListeningSteps, 'function');
  const result = audioAvailability.withPlayableListeningSteps(steps, () => false);
  assert.notEqual(result, steps);
  assert.equal(steps.length, 3);
});
