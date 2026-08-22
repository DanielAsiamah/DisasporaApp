const CORRECT_ANSWER_XP = 10;
const SAFE_ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const RETRYABLE_XP_ERROR_CODES = new Set([
  'aborted',
  'cancelled',
  'deadline-exceeded',
  'internal',
  'network-request-failed',
  'resource-exhausted',
  'unavailable',
  'unknown',
]);

function normalizeXp(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return Math.floor(numeric);
}

function requireSafeId(value, name) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${name} is required.`);
  }
  const normalized = value.trim();
  if (!SAFE_ID_PATTERN.test(normalized) || normalized.length > 256) {
    throw new Error(`${name} must contain only safe letters, numbers, underscores, or hyphens.`);
  }
  return normalized;
}

function buildCorrectAnswerRewardId({ attemptId, exerciseId } = {}) {
  const safeAttemptId = requireSafeId(attemptId, 'attemptId');
  const safeExerciseId = requireSafeId(exerciseId, 'exerciseId');
  return `${safeAttemptId}__${safeExerciseId}`;
}

function buildCorrectAnswerRewardRecord({
  attemptId,
  conceptId,
  courseId,
  exerciseId,
  topicId,
} = {}) {
  return {
    amount: CORRECT_ANSWER_XP,
    attemptId: requireSafeId(attemptId, 'attemptId'),
    ...(conceptId ? { conceptId: requireSafeId(conceptId, 'conceptId') } : {}),
    courseId: requireSafeId(courseId, 'courseId'),
    exerciseId: requireSafeId(exerciseId, 'exerciseId'),
    source: 'lesson-correct-answer',
    topicId: requireSafeId(topicId, 'topicId'),
  };
}

function mergePersistedXpIntoProfile(profile, persistedXp) {
  if (!profile) return profile;
  return {
    ...profile,
    xp: Math.max(normalizeXp(profile.xp), normalizeXp(persistedXp)),
  };
}

function getProfileIdentity(profile) {
  return profile?.id || profile?.uid || null;
}

function applyLoadedProfileWithoutXpRegression(currentProfile, loadedProfile) {
  if (!loadedProfile) return loadedProfile;
  const currentIdentity = getProfileIdentity(currentProfile);
  const loadedIdentity = getProfileIdentity(loadedProfile);
  if (!currentIdentity || currentIdentity !== loadedIdentity) return loadedProfile;

  return {
    ...loadedProfile,
    xp: Math.max(normalizeXp(currentProfile.xp), normalizeXp(loadedProfile.xp)),
  };
}

function normalizeErrorCode(error) {
  if (typeof error?.code !== 'string') return '';
  return error.code.trim().toLowerCase().split('/').pop();
}

function isRetryableXpAwardError(error) {
  return RETRYABLE_XP_ERROR_CODES.has(normalizeErrorCode(error));
}

async function runAuthBoundXpAward({
  award,
  getCurrentUserId,
  rewardFields,
  setProfile,
  userId,
} = {}) {
  if (typeof award !== 'function') throw new Error('An XP award operation is required.');
  if (typeof getCurrentUserId !== 'function') throw new Error('An auth identity reader is required.');
  if (typeof setProfile !== 'function') throw new Error('A profile updater is required.');

  const result = await award(userId, rewardFields);
  const currentAccount = getCurrentUserId() === userId;
  if (currentAccount) {
    setProfile((current) => mergePersistedXpIntoProfile(current, result?.xp));
  }
  return { ...result, currentAccount };
}

function planCorrectAnswerXpMutation({ currentXp, rewardExists } = {}) {
  const normalizedCurrentXp = normalizeXp(currentXp);
  return {
    awarded: rewardExists !== true,
    xp: rewardExists === true
      ? normalizedCurrentXp
      : normalizedCurrentXp + CORRECT_ANSWER_XP,
  };
}

module.exports = {
  CORRECT_ANSWER_XP,
  applyLoadedProfileWithoutXpRegression,
  buildCorrectAnswerRewardId,
  buildCorrectAnswerRewardRecord,
  isRetryableXpAwardError,
  mergePersistedXpIntoProfile,
  normalizeXp,
  planCorrectAnswerXpMutation,
  runAuthBoundXpAward,
};
