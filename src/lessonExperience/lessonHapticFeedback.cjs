'use strict';

function getLessonHapticFeedback({ event, correct } = {}) {
  if (event === 'answer-checked') return correct ? 'success' : 'error';
  if (event === 'match-selected') return 'selection';
  if (event === 'match-accepted') return 'success';
  if (event === 'match-rejected') return 'error';
  return null;
}

module.exports = { getLessonHapticFeedback };
