const test = require('node:test');
const assert = require('node:assert/strict');

const {
  CURRENT_USER_ID,
  buildLeaderboard,
  normalizeLeaderboardXp,
} = require('../src/lessonEngine/leaderboardRanking.cjs');

test('the learner rank is derived from real saved profile XP', () => {
  assert.equal(buildLeaderboard({ preferredName: 'Daniel', xp: 0 }).learner.rank, 7);
  assert.equal(buildLeaderboard({ preferredName: 'Daniel', xp: 600 }).learner.rank, 6);
  assert.equal(buildLeaderboard({ preferredName: 'Daniel', xp: 1300 }).learner.rank, 1);
});

test('stable identity keeps a learner named like a fixture distinct and highlighted once', () => {
  const result = buildLeaderboard({ preferredName: 'Aisha', xp: 700 });
  const sameNameRows = result.rows.filter((entry) => entry.name === 'Aisha');

  assert.equal(sameNameRows.length, 2);
  assert.equal(result.rows.filter((entry) => entry.isCurrentUser).length, 1);
  assert.equal(result.learner.id, CURRENT_USER_ID);
});

test('invalid and negative XP safely normalize to zero', () => {
  assert.equal(normalizeLeaderboardXp(-8), 0);
  assert.equal(normalizeLeaderboardXp('not-a-number'), 0);
  assert.equal(normalizeLeaderboardXp(Number.POSITIVE_INFINITY), 0);
  assert.equal(normalizeLeaderboardXp('19.9'), 19);
});

test('ties are deterministic and the next-rank copy uses exact XP math', () => {
  const tied = buildLeaderboard({ preferredName: 'Daniel', xp: 650 });
  const repeated = buildLeaderboard({ preferredName: 'Daniel', xp: 650 });

  assert.deepEqual(tied.rows.map((entry) => entry.id), repeated.rows.map((entry) => entry.id));
  assert.ok(tied.rows.findIndex((entry) => entry.id === 'malik') < tied.rows.findIndex((entry) => entry.id === CURRENT_USER_ID));
  assert.equal(tied.learner.rank, 6);
  assert.equal(tied.progressCopy, '1 XP to pass Malik.');
});

test('rank boundaries and passing copy stay correct around every fixture score', () => {
  const cases = [
    [0, 7, '451 XP to pass Zuri.'],
    [449, 7, '2 XP to pass Zuri.'],
    [450, 7, '1 XP to pass Zuri.'],
    [451, 6, '200 XP to pass Malik.'],
    [649, 6, '2 XP to pass Malik.'],
    [650, 6, '1 XP to pass Malik.'],
    [651, 5, '150 XP to pass Dina.'],
    [1249, 2, '2 XP to pass Aisha.'],
    [1250, 2, '1 XP to pass Aisha.'],
    [1251, 1, 'You are leading this practice league.'],
  ];

  for (const [xp, expectedRank, expectedCopy] of cases) {
    const result = buildLeaderboard({ preferredName: 'Daniel', xp });
    assert.equal(result.learner.rank, expectedRank, `rank for ${xp} XP`);
    assert.equal(result.progressCopy, expectedCopy, `copy for ${xp} XP`);
  }
});

test('the learner receives truthful leading copy at rank one', () => {
  const result = buildLeaderboard({ username: 'Leader', xp: 1300 });

  assert.equal(result.learner.name, 'Leader');
  assert.equal(result.progressCopy, 'You are leading this practice league.');
});
