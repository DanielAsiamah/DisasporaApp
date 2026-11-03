const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  buildAdaptiveReviewTopic,
  mergeMistakeQueues,
  recordPersistentMistake,
  resolveAdaptiveReview,
} = require('../src/lessonExperience/adaptiveMistakeReview.cjs');

test('persistent mistakes deduplicate an exercise while retaining frequency and recency', () => {
  const once = recordPersistentMistake([], {
    exerciseId: 'patois-greeting-1',
    occurredAt: 100,
    topicId: 'easy-greetings',
  });
  const twice = recordPersistentMistake(once, {
    exerciseId: 'patois-greeting-1',
    occurredAt: 250,
    topicId: 'easy-greetings',
  });

  assert.deepEqual(once, [{
    exerciseId: 'patois-greeting-1',
    lastMissedAt: 100,
    misses: 1,
    topicId: 'easy-greetings',
  }]);
  assert.deepEqual(twice, [{
    exerciseId: 'patois-greeting-1',
    lastMissedAt: 250,
    misses: 2,
    topicId: 'easy-greetings',
  }]);
});

test('local and cloud mistake mirrors merge without multiplying the same misses', () => {
  assert.deepEqual(mergeMistakeQueues(
    [{ exerciseId: 'one', topicId: 'topic-a', misses: 2, lastMissedAt: 200 }],
    [
      { exerciseId: 'one', topicId: 'topic-a', misses: 2, lastMissedAt: 200 },
      { exerciseId: 'two', topicId: 'topic-b', misses: 1, lastMissedAt: 300 },
    ]
  ), [
    { exerciseId: 'one', topicId: 'topic-a', misses: 2, lastMissedAt: 200 },
    { exerciseId: 'two', topicId: 'topic-b', misses: 1, lastMissedAt: 300 },
  ]);
});

test('adaptive review ranks weak exercises and rejects stale or foreign IDs', () => {
  const first = { id: 'one', prompt: 'One?' };
  const second = { id: 'two', prompt: 'Two?' };
  const third = { id: 'three', prompt: 'Three?' };
  const topic = buildAdaptiveReviewTopic({
    courseId: 'jamaican-patois',
    exercisesByTopic: new Map([
      ['topic-a', [first, second]],
      ['topic-b', [third]],
    ]),
    mistakeQueue: [
      { exerciseId: 'one', topicId: 'topic-a', misses: 1, lastMissedAt: 300 },
      { exerciseId: 'three', topicId: 'topic-b', misses: 3, lastMissedAt: 100 },
      { exerciseId: 'stale', topicId: 'topic-a', misses: 99, lastMissedAt: 999 },
      { exerciseId: 'two', topicId: 'wrong-topic', misses: 8, lastMissedAt: 800 },
    ],
    topics: [
      { id: 'topic-a', order: 1, guide: 'Amara' },
      { id: 'topic-b', order: 2, guide: 'Ayo' },
    ],
  });

  assert.equal(topic.id, 'jamaican-patois-personalised-review');
  assert.equal(topic.isAdaptiveReview, true);
  assert.equal(topic.type, 'review');
  assert.equal(topic.guide, 'Ayo');
  assert.deepEqual(topic.reviewExerciseIds, ['three', 'one']);
  assert.deepEqual(topic.exerciseOverrides, [third, first]);
});

test('finishing review clears mastered exercises but keeps anything missed again', () => {
  const queue = [
    { exerciseId: 'one', topicId: 'topic-a', misses: 2, lastMissedAt: 200 },
    { exerciseId: 'two', topicId: 'topic-a', misses: 1, lastMissedAt: 300 },
    { exerciseId: 'three', topicId: 'topic-b', misses: 1, lastMissedAt: 400 },
  ];

  assert.deepEqual(
    resolveAdaptiveReview(queue, ['one', 'two'], ['two']),
    [queue[1], queue[2]]
  );
});

test('lesson shell exposes generated adaptive exercises and persistent mistake callbacks', () => {
  const root = path.join(__dirname, '..');
  const home = fs.readFileSync(path.join(root, 'src/screens/MvpHomeScreen.js'), 'utf8');
  const modal = fs.readFileSync(path.join(root, 'src/components/mvp/PatoisLessonModal.js'), 'utf8');

  assert.match(home, /buildAdaptiveReviewTopic/);
  assert.match(home, /onMistake=/);
  assert.match(home, /resolveAdaptiveReview/);
  assert.match(modal, /topic\?\.exerciseOverrides/);
  assert.match(modal, /onMistake\?\./);
  assert.match(modal, /adaptive-review-\$\{runtimeCourseId\}/);
});
