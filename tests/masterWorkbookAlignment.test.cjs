const test = require('node:test');
const assert = require('node:assert/strict');
const { buildAlignment } = require('../scripts/lib/master-workbook-alignment.cjs');

const curriculum = {
  concepts: [{ id: 'hello', meaning: 'hello' }],
  courseVocabulary: [{ courseId: 'jamaican-patois', conceptId: 'hello', localized: 'Wah gwaan', reviewStatus: 'needs-native-review' }],
};
const lessons = [{ lesson_id: 'patois_u01_l01', language_id: 'patois', lesson_title: 'Greetings 1' }];

test('matches only the same language and retains draft provenance', () => {
  const result = buildAlignment({ lessons, vocabulary: [
    { content_id: 'one', language_id: 'patois', lesson_id: lessons[0].lesson_id, english_source: ' Hello ', target_text: '' },
    { content_id: 'two', language_id: 'swahili', english_source: 'hello', target_text: '' },
  ] }, curriculum);
  assert.equal(result.items[0].matchState, 'existing-candidate');
  assert.equal(result.items[0].candidates[0].reviewStatus, 'needs-native-review');
  assert.equal(result.items[1].matchState, 'missing');
});

test('preserves workbook text and reports incomplete and empty lessons', () => {
  const result = buildAlignment({ lessons: [...lessons, { lesson_id: 'empty' }], vocabulary: [
    { content_id: 'one', language_id: 'patois', lesson_id: lessons[0].lesson_id, english_source: 'hello', target_text: 'Workbook answer' },
    { content_id: 'two', language_id: 'patois', lesson_id: lessons[0].lesson_id, english_source: 'goodbye', target_text: '' },
  ] }, curriculum);
  assert.equal(result.items[0].target_text, 'Workbook answer');
  assert.equal(result.items[0].matchState, 'workbook-translation');
  assert.equal(result.lessons[0].missingItems, 1);
  assert.equal(result.lessons[0].translationCoverageComplete, false);
  assert.equal(result.lessons[1].translationCoverageComplete, false);
});

test('does not choose arbitrarily between ambiguous existing translations', () => {
  const result = buildAlignment({ lessons, vocabulary: [
    { language_id: 'patois', english_source: 'hello' },
  ] }, { ...curriculum, courseVocabulary: [...curriculum.courseVocabulary,
    { ...curriculum.courseVocabulary[0], localized: 'Hello' },
  ] });
  assert.equal(result.items[0].matchState, 'ambiguous');
  assert.equal(result.items[0].candidates.length, 2);
});
