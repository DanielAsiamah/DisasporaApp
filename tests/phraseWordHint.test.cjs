const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { buildCourseTopicExercises } = require('../src/lessonEngine/patoisLessonSteps.cjs');
const { buildPhraseWordHintModel } = require('../src/lessonExperience/phraseWordHint.cjs');

test('lesson exercises expose the verified translation in the direction being studied', () => {
  const exercises = buildCourseTopicExercises('swahili', 'getting-started');
  const targetToEnglish = exercises.find(({ id }) => id === 'swahili-getting-started-01-yes');
  const englishToTarget = exercises.find(({ id }) => id === 'swahili-getting-started-02-no');
  const sentenceBuild = exercises.find(({ type }) => type === 'sentence-build');
  const wordTray = exercises.find(({ type }) => type === 'word-tray');
  const matching = exercises.find(({ type }) => type === 'match-pairs');

  assert.deepEqual(
    [targetToEnglish.studyPhrase, targetToEnglish.studyTranslation],
    ['Ndiyo', 'yes']
  );
  assert.deepEqual(
    [englishToTarget.studyPhrase, englishToTarget.studyTranslation],
    ['no', 'Hapana']
  );
  assert.deepEqual(
    [sentenceBuild.studyPhrase, sentenceBuild.studyTranslation],
    ['nice to meet you', 'Nimefurahi kukutana nawe']
  );
  assert.deepEqual(
    [wordTray.studyPhrase, wordTray.studyTranslation],
    ['Hatujaonana kwa muda mrefu', 'long time no see']
  );
  assert.equal(matching.studyPhrase, undefined);
});

test('phrase hint model creates one tappable token per displayed word', () => {
  assert.deepEqual(buildPhraseWordHintModel({
    studyPhrase: 'Hatujaonana kwa muda mrefu',
    studyTranslation: 'long time no see',
  }), {
    direction: 'ltr',
    phrase: 'Hatujaonana kwa muda mrefu',
    tokens: ['Hatujaonana', 'kwa', 'muda', 'mrefu'],
    translation: 'long time no see',
  });
});

test('phrase hint model preserves punctuation and right-to-left presentation', () => {
  assert.deepEqual(buildPhraseWordHintModel({
    studyPhrase: 'مساء الخير؟',
    studyTranslation: 'Good afternoon?',
  }), {
    direction: 'rtl',
    phrase: 'مساء الخير؟',
    tokens: ['مساء', 'الخير؟'],
    translation: 'Good afternoon?',
  });
  assert.equal(buildPhraseWordHintModel({ studyPhrase: '', studyTranslation: 'missing' }), null);
});

test('lesson player renders accessible tappable words and a contextual translation bubble', () => {
  const source = fs.readFileSync(path.join(
    __dirname,
    '..',
    'src',
    'components',
    'mvp',
    'PatoisLessonModal.js'
  ), 'utf8');

  assert.match(source, /function PhraseWordHint\(/);
  assert.match(source, /accessibilityLabel=\{`Word \$\{token\}, show phrase translation`\}/);
  assert.match(source, /In this phrase/);
  assert.match(source, /phraseHint\.translation/);
  assert.match(source, /<PhraseWordHint exercise=\{exercise\} key=\{exercise\?\.id\}/);
});
