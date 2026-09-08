'use strict';

function buildPublicEntry(profile) {
  const name = String(profile.preferredName || profile.username || '').trim().slice(0, 40);
  if (!name) throw new Error('A display name is required to join.');
  const xp = profile.xp;
  if (!Number.isSafeInteger(xp) || xp < 0) throw new Error('Saved XP is unavailable.');
  return { name, xp };
}

function buildLiveLeaderboard(entries, uid) {
  const rows = entries.filter((row) => typeof row.id === 'string' && typeof row.name === 'string'
    && row.name.trim() && Number.isSafeInteger(row.xp) && row.xp >= 0)
    .map(({ id, name, xp }) => ({ id, name, xp, guide: 'Sol', isCurrentUser: id === uid }))
    .sort((a, b) => b.xp - a.xp || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map((row, index) => ({ ...row, rank: index + 1 }));
  const learner = rows.find((row) => row.isCurrentUser) || null;
  const ahead = learner && learner.rank > 1 ? rows[learner.rank - 2] : null;
  const progressCopy = ahead ? `${ahead.xp - learner.xp + 1} XP to pass ${ahead.name}.`
    : learner ? 'You lead the current leaderboard.' : 'Keep learning to earn a place in the top 50.';
  return { rows, learner, progressCopy };
}

module.exports = { buildPublicEntry, buildLiveLeaderboard };
