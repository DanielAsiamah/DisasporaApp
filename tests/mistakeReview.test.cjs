const test = require('node:test');
const assert = require('node:assert/strict');
const { recordMistake, buildMistakeReview } = require('../src/lessonExperience/mistakeReview.cjs');
const { buildCorrectAnswerRewardId } = require('../src/lessonEngine/lessonXpReward.cjs');

test('repeated mistakes queue an exercise once without mutating the original list', () => {
  const initial = [];
  const once = recordMistake(initial, 'phrase-one');
  assert.deepEqual(initial, []);
  assert.deepEqual(recordMistake(once, 'phrase-one'), ['phrase-one']);
  assert.deepEqual(recordMistake(once, 'phrase-two'), ['phrase-one', 'phrase-two']);
});

test('review includes only missed exercises from the current lesson, in lesson order', () => {
  const exercises = [{ id: 'one' }, { id: 'two' }, { id: 'three' }];
  assert.deepEqual(buildMistakeReview(exercises, ['three', 'one', 'gone', 'three']), [exercises[0], exercises[2]]);
  assert.deepEqual(buildMistakeReview(exercises, []), []);
});

test('review preserves the original reward identity so repeated practice cannot mint extra XP', () => {
  const exercise = { id: 'original-exercise', answer: 'original answer', sourceStepId: 'workbook-step' };
  const [review] = buildMistakeReview([exercise], [exercise.id]);
  assert.equal(review, exercise);
  assert.equal(
    buildCorrectAnswerRewardId({ attemptId: 'attempt', exerciseId: review.id }),
    buildCorrectAnswerRewardId({ attemptId: 'attempt', exerciseId: exercise.id })
  );
});
