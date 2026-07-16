const test = require('node:test');
const assert = require('node:assert/strict');

const { CONCEPTS, TOPICS } = require('../src/data/curriculumContract.cjs');
const { JAMAICAN_PATOIS_VOCABULARY } = require('../src/data/jamaicanPatoisVocabulary.cjs');
const {
  LESSON_EXERCISE_TYPES,
  buildPatoisTopicExercises,
  tokenizeAnswer,
} = require('../src/lessonEngine/patoisLessonSteps.cjs');

test('a standard Patois topic preserves every required silent MVP interaction', () => {
  const exercises = buildPatoisTopicExercises('getting-started', {
    concepts: CONCEPTS,
    vocabulary: JAMAICAN_PATOIS_VOCABULARY,
    hasAudio: () => false,
  });
  const types = new Set(exercises.map(({ type }) => type));

  assert.ok(types.has(LESSON_EXERCISE_TYPES.TRANSLATE_CHOICE));
  assert.ok(types.has(LESSON_EXERCISE_TYPES.MATCH_PAIRS));
  assert.ok(types.has(LESSON_EXERCISE_TYPES.SENTENCE_BUILD));
  assert.ok(types.has(LESSON_EXERCISE_TYPES.WORD_TRAY));
  assert.ok(!types.has(LESSON_EXERCISE_TYPES.LISTEN_CHOICE));
});

test('listening is included only for an available pre-generated clip', () => {
  const withoutAudio = buildPatoisTopicExercises('easy-greetings', {
    concepts: CONCEPTS,
    vocabulary: JAMAICAN_PATOIS_VOCABULARY,
    hasAudio: () => false,
  });
  const withAudio = buildPatoisTopicExercises('easy-greetings', {
    concepts: CONCEPTS,
    vocabulary: JAMAICAN_PATOIS_VOCABULARY,
    hasAudio: (conceptId) => conceptId === 'have-a-good-day',
  });

  assert.equal(withoutAudio.some(({ type }) => type === LESSON_EXERCISE_TYPES.LISTEN_CHOICE), false);
  assert.equal(withAudio.filter(({ type }) => type === LESSON_EXERCISE_TYPES.LISTEN_CHOICE).length, 1);
  assert.equal(withAudio.find(({ type }) => type === LESSON_EXERCISE_TYPES.LISTEN_CHOICE).conceptId, 'have-a-good-day');
});

test('the seven teaching topics cover all 39 concepts exactly once as their primary exercises', () => {
  const primaryConceptIds = TOPICS.filter(({ type }) => type === 'lesson').flatMap(({ id }) =>
    buildPatoisTopicExercises(id, {
      concepts: CONCEPTS,
      vocabulary: JAMAICAN_PATOIS_VOCABULARY,
      hasAudio: () => false,
    })
      .filter(({ primary }) => primary)
      .map(({ conceptId }) => conceptId)
  );

  assert.equal(primaryConceptIds.length, 39);
  assert.deepEqual([...new Set(primaryConceptIds)].sort(), CONCEPTS.map(({ id }) => id).sort());
});

test('exercise generation is deterministic and match pairs never duplicate concepts', () => {
  const options = {
    concepts: CONCEPTS,
    vocabulary: JAMAICAN_PATOIS_VOCABULARY,
    hasAudio: () => false,
  };
  const first = buildPatoisTopicExercises('family-members', options);
  const second = buildPatoisTopicExercises('family-members', options);
  const matching = first.find(({ type }) => type === LESSON_EXERCISE_TYPES.MATCH_PAIRS);

  assert.deepEqual(first, second);
  assert.equal(matching.pairs.length, 4);
  assert.equal(new Set(matching.pairs.map(({ conceptId }) => conceptId)).size, 4);
});

test('sentence and word-tray exercises expose the exact answer tokens', () => {
  const exercises = buildPatoisTopicExercises('introducing-yourself', {
    concepts: CONCEPTS,
    vocabulary: JAMAICAN_PATOIS_VOCABULARY,
    hasAudio: () => false,
  });

  for (const exercise of exercises.filter(({ type }) => [
    LESSON_EXERCISE_TYPES.SENTENCE_BUILD,
    LESSON_EXERCISE_TYPES.WORD_TRAY,
  ].includes(type))) {
    assert.deepEqual(exercise.answerTokens, tokenizeAnswer(exercise.answer));
    assert.ok(exercise.answerTokens.every((token) => exercise.wordBank.includes(token)));
  }
});
