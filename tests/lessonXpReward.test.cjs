const test = require('node:test');
const assert = require('node:assert/strict');

const {
  CORRECT_ANSWER_XP,
  applyLoadedProfileWithoutXpRegression,
  buildCorrectAnswerRewardId,
  buildCorrectAnswerRewardRecord,
  isRetryableXpAwardError,
  mergePersistedXpIntoProfile,
  planCorrectAnswerXpMutation,
  runAuthBoundXpAward,
} = require('../src/lessonEngine/lessonXpReward.cjs');

test('correct-answer rewards are always exactly ten XP', () => {
  assert.equal(CORRECT_ANSWER_XP, 10);
  assert.equal(
    buildCorrectAnswerRewardRecord({
      attemptId: 'attempt-1',
      courseId: 'jamaican-patois',
      exerciseId: 'exercise-1',
      topicId: 'getting-started',
    }).amount,
    10
  );
});

test('a lesson attempt and exercise produce one stable Firestore-safe reward ID', () => {
  const first = buildCorrectAnswerRewardId({
    attemptId: '7f6a244e-255d-43b4-b969-2352ab0672e0',
    exerciseId: 'jamaican-patois-getting-started-01-yes',
  });
  const repeated = buildCorrectAnswerRewardId({
    attemptId: '7f6a244e-255d-43b4-b969-2352ab0672e0',
    exerciseId: 'jamaican-patois-getting-started-01-yes',
  });
  const nextExercise = buildCorrectAnswerRewardId({
    attemptId: '7f6a244e-255d-43b4-b969-2352ab0672e0',
    exerciseId: 'jamaican-patois-getting-started-02-no',
  });

  assert.equal(first, repeated);
  assert.notEqual(first, nextExercise);
  assert.doesNotMatch(first, /\//);
});

test('unsafe or missing reward identity is rejected before touching Firestore', () => {
  assert.throws(
    () => buildCorrectAnswerRewardId({ attemptId: 'attempt/one', exerciseId: 'exercise-1' }),
    /safe letters/
  );
  assert.throws(
    () => buildCorrectAnswerRewardId({ attemptId: 'attempt-1', exerciseId: '' }),
    /exerciseId/
  );
});

test('reward records retain traceable lesson identity without accepting an amount', () => {
  const record = buildCorrectAnswerRewardRecord({
    attemptId: 'attempt-1',
    conceptId: 'yes',
    courseId: 'jamaican-patois',
    exerciseId: 'exercise-1',
    topicId: 'getting-started',
  });

  assert.deepEqual(record, {
    amount: 10,
    attemptId: 'attempt-1',
    conceptId: 'yes',
    courseId: 'jamaican-patois',
    exerciseId: 'exercise-1',
    source: 'lesson-correct-answer',
    topicId: 'getting-started',
  });
});

test('late XP responses can never move the local profile backwards', () => {
  assert.deepEqual(
    mergePersistedXpIntoProfile({ preferredName: 'Daniel', xp: 20 }, 30),
    { preferredName: 'Daniel', xp: 30 }
  );
  assert.deepEqual(
    mergePersistedXpIntoProfile({ preferredName: 'Daniel', xp: 30 }, 20),
    { preferredName: 'Daniel', xp: 30 }
  );
  assert.equal(mergePersistedXpIntoProfile(null, 10), null);
});

test('the transaction plan increments a new reward and leaves a duplicate unchanged', () => {
  assert.deepEqual(
    planCorrectAnswerXpMutation({ currentXp: 20, rewardExists: false }),
    { awarded: true, xp: 30 }
  );
  assert.deepEqual(
    planCorrectAnswerXpMutation({ currentXp: 30, rewardExists: true }),
    { awarded: false, xp: 30 }
  );
});

test('an auth change prevents a late reward response from entering the next account', async () => {
  let currentUserId = 'learner-a';
  let profile = { id: 'learner-b', preferredName: 'B', xp: 40 };
  let resolveAward;
  const award = new Promise((resolve) => { resolveAward = resolve; });

  const request = runAuthBoundXpAward({
    award: () => award,
    getCurrentUserId: () => currentUserId,
    rewardFields: { exerciseId: 'exercise-1' },
    setProfile: (updater) => { profile = updater(profile); },
    userId: 'learner-a',
  });
  currentUserId = 'learner-b';
  resolveAward({ awarded: true, xp: 10 });

  assert.deepEqual(await request, { awarded: true, currentAccount: false, xp: 10 });
  assert.deepEqual(profile, { id: 'learner-b', preferredName: 'B', xp: 40 });
});

test('out-of-order successful rewards always leave local XP at the highest persisted value', async () => {
  let currentUserId = 'learner-a';
  let profile = { id: 'learner-a', xp: 0 };
  const pending = new Map();
  const award = (_userId, rewardFields) => new Promise((resolve) => {
    pending.set(rewardFields.exerciseId, resolve);
  });
  const setProfile = (updater) => { profile = updater(profile); };

  const first = runAuthBoundXpAward({
    award,
    getCurrentUserId: () => currentUserId,
    rewardFields: { exerciseId: 'first' },
    setProfile,
    userId: 'learner-a',
  });
  const second = runAuthBoundXpAward({
    award,
    getCurrentUserId: () => currentUserId,
    rewardFields: { exerciseId: 'second' },
    setProfile,
    userId: 'learner-a',
  });

  pending.get('second')({ awarded: true, xp: 10 });
  await second;
  pending.get('first')({ awarded: true, xp: 20 });
  await first;
  assert.equal(profile.xp, 20);

  currentUserId = 'learner-b';
});

test('a stale profile load cannot lower XP for the same account', () => {
  assert.deepEqual(
    applyLoadedProfileWithoutXpRegression(
      { id: 'learner-a', preferredName: 'Old', xp: 30 },
      { id: 'learner-a', preferredName: 'Fresh', xp: 20 }
    ),
    { id: 'learner-a', preferredName: 'Fresh', xp: 30 }
  );
  assert.deepEqual(
    applyLoadedProfileWithoutXpRegression(
      { id: 'learner-a', xp: 30 },
      { id: 'learner-b', xp: 5 }
    ),
    { id: 'learner-b', xp: 5 }
  );
});

test('only transient Firestore failures ask the learner to retry XP', () => {
  assert.equal(isRetryableXpAwardError({ code: 'firestore/unavailable' }), true);
  assert.equal(isRetryableXpAwardError({ code: 'aborted' }), true);
  assert.equal(isRetryableXpAwardError({ code: 'permission-denied' }), false);
  assert.equal(isRetryableXpAwardError({ code: 'profile-not-ready' }), false);
  assert.equal(isRetryableXpAwardError(new Error('Profile missing')), false);
});
