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
    lastReviewedAt: 0,
    misses: 1,
    nextReviewAt: 100,
    successfulReviews: 0,
    topicId: 'easy-greetings',
    updatedAt: 100,
  }]);
  assert.deepEqual(twice, [{
    exerciseId: 'patois-greeting-1',
    lastMissedAt: 250,
    lastReviewedAt: 0,
    misses: 2,
    nextReviewAt: 250,
    successfulReviews: 0,
    topicId: 'easy-greetings',
    updatedAt: 250,
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
    {
      exerciseId: 'one',
      topicId: 'topic-a',
      misses: 2,
      lastMissedAt: 200,
      lastReviewedAt: 0,
      nextReviewAt: 200,
      successfulReviews: 0,
      updatedAt: 200,
    },
    {
      exerciseId: 'two',
      topicId: 'topic-b',
      misses: 1,
      lastMissedAt: 300,
      lastReviewedAt: 0,
      nextReviewAt: 300,
      successfulReviews: 0,
      updatedAt: 300,
    },
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
    now: 1_000,
    resumeTopicId: 'topic-b',
    topics: [
      { id: 'topic-a', order: 1, guide: 'Amara' },
      { id: 'topic-b', order: 2, guide: 'Ayo' },
    ],
  });

  assert.equal(topic.id, 'jamaican-patois-personalised-review');
  assert.equal(topic.isAdaptiveReview, true);
  assert.equal(topic.type, 'review');
  assert.equal(topic.guide, 'Ayo');
  assert.equal(topic.nextTopicId, 'topic-b');
  assert.deepEqual(topic.reviewExerciseIds, ['three', 'one']);
  assert.deepEqual(topic.exerciseOverrides, [third, first]);
});

test('adaptive review only selects exercises whose next practice is due', () => {
  const due = { id: 'due', prompt: 'Due?' };
  const later = { id: 'later', prompt: 'Later?' };
  const topic = buildAdaptiveReviewTopic({
    courseId: 'jamaican-patois',
    exercisesByTopic: new Map([['topic-a', [due, later]]]),
    mistakeQueue: [
      { exerciseId: 'due', topicId: 'topic-a', misses: 1, lastMissedAt: 100, nextReviewAt: 500 },
      { exerciseId: 'later', topicId: 'topic-a', misses: 5, lastMissedAt: 200, nextReviewAt: 2_000 },
    ],
    now: 1_000,
    topics: [{ id: 'topic-a', order: 1, guide: 'Amara' }],
  });

  assert.deepEqual(topic.reviewExerciseIds, ['due']);
  assert.equal(topic.dueCount, 1);
});

test('finishing review clears mastered exercises but keeps anything missed again', () => {
  const queue = [
    { exerciseId: 'one', topicId: 'topic-a', misses: 2, lastMissedAt: 200 },
    { exerciseId: 'two', topicId: 'topic-a', misses: 1, lastMissedAt: 300 },
    { exerciseId: 'three', topicId: 'topic-b', misses: 1, lastMissedAt: 400 },
  ];

  assert.deepEqual(
    resolveAdaptiveReview(queue, ['one', 'two'], ['two'], 1_000),
    [
      {
        ...queue[0],
        lastReviewedAt: 1_000,
        nextReviewAt: 86_401_000,
        successfulReviews: 1,
        updatedAt: 1_000,
      },
      {
        ...queue[1],
        lastReviewedAt: 1_000,
        nextReviewAt: 1_000,
        successfulReviews: 0,
        updatedAt: 1_000,
      },
      {
        ...queue[2],
        lastReviewedAt: 0,
        nextReviewAt: 400,
        successfulReviews: 0,
        updatedAt: 400,
      },
    ]
  );
});

test('three successful spaced reviews master an exercise', () => {
  const original = [{
    exerciseId: 'one',
    topicId: 'topic-a',
    misses: 2,
    lastMissedAt: 100,
  }];
  const first = resolveAdaptiveReview(original, ['one'], [], 1_000);
  const second = resolveAdaptiveReview(first, ['one'], [], 86_401_000);
  const mastered = resolveAdaptiveReview(second, ['one'], [], 345_601_000);

  assert.equal(first[0].successfulReviews, 1);
  assert.equal(first[0].nextReviewAt, 86_401_000);
  assert.equal(second[0].successfulReviews, 2);
  assert.equal(second[0].nextReviewAt, 345_601_000);
  assert.deepEqual(mastered, []);
});

test('a newer miss resets spaced-review progress when local and cloud state merge', () => {
  const practised = {
    exerciseId: 'one',
    topicId: 'topic-a',
    misses: 2,
    lastMissedAt: 100,
    lastReviewedAt: 1_000,
    nextReviewAt: 86_401_000,
    successfulReviews: 1,
    updatedAt: 1_000,
  };
  const missedAgain = recordPersistentMistake([practised], {
    exerciseId: 'one',
    occurredAt: 2_000,
    topicId: 'topic-a',
  });

  assert.deepEqual(mergeMistakeQueues([practised], missedAgain), missedAgain);
  assert.equal(missedAgain[0].successfulReviews, 0);
  assert.equal(missedAgain[0].nextReviewAt, 2_000);
  assert.equal(missedAgain[0].misses, 3);
});

test('lesson shell exposes generated adaptive exercises and persistent mistake callbacks', () => {
  const root = path.join(__dirname, '..');
  const home = fs.readFileSync(path.join(root, 'src/screens/MvpHomeScreen.js'), 'utf8');
  const modal = fs.readFileSync(path.join(root, 'src/components/mvp/PatoisLessonModal.js'), 'utf8');

  assert.match(home, /buildAdaptiveReviewTopic/);
  assert.match(home, /const hasAdaptiveReview = Boolean\(adaptiveReviewTopic\)/);
  assert.match(home, /resumeTopicId: coreLoopView\.activeCard\?\.id \|\| null/);
  assert.match(home, /onMistake=/);
  assert.match(home, /resolveAdaptiveReview/);
  assert.match(modal, /topic\?\.exerciseOverrides/);
  assert.match(modal, /onMistake\?\./);
  assert.match(modal, /adaptive-review-\$\{runtimeCourseId\}/);
  assert.match(modal, /topic\?\.isAdaptiveReview && topic\?\.nextTopicId/);
  assert.match(modal, /You finished \$\{topic\.title\}\. Your practice queue is up to date\./);
});
