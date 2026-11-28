const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { buildCourseTopicExercises } = require('../src/lessonEngine/patoisLessonSteps.cjs');
const { buildPhraseWordHintModel } = require('../src/lessonExperience/phraseWordHint.cjs');
const { getRuntimeCurriculum } = require('../src/data/runtimeCurriculum.cjs');

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
  assert.deepEqual(
    [matching.studyPhrase, matching.studyTranslation],
    [matching.pairs[0].localized, matching.pairs[0].meaning]
  );
});

test('unaligned phrases offer a single complete translation', () => {
  assert.deepEqual(buildPhraseWordHintModel({
    studyPhrase: 'Hatujaonana kwa muda mrefu',
    studyTranslation: 'long time no see',
  }), {
    direction: 'ltr',
    phrase: 'Hatujaonana kwa muda mrefu',
    segments: [{ text: 'Hatujaonana kwa muda mrefu', meaning: 'long time no see' }],
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
    segments: [{ text: 'مساء الخير؟', meaning: 'Good afternoon?' }],
    translation: 'Good afternoon?',
  });
  assert.equal(buildPhraseWordHintModel({ studyPhrase: '', studyTranslation: 'missing' }), null);
});

test('phrase hints use the selected course, concept, and direction to translate each unit', () => {
  const exercise = { conceptId: 'nice-to-meet-you', studyPhrase: 'nice to meet you', studyTranslation: 'Nice fi meet yuh' };
  const model = buildPhraseWordHintModel(exercise, 'jamaican-patois');
  assert.deepEqual(model.segments.map(unit => unit.meaning), ['Nice', 'fi', 'meet', 'yuh']);
  assert.equal(buildPhraseWordHintModel({
    ...exercise, studyPhrase: exercise.studyTranslation, studyTranslation: exercise.studyPhrase,
  }, 'jamaican-patois').segments.at(-1).meaning, 'you');
  assert.equal(buildPhraseWordHintModel(exercise, 'swahili').segments.length, 1);
  assert.equal(buildPhraseWordHintModel({ ...exercise, studyTranslation: 'Changed source text' }, 'jamaican-patois').segments.length, 1);
});

test('matching uses its first pair and preserves contextual pronouns and unmapped words', () => {
  const m = (conceptId, studyPhrase, studyTranslation) => buildPhraseWordHintModel({
    type: 'match-pairs', pairs: [{ conceptId }], studyPhrase, studyTranslation,
  }, 'jamaican-patois');
  assert.equal(m('my-name-is', 'Mi name...', 'my name is...').segments[0].meaning, 'my');
  assert.equal(m('i-speak', 'Mi talk...', 'I speak...').segments[0].meaning, 'I');
  const units = m('long-time-no-see', 'Long time mi nuh see yuh', 'long time no see').segments;
  assert.equal(units.find(u => u.text === 'mi').meaning, null);
  assert.equal(units.find(u => u.text === 'nuh').meaning, 'no');
});

test('the Swahili greeting leaves nice unglossed and groups to meet', () => {
  const hint = buildPhraseWordHintModel({
    conceptId: 'nice-to-meet-you', studyPhrase: 'nice to meet you', studyTranslation: 'Nimefurahi kukutana nawe',
  }, 'swahili');
  assert.deepEqual(hint.segments.slice(0, 2), [{ text: 'nice', meaning: null }, { text: 'to meet', meaning: 'kukutana' }]);
});

test('picture questions always show hints for the target-language prompt', () => {
  const quizzes = buildCourseTopicExercises('jamaican-patois', 'easy-greetings', { hasImage: () => true })
    .filter(e => e.type === 'image-choice');
  assert.equal(quizzes.length, 2);
  for (const quiz of quizzes) {
    assert.ok(quiz.prompt.includes('“' + quiz.studyPhrase + '”'), quiz.prompt);
    assert.equal(quiz.studyTranslation, quiz.answerLabel);
  }
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
  assert.match(source, /Meaning of \$\{segment\.text\}/);
  assert.match(source, /accessibilityState=\{\{ expanded: selectedIndex === index \}\}/);
  assert.match(source, /getAnswerTextDirection\(selected\.meaning\)/);
  assert.match(source, /<PhraseWordHint exercise=\{exercise\} courseId=\{runtimeCourseId\} key=\{exercise\?\.id\}/);
});

test('each course alignment reconstructs its workbook pair and round-trips in both directions', () => {
  for (const courseId of ['jamaican-patois', 'swahili', 'wolof', 'haitian-creole', 'sudanese-arabic', 'igbo']) {
    const entries = require('../src/data/phraseAlignments/' + courseId + '.cjs');
    const curriculum = getRuntimeCurriculum(courseId);
    assert.ok(Object.keys(entries).length > 0, courseId);
    for (const [conceptId, [targetPattern, englishPattern, indices]] of Object.entries(entries)) {
      const tag = courseId + '/' + conceptId;
      const target = targetPattern.split('|');
      const english = englishPattern.split('|');
      const mapping = indices || target.map((_, index) => index);
      const row = curriculum.courseVocabulary.find(v => v.courseId === courseId && v.conceptId === conceptId);
      const meaning = curriculum.concepts.find(c => c.id === conceptId)?.meaning;
      assert.equal(target.join(' '), row?.localized, tag);
      assert.equal(english.join(' '), meaning, tag);
      assert.ok([...target, ...english].every(part => part && part === part.trim()), tag);
      assert.equal(mapping.length, target.length, tag);
      const mapped = mapping.filter(index => index !== null);
      assert.ok(mapped.length && mapped.every(index => Number.isInteger(index) && index >= 0 && index < english.length), tag);
      assert.equal(new Set(mapped).size, mapped.length, tag);
      const model = (studyPhrase, studyTranslation) => buildPhraseWordHintModel({ conceptId, studyPhrase, studyTranslation }, courseId);
      assert.deepEqual(model(row.localized, meaning).segments,
        target.map((text, i) => ({ text, meaning: english[mapping[i]] ?? null })), tag);
      assert.deepEqual(model(meaning, row.localized).segments,
        english.map((text, i) => ({ text, meaning: target[mapping.indexOf(i)] ?? null })), tag);
    }
  }
});
