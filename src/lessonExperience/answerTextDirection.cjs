'use strict';

function getAnswerTextDirection(answer) {
  // Use the answer, not the course: an Arabic lesson can ask for English words.
  const firstLetter = String(answer ?? '').match(/\p{Letter}/u)?.[0];
  return firstLetter && /[\p{Script=Arabic}\p{Script=Hebrew}]/u.test(firstLetter) ? 'rtl' : 'ltr';
}

module.exports = { getAnswerTextDirection };
