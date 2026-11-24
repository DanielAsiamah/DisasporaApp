const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildVocabularyCardPresentation,
} = require('../src/lessonExperience/vocabularyCardPresentation.cjs');

test('vocabulary card presentation teaches the target form, meaning, and pronunciation', () => {
  assert.deepEqual(buildVocabularyCardPresentation({
    localized: '  Gud aftanuun  ',
    meaning: ' good afternoon ',
    pronunciation: ' gud af-ta-noon ',
  }), {
    eyebrow: 'NEW WORD',
    localized: 'Gud aftanuun',
    meaningLabel: 'good afternoon',
    pronunciationLabel: 'Sounds like: gud af-ta-noon',
    accessibilityLabel: 'New word. Gud aftanuun means good afternoon. Pronunciation: gud af-ta-noon.',
  });
});

test('vocabulary card presentation omits absent pronunciation without blank copy', () => {
  assert.deepEqual(buildVocabularyCardPresentation({
    localized: 'Karibu',
    meaning: 'welcome',
    pronunciation: '   ',
  }), {
    eyebrow: 'NEW WORD',
    localized: 'Karibu',
    meaningLabel: 'welcome',
    pronunciationLabel: null,
    accessibilityLabel: 'New word. Karibu means welcome.',
  });
});

test('vocabulary card presentation rejects incomplete language data', () => {
  assert.throws(
    () => buildVocabularyCardPresentation({ localized: '', meaning: 'welcome' }),
    /localized and meaning/i
  );
  assert.throws(
    () => buildVocabularyCardPresentation({ localized: 'Karibu', meaning: '' }),
    /localized and meaning/i
  );
});
