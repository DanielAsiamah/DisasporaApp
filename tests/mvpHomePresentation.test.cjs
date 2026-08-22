const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getStreakPresentation,
  orderPodiumEntries,
} = require('../src/screens/mvpHomePresentation.cjs');

test('the streak banner reflects zero, one, and multi-day saved streaks', () => {
  assert.deepEqual(getStreakPresentation(0), {
    subtitle: 'Do a lesson to start your day.',
    title: 'Start your streak!',
  });
  assert.deepEqual(getStreakPresentation(1), {
    subtitle: 'Do a lesson today to keep it going.',
    title: 'Keep your 1-day streak!',
  });
  assert.deepEqual(getStreakPresentation(7), {
    subtitle: 'Do a lesson today to keep it going.',
    title: 'Keep your 7-day streak!',
  });
  assert.deepEqual(getStreakPresentation('not-a-number'), getStreakPresentation(0));
});

test('the champion occupies the center podium position without mutating rank order data', () => {
  const rows = [
    { id: 'first', rank: 1 },
    { id: 'second', rank: 2 },
    { id: 'third', rank: 3 },
  ];

  assert.deepEqual(orderPodiumEntries(rows).map((entry) => entry.rank), [2, 1, 3]);
  assert.deepEqual(rows.map((entry) => entry.rank), [1, 2, 3]);
  assert.deepEqual(orderPodiumEntries(rows.slice(0, 2)).map((entry) => entry.rank), [1, 2]);
});
