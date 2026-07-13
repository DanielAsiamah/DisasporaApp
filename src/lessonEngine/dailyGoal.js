const MINUTE_MS = 60 * 1000;
const MAX_SESSION_MS = 60 * MINUTE_MS;

export function localDateKey(value = Date.now()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function safeGoalMinutes(goalMinutes) {
  return Math.min(Math.max(Number(goalMinutes) || 10, 1), 120);
}

function activityForDate(previous, dateKey) {
  if (previous?.dateKey === dateKey) {
    return {
      ...previous,
      activeMs: Math.max(Number(previous.activeMs) || 0, 0),
      lessonsCompleted: Math.max(Number(previous.lessonsCompleted) || 0, 0),
      xpEarned: Math.max(Number(previous.xpEarned) || 0, 0),
    };
  }
  return {
    dateKey,
    activeMs: 0,
    lessonsCompleted: 0,
    xpEarned: 0,
    goalCompletedAt: null,
    goalRewardClaimed: false,
  };
}

export function getDailyGoalSnapshot(previous, goalMinutes = 10, now = Date.now()) {
  const dateKey = localDateKey(now);
  const activity = activityForDate(previous, dateKey);
  const goalMs = safeGoalMinutes(goalMinutes) * MINUTE_MS;
  const progress = Math.min(activity.activeMs / goalMs, 1);
  return {
    activity,
    goalMinutes: safeGoalMinutes(goalMinutes),
    creditedMinutes: Math.floor(activity.activeMs / MINUTE_MS),
    progress,
    completed: activity.activeMs >= goalMs,
  };
}

export function recordDailyGoalSession(previous, session = {}, goalMinutes = 10) {
  const completedAt = session.completedAt || Date.now();
  const snapshot = getDailyGoalSnapshot(previous, goalMinutes, completedAt);
  const rawDuration = Math.max(Number(session.durationMs) || 0, 0);
  const creditedDuration = Math.min(Math.max(rawDuration, MINUTE_MS), MAX_SESSION_MS);
  const wasCompleted = snapshot.completed || Boolean(snapshot.activity.goalCompletedAt);
  const activeMs = snapshot.activity.activeMs + creditedDuration;
  const goalMs = snapshot.goalMinutes * MINUTE_MS;
  const completed = activeMs >= goalMs;
  const justCompleted = completed && !wasCompleted;
  const rewardGems = justCompleted && !snapshot.activity.goalRewardClaimed ? 10 : 0;
  const activity = {
    ...snapshot.activity,
    activeMs,
    lessonsCompleted: snapshot.activity.lessonsCompleted + 1,
    xpEarned: snapshot.activity.xpEarned + Math.max(Number(session.xpEarned) || 0, 0),
    goalCompletedAt: justCompleted ? completedAt : snapshot.activity.goalCompletedAt,
    goalRewardClaimed: snapshot.activity.goalRewardClaimed || rewardGems > 0,
    updatedAt: completedAt,
  };

  return {
    activity,
    goalMinutes: snapshot.goalMinutes,
    creditedMinutes: Math.floor(activeMs / MINUTE_MS),
    progress: Math.min(activeMs / goalMs, 1),
    completed,
    justCompleted,
    rewardGems,
  };
}
