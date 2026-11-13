const test = require('node:test');
const assert = require('node:assert/strict');

const { MVP_TABS } = require('../src/navigation/mvpNavigation.cjs');

test('main navigation exposes learning, honest progress, and the opt-in league', () => {
  assert.deepEqual(MVP_TABS.map((tab) => tab.id), ['learn', 'progress', 'leaderboard']);
  assert.deepEqual(MVP_TABS.map((tab) => tab.label), ['Learn', 'Progress', 'Leaderboard']);
  assert.deepEqual(MVP_TABS.map((tab) => tab.icon), ['book-outline', 'analytics-outline', 'trophy-outline']);
  assert.deepEqual(MVP_TABS.map((tab) => tab.activeIcon), ['book', 'analytics', 'trophy']);
});
