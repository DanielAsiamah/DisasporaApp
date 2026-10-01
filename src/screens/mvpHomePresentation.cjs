function normalizeCount(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return 0;
  return Math.floor(number);
}

function getStreakPresentation(value) {
  const streak = normalizeCount(value);
  if (streak === 0) {
    return {
      subtitle: 'Do a lesson to start your day.',
      title: 'Start your streak!',
    };
  }

  return {
    subtitle: 'Do a lesson today to keep it going.',
    title: `Keep your ${streak}-day streak!`,
  };
}

function getLearningProgressPresentation({ ready, completed, total } = {}) {
  const totalCount = normalizeCount(total);
  const count = Math.min(normalizeCount(completed), totalCount);
  if (!ready) return {
    title: 'Loading your progress', subtitle: 'Getting your learning path ready.',
    countLabel: '...', accessibilityLabel: 'Topic progress loading',
  };
  const progress = { countLabel: String(count), accessibilityLabel: `${count} of ${totalCount} topics complete` };
  if (!totalCount) return { ...progress, title: 'Your learning path', subtitle: 'More conversations are being prepared.' };
  if (count === totalCount) return { ...progress, title: 'Look how far you have come', subtitle: 'Chapter complete. Revisit a topic to keep your phrases fresh.' };
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
