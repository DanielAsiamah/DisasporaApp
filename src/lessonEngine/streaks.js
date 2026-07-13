const DAY_MS = 24 * 60 * 60 * 1000;

function localDayNumber(value) {
  if (value == null || value === '') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);
}

export function calculateStreakAfterCompletion(currentStreak = 0, lastCompletedAt, completedAt = Date.now()) {
  const safeCurrent = Math.max(Number(currentStreak) || 0, 0);
  const currentDay = localDayNumber(completedAt);
  const previousDay = localDayNumber(lastCompletedAt);

  if (currentDay == null) {
    return { streak: safeCurrent, status: 'unchanged' };
  }

  if (previousDay == null) {
    return {
      streak: Math.max(safeCurrent, 1),
      status: safeCurrent > 0 ? 'preserved' : 'started',
    };
  }

  const dayGap = currentDay - previousDay;
  if (dayGap <= 0) return { streak: Math.max(safeCurrent, 1), status: 'same-day' };
  if (dayGap === 1) return { streak: Math.max(safeCurrent, 0) + 1, status: 'extended' };
  return { streak: 1, status: 'restarted' };
}
