const test = require('node:test');
const assert = require('node:assert/strict');
const { buildLiveLeaderboard, buildPublicEntry } = require('../src/lessonEngine/liveLeaderboard.cjs');

test('empty results never invent competitors or a learner rank', () => {
  const result = buildLiveLeaderboard([], 'me');
  assert.deepEqual(result.rows, []);
  assert.equal(result.learner, null);
});

test('sorts actual entries with stable ties and identifies learners by uid', () => {
  const result = buildLiveLeaderboard([
    { id: 'b', name: 'Same', xp: 20 },
    { id: 'a', name: 'Same', xp: 20 },
    { id: 'c', name: 'Third', xp: 10 },
  ], 'b');
  assert.deepEqual(result.rows.map((row) => row.id), ['a', 'b', 'c']);
  assert.equal(result.learner.rank, 2);
  assert.equal(result.rows.filter((row) => row.isCurrentUser).length, 1);
  assert.equal(result.progressCopy, '1 XP to pass Same.');
});

test('public projection excludes private profile fields', () => {
  assert.deepEqual(buildPublicEntry({ preferredName: '  Ada  ', xp: 12, email: 'private@example.com', answers: ['private'] }), {
    name: 'Ada', xp: 12,
  });
  assert.throws(() => buildPublicEntry({ preferredName: '', xp: 1 }), /display name/);
});

test('malformed entries are excluded without inventing XP', () => {
  const result = buildLiveLeaderboard([
    { id: 'a', name: 'A', xp: -1 }, { id: 'b', name: 'B', xp: Infinity },
    { id: 'c', name: 'C', xp: 5 },
  ], 'missing');
  assert.equal(result.rows.length, 1);
  assert.equal(result.learner, null);
});
