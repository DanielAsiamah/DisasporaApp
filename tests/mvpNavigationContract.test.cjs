const test = require('node:test');
const assert = require('node:assert/strict');

const { MVP_TABS } = require('../src/navigation/mvpNavigation.cjs');

test('main navigation exposes learning, personalised practice, honest progress, and the opt-in league', () => {
  assert.deepEqual(MVP_TABS.map((tab) => tab.id), ['learn', 'practice', 'progress', 'leaderboard']);
  assert.deepEqual(MVP_TABS.map((tab) => tab.label), ['Learn', 'Practice', 'Progress', 'Leaderboard']);
  assert.deepEqual(MVP_TABS.map((tab) => tab.icon), ['book-outline', 'refresh-circle-outline', 'analytics-outline', 'trophy-outline']);
  assert.deepEqual(MVP_TABS.map((tab) => tab.activeIcon), ['book', 'refresh-circle', 'analytics', 'trophy']);
});
