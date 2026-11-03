'use strict';

const { getAnswerTextDirection } = require('./answerTextDirection.cjs');

function buildPhraseWordHintModel(exercise = {}) {
  const phrase = typeof exercise.studyPhrase === 'string' ? exercise.studyPhrase.trim() : '';
  const translation = typeof exercise.studyTranslation === 'string'
    ? exercise.studyTranslation.trim()
    : '';
  if (!phrase || !translation) return null;

  return {
    direction: getAnswerTextDirection(phrase),
    phrase,
    tokens: phrase.split(/\s+/u),
    translation,
  };
}

module.exports = { buildPhraseWordHintModel };
