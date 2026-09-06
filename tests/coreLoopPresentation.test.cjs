const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildCoreLoopViewModel,
} = require('../src/lessonExperience/coreLoopPresentation.cjs');

const topics = [
  { id: 'greetings', title: 'Greetings', order: 1, type: 'lesson', guide: 'Amara', conceptCount: 4 },
  { id: 'family', title: 'Family', order: 2, type: 'lesson', guide: 'Kai', conceptCount: 5 },
  { id: 'review-one', title: 'Review', order: 3, type: 'review', guide: 'Sol', conceptCount: 9 },
  { id: 'challenge-one', title: 'Challenge', order: 4, type: 'challenge', guide: 'Sol', conceptCount: 9 },
];

test('core loop highlights the next unfinished lesson as a large active card', () => {
  const view = buildCoreLoopViewModel({
    course: {
      displayName: 'Swahili',
      flag: '🇰🇪',
      category: 'East African Bantu',
      published: false,
    },
    topics,
    completedTopicIds: ['greetings'],
  });

  assert.deepEqual(view.courseIdentity, {
    title: 'Swahili',
    flag: '🇰🇪',
    category: 'East African Bantu',
    reviewLabel: 'Native review pending',
  });
  assert.equal(view.progress.completed, 1);
  assert.equal(view.progress.total, 4);
  assert.equal(view.progress.percent, 25);
  assert.equal(view.activeCard.id, 'family');
  assert.equal(view.activeCard.title, 'Family');
  assert.equal(view.activeCard.ctaLabel, 'Start lesson');
  assert.equal(view.activeCard.state, 'active');
  assert.equal(view.lessonCards[0].state, 'complete');
  assert.equal(view.lessonCards[1].state, 'active');
  assert.equal(view.lessonCards[2].state, 'locked');
});

test('core loop supports explicit active review and completed chapter replay', () => {
  const review = buildCoreLoopViewModel({
    course: { displayName: 'Jamaican Patois', flag: '🇯🇲', category: 'Caribbean Creole', published: true },
    topics,
    completedTopicIds: ['greetings', 'family'],
    activeTopicId: 'review-one',
  });

  assert.equal(review.activeCard.id, 'review-one');
  assert.equal(review.activeCard.modeLabel, 'Review');
  assert.equal(review.activeCard.ctaLabel, 'Start review');
  assert.equal(review.lessonCards[2].state, 'active');

  const complete = buildCoreLoopViewModel({
    course: { displayName: 'Jamaican Patois', flag: '🇯🇲', category: 'Caribbean Creole', published: true },
    topics,
    completedTopicIds: topics.map((topic) => topic.id),
  });

  assert.equal(complete.progress.percent, 100);
  assert.equal(complete.activeCard.id, 'greetings');
  assert.equal(complete.activeCard.ctaLabel, 'Practice again');
  assert.equal(complete.chapterComplete, true);
  assert.equal(complete.lessonCards.every((card) => card.state === 'complete'), true);
});
