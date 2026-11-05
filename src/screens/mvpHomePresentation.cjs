function normalizeCount(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return 0;
  return Math.floor(number);
}

function normalizeDailyGoal(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 5;
  return Math.min(Math.max(Math.floor(number), 1), 60);
}

function getStreakPresentation({ streak: value, dailyGoalMinutes } = {}) {
  const streak = normalizeCount(value);
  const goal = normalizeDailyGoal(dailyGoalMinutes);
  const goalUnit = goal === 1 ? 'minute' : 'minutes';
  if (streak === 0) {
    return {
      accessibilityLabel: `No daily streak yet. Daily learning goal ${goal} ${goalUnit}.`,
      countLabel: '0',
      dailyGoalMinutes: goal,
      subtitle: `Complete a lesson toward your ${goal}-${goalUnit.replace(/s$/, '')} goal.`,
      title: 'Start your streak!',
    };
  }

  return {
    accessibilityLabel: `${streak} day streak. Daily learning goal ${goal} ${goalUnit}.`,
    countLabel: String(streak),
    dailyGoalMinutes: goal,
    subtitle: `Learn for ${goal} ${goalUnit} today to keep it going.`,
    title: `Keep your ${streak}-day streak!`,
  };
}

function getLearningProgressPresentation({ ready, completed, total, hasMorePlannedLessons = false } = {}) {
  const totalCount = normalizeCount(total);
  const count = Math.min(normalizeCount(completed), totalCount);
  if (!ready) return {
    title: 'Loading your progress', subtitle: 'Getting your learning path ready.',
    countLabel: '...', accessibilityLabel: 'Topic progress loading',
  };
  const progress = { countLabel: String(count), accessibilityLabel: `${count} of ${totalCount} topics complete` };
  if (!totalCount) return { ...progress, title: 'Your learning path', subtitle: 'More conversations are being prepared.' };
  if (count === totalCount) return { ...progress, title: 'Look how far you have come', subtitle: hasMorePlannedLessons
    ? 'You completed the available draft lessons. More lessons are being prepared.'
    : 'Chapter complete. Revisit a topic to keep your phrases fresh.' };
  return {
    ...progress,
    title: count ? 'Keep the conversation going' : 'Your first conversation starts here',
    subtitle: count ? `${count} of ${totalCount} topics complete. Keep building your conversation skills.` : 'Start a lesson and build phrases you can use.',
  };
}

function orderPodiumEntries(rows = []) {
  const firstThree = Array.isArray(rows) ? rows.slice(0, 3) : [];
  if (firstThree.length < 3) return firstThree;
  return [firstThree[1], firstThree[0], firstThree[2]];
}

module.exports = {
  getLearningProgressPresentation,
  getStreakPresentation,
  orderPodiumEntries,
};
