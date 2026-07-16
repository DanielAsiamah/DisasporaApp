const test = require('node:test');
const assert = require('node:assert/strict');

const { MVP_TABS } = require('../src/navigation/mvpNavigation.cjs');

test('MVP navigation contains only Learn and Leaderboard', () => {
  assert.deepEqual(MVP_TABS.map((tab) => tab.id), ['learn', 'leaderboard']);
  assert.deepEqual(MVP_TABS.map((tab) => tab.label), ['Learn', 'Leaderboard']);
});
