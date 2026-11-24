const test = require('node:test');
const assert = require('node:assert/strict');

const { CONCEPTS, TOPICS } = require('../src/data/curriculumContract.cjs');
const { JAMAICAN_PATOIS_VOCABULARY } = require('../src/data/jamaicanPatoisVocabulary.cjs');
const {
  LESSON_EXERCISE_TYPES,
  buildPatoisTopicExercises,
  materializeCourseLessonSteps,
  tokenizeAnswer,
} = require('../src/lessonEngine/patoisLessonSteps.cjs');

test('the starter topic keeps rich silent interactions without forcing an obvious translation card', () => {
  const exercises = buildPatoisTopicExercises('getting-started', {
    concepts: CONCEPTS,
    vocabulary: JAMAICAN_PATOIS_VOCABULARY,
    hasAudio: () => false,
  });
  const types = new Set(exercises.map(({ type }) => type));

  assert.ok(types.has(LESSON_EXERCISE_TYPES.MATCH_PAIRS));
  assert.ok(types.has(LESSON_EXERCISE_TYPES.SENTENCE_BUILD));
  assert.ok(types.has(LESSON_EXERCISE_TYPES.WORD_TRAY));
  assert.ok(!types.has(LESSON_EXERCISE_TYPES.TRANSLATE_CHOICE));
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

test('teaching topics retain distinctive primary coverage without forcing obvious English quizzes', () => {
  const primaryConceptIds = TOPICS.filter(({ type }) => type === 'lesson').flatMap(({ id }) =>
    buildPatoisTopicExercises(id, {
      concepts: CONCEPTS,
      vocabulary: JAMAICAN_PATOIS_VOCABULARY,
      hasAudio: () => false,
    })
      .filter(({ primary }) => primary)
      .map(({ conceptId }) => conceptId)
  );

  const usefulConcepts = CONCEPTS.filter(concept => {
    const row = JAMAICAN_PATOIS_VOCABULARY.find(row => row.conceptId === concept.id);
    return row.localized.toLowerCase() !== concept.meaning.toLowerCase()
      && !['yes', 'no', 'maybe', 'okay', 'again'].includes(concept.id);
  });
  assert.equal(primaryConceptIds.length, usefulConcepts.length);
  assert.deepEqual([...new Set(primaryConceptIds)].sort(), usefulConcepts.map(({ id }) => id).sort());
});

test('the introductory topic progresses to workbook-backed phrases instead of Again-to-again', () => {
  const exercises = buildPatoisTopicExercises('getting-started');
  assert.ok(!exercises.some(exercise => exercise.conceptId === 'again'));
  assert.ok(!exercises.some(exercise => (
    exercise.type === LESSON_EXERCISE_TYPES.TRANSLATE_CHOICE
    && exercise.conceptId === 'yes'
  )));
  const builds = exercises.filter(exercise => exercise.answerTokens);
  assert.ok(builds.length >= 2);
  assert.ok(builds.every(exercise => exercise.answerTokens.length >= 3));
  const matching = exercises.find(exercise => exercise.type === 'match-pairs');
  assert.ok(matching.pairs.every(pair => tokenizeAnswer(pair.localized).length >= 2));
  assert.ok(exercises.some(exercise => exercise.sourceStepId.includes('easy-greetings')));
  assert.equal(new Set(exercises.map(exercise => exercise.id)).size, exercises.length);
});

test('near-English starter words stay in contextual practice instead of standalone translation cards', () => {
  const exercises = buildPatoisTopicExercises('getting-started', {
    concepts: CONCEPTS,
    vocabulary: JAMAICAN_PATOIS_VOCABULARY,
    hasAudio: () => false,
  });
  const isolatedConceptIds = exercises
    .filter(({ type }) => type === LESSON_EXERCISE_TYPES.TRANSLATE_CHOICE)
    .map(({ conceptId }) => conceptId);
  const sourceSteps = materializeCourseLessonSteps('jamaican-patois', {
    concepts: CONCEPTS,
    vocabulary: JAMAICAN_PATOIS_VOCABULARY,
  });

  assert.ok(!isolatedConceptIds.includes('yes'));
  assert.ok(!isolatedConceptIds.includes('no'));
  assert.ok(!isolatedConceptIds.includes('maybe'));
  assert.ok(sourceSteps.some(({ conceptId }) => conceptId === 'yes'));
});

test('Patois matching omits near-English pairs instead of padding weak cards', () => {
  const lowValueConceptIds = new Set(['yes', 'no', 'maybe', 'okay', 'again']);
  const matches = TOPICS.flatMap(({ id }) => buildPatoisTopicExercises(id, {
    concepts: CONCEPTS,
    vocabulary: JAMAICAN_PATOIS_VOCABULARY,
    hasAudio: () => false,
  }).filter(({ type }) => type === LESSON_EXERCISE_TYPES.MATCH_PAIRS));

  assert.ok(matches.length > 0);
  for (const exercise of matches) {
    assert.ok(exercise.pairs.length >= 2, `${exercise.id} should not render an undersized match card`);
    for (const pair of exercise.pairs) {
      assert.notEqual(pair.localized.toLowerCase(), pair.meaning.toLowerCase());
      assert.equal(lowValueConceptIds.has(pair.conceptId), false);
    }
  }
  assert.equal(
    buildPatoisTopicExercises('family-members').some(({ type }) => type === LESSON_EXERCISE_TYPES.MATCH_PAIRS),
    false
  );
});

test('image choice is generated only from a complete set of mapped workbook concepts', () => {
  const mappedConceptIds = new Set(['good-afternoon', 'nice-to-meet-you', 'long-time-no-see', 'how-is-your-day']);
  const withImages = buildPatoisTopicExercises('easy-greetings', {
    concepts: CONCEPTS,
    vocabulary: JAMAICAN_PATOIS_VOCABULARY,
    hasAudio: () => false,
    hasImage: conceptId => mappedConceptIds.has(conceptId),
  });
  const withoutEnoughImages = buildPatoisTopicExercises('easy-greetings', {
    concepts: CONCEPTS,
    vocabulary: JAMAICAN_PATOIS_VOCABULARY,
    hasAudio: () => false,
    hasImage: conceptId => conceptId === 'good-afternoon',
  });
  const imageChoice = withImages.find(({ type }) => type === LESSON_EXERCISE_TYPES.IMAGE_CHOICE);

  assert.ok(imageChoice);
  assert.equal(imageChoice.answer, 'good-afternoon');
  assert.equal(imageChoice.answerLabel, 'good afternoon');
  assert.equal(imageChoice.imageChoices.length, 4);
  assert.equal(new Set(imageChoice.imageChoices.map(({ conceptId }) => conceptId)).size, 4);
  assert.ok(imageChoice.imageChoices.every(({ conceptId, imageConceptId, label }) => (
    conceptId === imageConceptId && mappedConceptIds.has(conceptId) && label
  )));
  const imageChoiceIndex = withImages.indexOf(imageChoice);
  const studyCard = withImages[imageChoiceIndex - 1];
  assert.equal(studyCard.type, LESSON_EXERCISE_TYPES.VOCABULARY_CARD);
  assert.equal(studyCard.conceptId, imageChoice.conceptId);
  assert.equal(studyCard.sourceStepId, imageChoice.sourceStepId);
  assert.deepEqual({
    imageConceptId: studyCard.imageConceptId,
    localized: studyCard.localized,
    meaning: studyCard.meaning,
  }, {
    imageConceptId: 'good-afternoon',
    localized: 'Gud aftanuun',
    meaning: 'good afternoon',
  });
  assert.equal(withoutEnoughImages.some(({ type }) => type === LESSON_EXERCISE_TYPES.IMAGE_CHOICE), false);
  assert.equal(withoutEnoughImages.some(({ type }) => type === LESSON_EXERCISE_TYPES.VOCABULARY_CARD), false);

  for (const missing of ['meaning', 'localized']) {
    const steps = buildPatoisTopicExercises('easy-greetings', {
      concepts: CONCEPTS.map(concept => missing === 'meaning' && concept.id === 'good-afternoon'
        ? { ...concept, meaning: '  ' } : concept),
      vocabulary: JAMAICAN_PATOIS_VOCABULARY.map(row => missing === 'localized' && row.conceptId === 'good-afternoon'
        ? { ...row, localized: '  ' } : row),
      hasImage: conceptId => mappedConceptIds.has(conceptId),
    });
    assert.ok(steps.every(({ type }) => ![LESSON_EXERCISE_TYPES.IMAGE_CHOICE, LESSON_EXERCISE_TYPES.VOCABULARY_CARD].includes(type)),
      `Incomplete ${missing} must not count toward a four-picture set`);
  }
});

test('every Patois topic receives two distinct visual questions without losing its richer build exercises', () => {
  const topicIds = TOPICS.map(({ id }) => id);
  for (const topicId of topicIds) {
    const withoutImages = buildPatoisTopicExercises(topicId, {
      concepts: CONCEPTS,
      vocabulary: JAMAICAN_PATOIS_VOCABULARY,
      hasAudio: () => false,
      hasImage: () => false,
    });
    const withImages = buildPatoisTopicExercises(topicId, {
      concepts: CONCEPTS,
      vocabulary: JAMAICAN_PATOIS_VOCABULARY,
      hasAudio: () => false,
      hasImage: () => true,
    });
    const imageChoices = withImages.filter(({ type }) => type === LESSON_EXERCISE_TYPES.IMAGE_CHOICE);
    const studyCards = withImages.filter(({ type }) => type === LESSON_EXERCISE_TYPES.VOCABULARY_CARD);

    assert.equal(imageChoices.length, 2, `${topicId} should contain two visual questions`);
    assert.equal(studyCards.length, imageChoices.length, `${topicId} should teach each visual concept first`);
    assert.equal(
      new Set(imageChoices.map(({ answer }) => answer)).size,
      2,
      `${topicId} should teach two distinct visual concepts`
    );
    assert.ok(
      imageChoices.every(({ imageChoices: choices }) => choices.length === 4),
      `${topicId} should contain four mapped pictures per visual question`
    );
    for (const imageChoice of imageChoices) {
      const choiceIndex = withImages.indexOf(imageChoice);
      assert.equal(withImages[choiceIndex - 1]?.type, LESSON_EXERCISE_TYPES.VOCABULARY_CARD);
      assert.equal(withImages[choiceIndex - 1]?.conceptId, imageChoice.conceptId);
    }
    for (const buildType of [LESSON_EXERCISE_TYPES.SENTENCE_BUILD, LESSON_EXERCISE_TYPES.WORD_TRAY]) {
      assert.ok(
        withImages.filter(({ type }) => type === buildType).length
          >= withoutImages.filter(({ type }) => type === buildType).length,
        `${topicId} should retain ${buildType}`
      );
    }
  }
});

test('exercise generation is deterministic and match pairs never duplicate concepts', () => {
  const options = {
    concepts: CONCEPTS,
    vocabulary: JAMAICAN_PATOIS_VOCABULARY,
    hasAudio: () => false,
  };
  const first = buildPatoisTopicExercises('easy-greetings', options);
  const second = buildPatoisTopicExercises('easy-greetings', options);
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
