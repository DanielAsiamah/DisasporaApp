const assert = require('node:assert/strict');
const test = require('node:test');
const { getAnswerTextDirection } = require('../src/lessonExperience/answerTextDirection.cjs');

test('Arabic answers use right-to-left layout even after numbers or punctuation', () => {
  assert.equal(getAnswerTextDirection('\u0627\u062a\u0634\u0631\u0641\u062a \u0628\u064a\u0643'), 'rtl');
  assert.equal(getAnswerTextDirection('  "123 \u0645\u0633\u0627\u0621 \u0627\u0644\u062e\u064a\u0631"'), 'rtl');
});

test('English and Latin-script answers remain left-to-right, including mixed-script examples', () => {
  for (const answer of ['nice to meet you', 'Nanga def?', 'Jambo rafiki', 'Bonjou', 'Hello \u0645\u0631\u062d\u0628\u0627']) {
    assert.equal(getAnswerTextDirection(answer), 'ltr', answer);
  }
});

test('empty and neutral-only answers have a stable left-to-right fallback', () => {
  for (const answer of [undefined, null, '', '  ', '123 ...']) {
    assert.equal(getAnswerTextDirection(answer), 'ltr');
  }
});
