'use strict';

function clean(value) {
  return String(value || '').normalize('NFC').trim();
}

function buildVocabularyCardPresentation(exercise = {}) {
  const localized = clean(exercise.localized);
  const meaning = clean(exercise.meaning);
  const pronunciation = clean(exercise.pronunciation);
  if (!localized || !meaning) {
    throw new Error('Vocabulary card requires localized and meaning text.');
  }

  return {
    eyebrow: 'NEW WORD',
    localized,
    meaningLabel: meaning,
    pronunciationLabel: pronunciation ? `Sounds like: ${pronunciation}` : null,
    accessibilityLabel: pronunciation
      ? `New word. ${localized} means ${meaning}. Pronunciation: ${pronunciation}.`
      : `New word. ${localized} means ${meaning}.`,
  };
}

module.exports = { buildVocabularyCardPresentation };
