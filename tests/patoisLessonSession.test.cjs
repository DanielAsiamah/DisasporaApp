const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createExerciseResponse,
  evaluateExerciseResponse,
  selectMatchItem,
  toggleWordBankItem,
} = require('../src/lessonEngine/patoisLessonSession.cjs');

test('choice responses are correct only when the selected answer matches', () => {
  const exercise = { type: 'translate-choice', answer: 'Tank yuh' };
  assert.equal(evaluateExerciseResponse(exercise, { selectedChoice: 'Tank yuh' }), true);
  assert.equal(evaluateExerciseResponse(exercise, { selectedChoice: 'Please' }), false);
});

test('matching accepts only opposite sides of the same pair', () => {
  const initial = createExerciseResponse({ type: 'match-pairs' });
  const left = selectMatchItem(initial, { side: 'left', id: 'left-yes', pairId: 'yes' });
  const mismatch = selectMatchItem(left.response, { side: 'right', id: 'right-no', pairId: 'no' });
  const retryLeft = selectMatchItem(mismatch.response, { side: 'left', id: 'left-yes', pairId: 'yes' });
  const accepted = selectMatchItem(retryLeft.response, { side: 'right', id: 'right-yes', pairId: 'yes' });

  assert.equal(left.status, 'selected');
  assert.equal(mismatch.status, 'mismatch');
  assert.deepEqual(mismatch.response.matchedPairIds, []);
  assert.equal(accepted.status, 'matched');
  assert.deepEqual(accepted.response.matchedPairIds, ['yes']);
});

test('a matching response completes only after every pair is accepted', () => {
  const exercise = { type: 'match-pairs', pairs: [{ conceptId: 'yes' }, { conceptId: 'no' }] };
  assert.equal(evaluateExerciseResponse(exercise, { matchedPairIds: ['yes'] }), false);
  assert.equal(evaluateExerciseResponse(exercise, { matchedPairIds: ['yes', 'no'] }), true);
});

test('word-bank items move into and out of the answer tray by stable index', () => {
  const initial = createExerciseResponse({ type: 'sentence-build' });
  const first = toggleWordBankItem(initial, { index: 1, value: 'name' });
  const second = toggleWordBankItem(first, { index: 0, value: 'Mi' });
  const removed = toggleWordBankItem(second, { index: 1, value: 'name' });

  assert.deepEqual(second.builtWords, [
    { index: 1, value: 'name' },
    { index: 0, value: 'Mi' },
  ]);
  assert.deepEqual(removed.builtWords, [{ index: 0, value: 'Mi' }]);
});

test('sentence and word-tray evaluation uses the learner order fairly', () => {
  const exercise = { type: 'sentence-build', answer: 'Mi name' };
  assert.equal(evaluateExerciseResponse(exercise, {
    builtWords: [{ index: 4, value: 'Mi' }, { index: 1, value: 'name' }],
  }), true);
  assert.equal(evaluateExerciseResponse(exercise, {
    builtWords: [{ index: 1, value: 'name' }, { index: 4, value: 'Mi' }],
  }), false);
});
