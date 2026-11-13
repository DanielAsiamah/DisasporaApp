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
