const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getLessonHapticFeedback,
} = require('../src/lessonExperience/lessonHapticFeedback.cjs');

test('checked answers and pair interactions map to deliberate haptic feedback', () => {
  assert.equal(getLessonHapticFeedback({ event: 'answer-checked', correct: true }), 'success');
  assert.equal(getLessonHapticFeedback({ event: 'answer-checked', correct: false }), 'error');
  assert.equal(getLessonHapticFeedback({ event: 'match-selected' }), 'selection');
  assert.equal(getLessonHapticFeedback({ event: 'match-accepted' }), 'success');
  assert.equal(getLessonHapticFeedback({ event: 'match-rejected' }), 'error');
  assert.equal(getLessonHapticFeedback({ event: 'lesson-restart' }), null);
});
