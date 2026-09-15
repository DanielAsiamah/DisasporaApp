const test = require('node:test');
const assert = require('node:assert/strict');
const { createLessonSummary, recordCheckedAnswer, recordSavedReward, presentLessonSummary } = require('../src/lessonExperience/lessonSummary.cjs');

test('empty lessons do not claim perfect accuracy or saved XP', () => {
  assert.deepEqual(presentLessonSummary(createLessonSummary()), {
    accuracy: null, checkedAnswers: 0, mistakes: 0, savedXp: 0,
  });
});

test('accuracy includes wrong checks and successful retries', () => {
  let state = createLessonSummary();
  state = recordCheckedAnswer(state, false);
  state = recordCheckedAnswer(state, true);
  state = recordCheckedAnswer(state, true);
  assert.deepEqual(presentLessonSummary(state), {
    accuracy: 67, checkedAnswers: 3, mistakes: 1, savedXp: 0,
  });
});

test('confirmed rewards are counted once, including acknowledged retries', () => {
  let state = createLessonSummary();
  state = recordSavedReward(state, 'attempt_step_1', 10);
  state = recordSavedReward(state, 'attempt_step_1', 10);
  state = recordSavedReward(state, 'attempt_step_2', 10);
  assert.equal(presentLessonSummary(state).savedXp, 20);
  assert.equal(presentLessonSummary(createLessonSummary()).savedXp, 0);
});

test('invalid XP and missing reward IDs cannot inflate the summary', () => {
  let state = createLessonSummary();
  for (const value of [-10, NaN, Infinity, '10']) state = recordSavedReward(state, 'bad', value);
  state = recordSavedReward(state, '', 10);
  assert.equal(presentLessonSummary(state).savedXp, 0);
});
