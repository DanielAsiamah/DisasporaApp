'use strict';

const DAY_MS = 24 * 60 * 60 * 1000;

function toStreakMillis(value) {
  if (value == null || value === '') return null;
  try {
    if (typeof value?.toMillis === 'function') {
      const milliseconds = Number(value.toMillis());
      return Number.isFinite(milliseconds) ? milliseconds : null;
    }
  } catch {
    return null;
  }
  if (typeof value?.seconds === 'number') {
    const milliseconds = (value.seconds * 1000) + (Number(value.nanoseconds) || 0) / 1e6;
    return Number.isFinite(milliseconds) ? milliseconds : null;
  }
  if (value instanceof Date) {
    const milliseconds = value.getTime();
    return Number.isFinite(milliseconds) ? milliseconds : null;
  }
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const milliseconds = new Date(value).getTime();
    return Number.isFinite(milliseconds) ? milliseconds : null;
  }
  return null;
}

function localDayNumber(value) {
  const milliseconds = toStreakMillis(value);
  if (milliseconds == null) return null;
  const date = new Date(milliseconds);
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);
}

function calculateStreakAfterCompletion(
  currentStreak = 0,
  lastCompletedAt,
  completedAt = Date.now(),
  { hasStreakFreeze = false } = {}
) {
  const safeCurrent = Math.max(Math.floor(Number(currentStreak) || 0), 0);
  const currentDay = localDayNumber(completedAt);
  const previousDay = localDayNumber(lastCompletedAt);

  if (currentDay == null) return { streak: safeCurrent, status: 'unchanged' };
  if (previousDay == null) return {
    streak: Math.max(safeCurrent, 1),
    status: safeCurrent > 0 ? 'preserved' : 'started',
  };

  const dayGap = currentDay - previousDay;
  if (dayGap <= 0) return { freezeUsed: false, streak: Math.max(safeCurrent, 1), status: 'same-day' };
  if (dayGap === 1) return { freezeUsed: false, streak: safeCurrent + 1, status: 'extended' };
  if (dayGap === 2 && hasStreakFreeze) return {
    freezeUsed: true,
    streak: safeCurrent + 1,
    status: 'frozen',
  };
  return { streak: 1, status: 'restarted' };
}

function mergePersistedStreakIntoProfile(profile, result) {
  if (!profile) return profile;
  return {
    ...profile,
    streak: Math.max(Math.floor(Number(result?.streak) || 0), 0),
    lastLessonCompletedAt: result?.completedAt ?? profile.lastLessonCompletedAt ?? null,
  };
}

async function runAuthBoundStreakUpdate({
  getCurrentUserId,
  record,
  setProfile,
  userId,
} = {}) {
  if (typeof record !== 'function') throw new Error('A daily learning operation is required.');
  if (typeof getCurrentUserId !== 'function') throw new Error('An auth identity reader is required.');
  if (typeof setProfile !== 'function') throw new Error('A profile updater is required.');

  const result = await record(userId);
  const currentAccount = getCurrentUserId() === userId;
  if (currentAccount) {
    setProfile((current) => mergePersistedStreakIntoProfile(current, result));
  }
  return { ...result, currentAccount };
}

module.exports = {
  calculateStreakAfterCompletion,
  mergePersistedStreakIntoProfile,
  runAuthBoundStreakUpdate,
  toStreakMillis,
};
