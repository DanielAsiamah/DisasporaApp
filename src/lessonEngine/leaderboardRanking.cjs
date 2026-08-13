const CURRENT_USER_ID = 'current-user';

const PRACTICE_LEAGUE_FIXTURES = Object.freeze([
  Object.freeze({ id: 'aisha', name: 'Aisha', xp: 1250, guide: 'Amara' }),
  Object.freeze({ id: 'kwame', name: 'Kwame', xp: 1050, guide: 'Kai' }),
  Object.freeze({ id: 'maya', name: 'Maya', xp: 950, guide: 'Sol' }),
  Object.freeze({ id: 'dina', name: 'Dina', xp: 800, guide: 'Amara' }),
  Object.freeze({ id: 'malik', name: 'Malik', xp: 650, guide: 'Kai' }),
  Object.freeze({ id: 'zuri', name: 'Zuri', xp: 450, guide: 'Amara' }),
]);

function normalizeLeaderboardXp(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
}

function getLearnerName(profile) {
  const candidate = profile?.preferredName || profile?.username;
  return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : 'You';
}

function buildLeaderboard(profile = {}) {
  const learnerEntry = {
    id: CURRENT_USER_ID,
    name: getLearnerName(profile),
    xp: normalizeLeaderboardXp(profile?.xp),
    guide: 'Sol',
    isCurrentUser: true,
  };
  const rows = [...PRACTICE_LEAGUE_FIXTURES, learnerEntry]
    .map((entry, stableOrder) => ({ ...entry, stableOrder, isCurrentUser: entry.id === CURRENT_USER_ID }))
    .sort((left, right) => right.xp - left.xp || left.stableOrder - right.stableOrder)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
  const learner = rows.find((entry) => entry.id === CURRENT_USER_ID);
  const nextEntry = learner.rank > 1 ? rows[learner.rank - 2] : null;
  const progressCopy = nextEntry
    ? `${nextEntry.xp - learner.xp + 1} XP to pass ${nextEntry.name}.`
    : 'You are leading this practice league.';

  return { learner, progressCopy, rows };
}

module.exports = {
  CURRENT_USER_ID,
  PRACTICE_LEAGUE_FIXTURES,
  buildLeaderboard,
  normalizeLeaderboardXp,
};
