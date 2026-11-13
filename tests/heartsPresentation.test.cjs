const assert = require('node:assert/strict');
const test = require('node:test');

const { buildHeartsPresentation } = require('../src/lessonExperience/heartsPresentation.cjs');

test('heart presentation reports a full five-heart balance without recovery copy', () => {
  assert.deepEqual(buildHeartsPresentation({ hearts: 5, maxHearts: 5 }), {
    accessibilityLabel: '5 of 5 hearts remaining',
    count: 5,
    countLabel: '5',
    maxHearts: 5,
    recoveryLabel: '',
    segments: [true, true, true, true, true],
  });
});

test('heart presentation clamps partial and empty balances and formats recovery time', () => {
  assert.deepEqual(buildHeartsPresentation({
    hearts: 3,
    maxHearts: 5,
    timeUntilNextHeartMs: 89_001,
  }), {
    accessibilityLabel: '3 of 5 hearts remaining. Next heart in 1:30',
    count: 3,
    countLabel: '3',
    maxHearts: 5,
    recoveryLabel: 'Next heart in 1:30',
    segments: [true, true, true, false, false],
  });
  assert.deepEqual(buildHeartsPresentation({
    hearts: -2,
    maxHearts: 5,
    timeUntilNextHeartMs: 1_000,
  }), {
    accessibilityLabel: '0 of 5 hearts remaining. Next heart in 0:01',
    count: 0,
    countLabel: '0',
    maxHearts: 5,
    recoveryLabel: 'Next heart in 0:01',
    segments: [false, false, false, false, false],
  });
});

test('heart presentation uses safe defaults for invalid values', () => {
  assert.deepEqual(buildHeartsPresentation({
    hearts: 'not-a-number',
    maxHearts: 0,
    timeUntilNextHeartMs: -1,
  }), {
    accessibilityLabel: '0 of 5 hearts remaining',
    count: 0,
    countLabel: '0',
    maxHearts: 5,
    recoveryLabel: '',
    segments: [false, false, false, false, false],
  });
  assert.equal(buildHeartsPresentation({ hearts: 99, maxHearts: 5 }).count, 5);
});
