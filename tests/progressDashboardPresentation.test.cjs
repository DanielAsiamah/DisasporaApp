const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildProgressDashboardViewModel,
} = require('../src/lessonExperience/progressDashboardPresentation.cjs');

const topics = [
  { id: 'hello', conceptCount: 3 },
  { id: 'family', conceptCount: 5 },
  { id: 'travel', conceptCount: 4 },
  { id: 'stories', conceptCount: 8 },
];

test('progress dashboard reports only saved and curriculum-backed learner statistics', () => {
  const result = buildProgressDashboardViewModel({
    completedTopicIds: ['hello', 'family', 'not-in-this-course'],
    courseName: 'Igbo',
    dailyGoalMinutes: 10,
    duePracticeCount: 2,
    ready: true,
    streak: 7,
    topics,
    totalWords: 20,
    xp: 130,
  });

  assert.equal(result.title, 'Momentum is building');
  assert.equal(result.courseName, 'Igbo');
  assert.deepEqual(result.progress, {
    accessibilityLabel: '2 of 4 topics complete, 50 percent',
    completed: 2,
    percent: 50,
    total: 4,
  });
  assert.deepEqual(result.stats.map(({ id, label, value }) => ({ id, label, value })), [
    { id: 'xp', label: 'Total XP', value: '130' },
    { id: 'streak', label: 'Day streak', value: '7' },
    { id: 'topics', label: 'Topics', value: '2/4' },
    { id: 'words', label: 'Words covered', value: '8/20' },
  ]);
  assert.deepEqual(result.practice, {
    dueCount: 2,
    label: '2 phrases due',
    message: 'A short personalised review is ready from your saved mistakes.',
  });
  assert.equal(result.dailyGoal.label, '10 min daily target');
  assert.deepEqual(result.achievements.map(({ id, progressLabel, state }) => ({ id, progressLabel, state })), [
    { id: 'first-step', progressLabel: '1 of 1 topic', state: 'unlocked' },
    { id: 'word-collector', progressLabel: '8 of 10 words', state: 'locked' },
    { id: 'momentum', progressLabel: '100 of 100 XP', state: 'unlocked' },
    { id: 'three-day-rhythm', progressLabel: '3 of 3 days', state: 'unlocked' },
  ]);
  assert.deepEqual(result.milestones.map(({ id, state }) => ({ id, state })), [
    { id: 'first-step', state: 'complete' },
    { id: 'explorer', state: 'complete' },
    { id: 'connector', state: 'complete' },
    { id: 'storyteller', state: 'current' },
    { id: 'chapter-keeper', state: 'locked' },
  ]);
});

test('progress dashboard handles loading, empty, malformed, and complete states without invented progress', () => {
  const loading = buildProgressDashboardViewModel({ ready: false, topics, totalWords: 20 });
  assert.equal(loading.title, 'Gathering your journey');
  assert.equal(loading.progress.accessibilityLabel, 'Course progress loading');
  assert.equal(loading.stats.find((stat) => stat.id === 'words').value, '...');
  assert.ok(loading.achievements.every(({ progressLabel, state }) => (
    progressLabel === 'Loading progress' && state === 'loading'
  )));

  const empty = buildProgressDashboardViewModel({
    completedTopicIds: ['unknown'],
    dailyGoalMinutes: -40,
    duePracticeCount: -2,
    ready: true,
    streak: 'invalid',
    topics,
    totalWords: 20,
    xp: Number.POSITIVE_INFINITY,
  });
  assert.equal(empty.title, 'Your story starts here');
  assert.equal(empty.progress.percent, 0);
  assert.equal(empty.dailyGoal.label, '1 min daily target');
  assert.equal(empty.practice.label, 'Nothing due yet');
  assert.equal(empty.stats.find((stat) => stat.id === 'xp').value, '0');
  assert.equal(empty.stats.find((stat) => stat.id === 'streak').value, '0');
  assert.ok(empty.achievements.every(({ state }) => state === 'locked'));

  const complete = buildProgressDashboardViewModel({
    completedTopicIds: topics.map((topic) => topic.id),
    ready: true,
    topics,
    totalWords: 12,
  });
  assert.equal(complete.title, 'Chapter complete');
  assert.equal(complete.progress.percent, 100);
  assert.equal(complete.stats.find((stat) => stat.id === 'words').value, '12/12');
  assert.equal(complete.milestones.at(-1).state, 'complete');
});

test('achievement thresholds unlock only from exact persisted and curriculum-backed evidence', () => {
  const below = buildProgressDashboardViewModel({
    completedTopicIds: [],
    ready: true,
    streak: 2,
    topics: [{ id: 'one', conceptCount: 9 }],
    totalWords: 9,
    xp: 99,
  });
  assert.deepEqual(below.achievements.map(({ id, state }) => ({ id, state })), [
    { id: 'first-step', state: 'locked' },
    { id: 'word-collector', state: 'locked' },
    { id: 'momentum', state: 'locked' },
    { id: 'three-day-rhythm', state: 'locked' },
  ]);

  const exact = buildProgressDashboardViewModel({
    completedTopicIds: ['one'],
    ready: true,
    streak: 3,
    topics: [{ id: 'one', conceptCount: 10 }],
    totalWords: 10,
    xp: 100,
  });
  assert.ok(exact.achievements.every(({ state }) => state === 'unlocked'));
});

test('coercible arrays, booleans, and objects cannot unlock numeric achievements', () => {
  for (const malformed of [[100], true, { valueOf: () => 100 }]) {
    const result = buildProgressDashboardViewModel({
      completedTopicIds: [],
      ready: true,
      streak: malformed,
      topics,
      totalWords: malformed,
      xp: malformed,
    });

    assert.ok(result.achievements.every(({ state }) => state === 'locked'));
    assert.equal(result.stats.find(({ id }) => id === 'xp').value, '0');
    assert.equal(result.stats.find(({ id }) => id === 'streak').value, '0');
  }
});
