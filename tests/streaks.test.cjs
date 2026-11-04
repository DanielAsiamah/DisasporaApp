const assert = require('node:assert/strict');
const test = require('node:test');

const {
  calculateStreakAfterCompletion,
  toStreakMillis,
} = require('../src/lessonEngine/streaks.cjs');

test('streak timestamp normalization accepts app and Firestore date values', () => {
  const instant = new Date(2026, 10, 4, 12, 30);
  const milliseconds = instant.getTime();

  assert.equal(toStreakMillis(instant), milliseconds);
  assert.equal(toStreakMillis(milliseconds), milliseconds);
  assert.equal(toStreakMillis(instant.toISOString()), milliseconds);
  assert.equal(toStreakMillis({ toMillis: () => milliseconds }), milliseconds);
  assert.equal(toStreakMillis({ seconds: Math.floor(milliseconds / 1000), nanoseconds: 0 }), Math.floor(milliseconds / 1000) * 1000);
  assert.equal(toStreakMillis('not-a-date'), null);
  assert.equal(toStreakMillis({ toMillis: () => Number.NaN }), null);
});

test('the first valid lesson completion starts or safely preserves a streak', () => {
  const completedAt = new Date(2026, 10, 4, 9, 0);

  assert.deepEqual(calculateStreakAfterCompletion(0, null, completedAt), {
    streak: 1,
    status: 'started',
  });
  assert.deepEqual(calculateStreakAfterCompletion(4, 'invalid', completedAt), {
    streak: 4,
    status: 'preserved',
  });
  assert.deepEqual(calculateStreakAfterCompletion(4, null, 'invalid'), {
    streak: 4,
    status: 'unchanged',
  });
});

test('same-day lessons are idempotent and the next local day extends once', () => {
  const morning = new Date(2026, 10, 4, 0, 1);
  const evening = new Date(2026, 10, 4, 23, 59);
  const tomorrow = new Date(2026, 10, 5, 0, 1);

  assert.deepEqual(calculateStreakAfterCompletion(3, morning, evening), {
    freezeUsed: false,
    streak: 3,
    status: 'same-day',
  });
  assert.deepEqual(calculateStreakAfterCompletion(3, evening, tomorrow), {
    freezeUsed: false,
    streak: 4,
    status: 'extended',
  });
});

test('missed local days restart while a configured freeze preserves one missed day', () => {
  const previous = new Date(2026, 10, 2, 12, 0);
  const completedAt = new Date(2026, 10, 4, 12, 0);

  assert.deepEqual(calculateStreakAfterCompletion(8, previous, completedAt), {
    streak: 1,
    status: 'restarted',
  });
  assert.deepEqual(calculateStreakAfterCompletion(8, previous, completedAt, { hasStreakFreeze: true }), {
    freezeUsed: true,
    streak: 9,
    status: 'frozen',
  });
});

test('local calendar days extend across daylight-saving clock changes', () => {
  const beforeSpringChange = new Date(2026, 2, 29, 0, 30);
  const afterSpringChange = new Date(2026, 2, 30, 0, 30);
  const firestoreTimestamp = { toMillis: () => beforeSpringChange.getTime() };

  assert.deepEqual(calculateStreakAfterCompletion(5, firestoreTimestamp, afterSpringChange), {
    freezeUsed: false,
    streak: 6,
    status: 'extended',
  });
});

