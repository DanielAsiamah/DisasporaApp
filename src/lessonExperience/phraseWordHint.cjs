'use strict';

const { getAnswerTextDirection } = require('./answerTextDirection.cjs');
const courseAlignments = {
  'jamaican-patois': require('../data/phraseAlignments/jamaican-patois.cjs'),
  swahili: require('../data/phraseAlignments/swahili.cjs'),
  wolof: require('../data/phraseAlignments/wolof.cjs'),
  'haitian-creole': require('../data/phraseAlignments/haitian-creole.cjs'),
  'sudanese-arabic': require('../data/phraseAlignments/sudanese-arabic.cjs'),
  igbo: require('../data/phraseAlignments/igbo.cjs'),
};

// The optional indices map each target unit to its English unit. A null index
// means that the workbook translation has no direct equivalent for that unit.
function alignPhrase(entry, phrase, translation) {
  if (!Array.isArray(entry)) return null;
  const [targetPattern, englishPattern, indices] = entry;
  const target = targetPattern.normalize('NFC').split('|');
  const english = englishPattern.normalize('NFC').split('|');
  const targetPhrase = target.join(' ');
  const englishPhrase = english.join(' ');
  const mapping = indices || target.map((_, index) => index);
  if (phrase === targetPhrase && translation === englishPhrase) {
    return target.map((text, index) => ({ text, meaning: english[mapping[index]] ?? null }));
  }
  if (phrase === englishPhrase && translation === targetPhrase) {
    return english.map((text, index) => ({ text, meaning: target[mapping.indexOf(index)] ?? null }));
  }
  return null;
}

function buildPhraseWordHintModel(exercise = {}, courseId) {
  const phrase = typeof exercise.studyPhrase === 'string' ? exercise.studyPhrase.trim().normalize('NFC') : '';
  const translation = typeof exercise.studyTranslation === 'string' ? exercise.studyTranslation.trim().normalize('NFC') : '';
  if (!phrase || !translation) return null;
  const conceptId = exercise.type === 'match-pairs' ? exercise.pairs?.[0]?.conceptId : exercise.conceptId;
  const entry = courseAlignments[courseId]?.[conceptId];
  return {
    direction: getAnswerTextDirection(phrase),
    phrase,
    segments: alignPhrase(entry, phrase, translation) || [{ text: phrase, meaning: translation }],
    translation,
  };
}

module.exports = { buildPhraseWordHintModel };
