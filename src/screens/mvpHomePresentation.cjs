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

function orderPodiumEntries(rows = []) {
  const firstThree = Array.isArray(rows) ? rows.slice(0, 3) : [];
  if (firstThree.length < 3) return firstThree;
  return [firstThree[1], firstThree[0], firstThree[2]];
}

module.exports = {
  getStreakPresentation,
  orderPodiumEntries,
};
