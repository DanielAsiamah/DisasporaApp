const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  mergePersistedStreakIntoProfile,
  runAuthBoundStreakUpdate,
} = require('../src/lessonEngine/streaks.cjs');

const root = path.join(__dirname, '..');
const authSource = fs.readFileSync(path.join(root, 'src/context/AuthContext.js'), 'utf8');
const serviceSource = fs.readFileSync(
  path.join(root, 'src/services/firestore/userService.js'),
  'utf8'
);

test('Firestore records daily learning atomically on the learner profile', () => {
  const block = serviceSource.slice(
    serviceSource.indexOf('export async function recordDailyLearningCompletion'),
    serviceSource.indexOf('export async function touchUserLastActive')
  );

  assert.match(serviceSource, /calculateStreakAfterCompletion/);
  assert.match(block, /runTransaction\(firebaseDb/);
  assert.match(block, /transaction\.get\(userRef\)/);
  assert.match(block, /Timestamp\.now\(\)/);
  assert.match(block, /lastLessonCompletedAt/);
  assert.match(block, /calculateStreakAfterCompletion/);
  assert.match(block, /transaction\.update\(userRef/);
  assert.match(block, /lastActiveAt: serverTimestamp\(\)/);
  assert.match(block, /lastLessonCompletedAt: completedAt/);
  assert.match(block, /streak: streakResult\.streak/);
});

test('new profiles initialize the lesson-completion timestamp explicitly', () => {
  assert.match(serviceSource, /lastLessonCompletedAt: null/);
});

test('persisted streak results reconcile into the current profile', () => {
  const completedAt = new Date('2026-11-05T12:00:00.000Z');
  assert.deepEqual(
    mergePersistedStreakIntoProfile(
      { id: 'learner-a', streak: 2, xp: 40 },
      { completedAt, streak: 3 }
    ),
    { id: 'learner-a', streak: 3, xp: 40, lastLessonCompletedAt: completedAt }
  );
  assert.equal(mergePersistedStreakIntoProfile(null, { streak: 3 }), null);
});

test('auth-bound streak persistence ignores a result after the account changes', async () => {
  let currentUserId = 'learner-a';
  let updater = null;
  const pending = runAuthBoundStreakUpdate({
    getCurrentUserId: () => currentUserId,
    record: async () => {
      await Promise.resolve();
      return { completedAt: 1234, streak: 4, status: 'extended' };
    },
    setProfile: (nextUpdater) => { updater = nextUpdater; },
    userId: 'learner-a',
  });

  currentUserId = 'learner-b';
  const result = await pending;

  assert.equal(result.currentAccount, false);
  assert.equal(updater, null);
});

test('AuthContext exposes an account-bound daily learning operation', () => {
  const block = authSource.slice(
    authSource.indexOf('const recordDailyLearning = useCallback'),
    authSource.indexOf('const value = useMemo')
  );

  assert.match(authSource, /recordDailyLearningCompletion/);
  assert.match(block, /runAuthBoundStreakUpdate/);
  assert.match(block, /getCurrentUserId: \(\) => authenticatedUserRef\.current\?\.uid \|\| null/);
  assert.match(authSource, /recordDailyLearning,/);
});
