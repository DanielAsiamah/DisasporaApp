const test = require('node:test');
const assert = require('node:assert/strict');

const { GENERATED_CURRICULUM } = require('../src/data/generatedCurriculum.cjs');
const {
  LESSON_EXERCISE_TYPES,
  buildCourseTopicExercises,
  buildPatoisTopicExercises,
  materializeCourseLessonSteps,
} = require('../src/lessonEngine/patoisLessonSteps.cjs');

const swahiliVocabulary = GENERATED_CURRICULUM.courseVocabulary
  .filter(({ courseId }) => courseId === 'swahili');
const igboVocabulary = GENERATED_CURRICULUM.courseVocabulary
  .filter(({ courseId }) => courseId === 'igbo');

test('Swahili derives the complete silent interaction flow from the verified course vocabulary', () => {
  const exercises = buildCourseTopicExercises('swahili', 'getting-started', {
    vocabulary: swahiliVocabulary,
    hasAudio: () => false,
  });

  assert.equal(exercises.length, 8);
  assert.deepEqual(exercises.map(({ type }) => type), [
    LESSON_EXERCISE_TYPES.TRANSLATE_CHOICE,
    LESSON_EXERCISE_TYPES.TRANSLATE_CHOICE,
    LESSON_EXERCISE_TYPES.MATCH_PAIRS,
    LESSON_EXERCISE_TYPES.TRANSLATE_CHOICE,
    LESSON_EXERCISE_TYPES.TRANSLATE_CHOICE,
    LESSON_EXERCISE_TYPES.TRANSLATE_CHOICE,
    LESSON_EXERCISE_TYPES.SENTENCE_BUILD,
    LESSON_EXERCISE_TYPES.WORD_TRAY,
  ]);
  assert.equal(exercises[0].prompt, 'What does "Ndiyo" mean?');
  assert.equal(exercises[1].answer, 'Hapana');
  assert.match(exercises[1].prompt, /Swahili/);
  assert.ok(exercises[2].pairs.every(({ localized }) => localized.split(/\s+/).length >= 2));
  assert.equal(exercises[4].answer, 'Sawa');
  assert.equal(exercises[5].answer, 'again');
  assert.doesNotMatch(JSON.stringify(exercises), /\b(?:Nuh|Mebbe|Awright)\b/);
});

test('all nine Swahili topics are deterministic and contain exercises', () => {
  const topics = GENERATED_CURRICULUM.topics.filter(({ courseId }) => courseId === 'swahili');
  assert.equal(topics.length, 9);
  for (const topic of topics) {
    const first = buildCourseTopicExercises('swahili', topic.id, { vocabulary: swahiliVocabulary });
    const second = buildCourseTopicExercises('swahili', topic.id, { vocabulary: swahiliVocabulary });
    assert.ok(first.length > 0, topic.id);
    assert.deepEqual(first, second);
  }
});

test('silent course lessons do not repeat the same translation card when listening audio is unavailable', () => {
  const courseIds = [
    'jamaican-patois',
    'swahili',
    'wolof',
    'haitian-creole',
    'sudanese-arabic',
    'igbo',
  ];

  for (const courseId of courseIds) {
    const curriculum = require('../src/data/runtimeCurriculum.cjs').getRuntimeCurriculum(courseId);
    const topics = curriculum.topics.filter(topic => topic.courseId === courseId);

    for (const topic of topics) {
      const exercises = buildCourseTopicExercises(courseId, topic.id, {
        hasAudio: () => false,
      });
      const translationConceptIds = exercises
        .filter(({ type }) => type === LESSON_EXERCISE_TYPES.TRANSLATE_CHOICE)
        .map(({ conceptId }) => conceptId);

      assert.equal(
        new Set(translationConceptIds).size,
        translationConceptIds.length,
        `${courseId}/${topic.id} repeats a silent translation card`,
      );
    }
  }
});

test('a short Igbo lesson uses only same-course mapped artwork for its visual question', () => {
  const mappedConceptIds = new Set([
    'igbo_u01_01_hello',
    'igbo_u01_02_good_morning',
    'igbo_u01_03_good_afternoon',
    'igbo_u01_04_good_evening',
  ]);
  const exercises = buildCourseTopicExercises('igbo', 'igbo_u01_l01', {
    hasAudio: () => false,
    hasImage: conceptId => mappedConceptIds.has(conceptId),
  });
  const visual = exercises.find(({ type }) => type === LESSON_EXERCISE_TYPES.IMAGE_CHOICE);

  assert.ok(visual, 'the first Igbo lesson should contain a visual question');
  assert.equal(visual.imageChoices.length, 4);
  assert.ok(visual.imageChoices.every(({ conceptId }) => mappedConceptIds.has(conceptId)));
  assert.equal(new Set(visual.imageChoices.map(({ conceptId }) => conceptId)).size, 4);
});

test('Swahili lesson-step materialization is deterministic and workbook-ready', () => {
  const first = materializeCourseLessonSteps('swahili', { vocabulary: swahiliVocabulary });
  const second = materializeCourseLessonSteps('swahili', { vocabulary: swahiliVocabulary });

  assert.equal(first.length, 64);
  assert.deepEqual(first, second);
  assert.equal(new Set(first.map(({ topicId }) => topicId)).size, 9);
  assert.ok(first.every(({ id }) => id.startsWith('swahili-')));
  assert.ok(first.every(({ voiceId, publicationState }) => voiceId === '' && publicationState === 'unavailable'));
});

test('the Patois compatibility builder keeps its existing behaviour', () => {
  assert.deepEqual(
    buildPatoisTopicExercises('easy-greetings'),
    buildCourseTopicExercises('jamaican-patois', 'easy-greetings')
  );
});

test('a course without workbook lesson steps fails closed instead of inheriting Patois templates', () => {
  assert.deepEqual(
    materializeCourseLessonSteps('igbo', { vocabulary: igboVocabulary, lessonSteps: GENERATED_CURRICULUM.lessonSteps }),
    []
  );
  assert.deepEqual(
    buildCourseTopicExercises('igbo', 'getting-started', { vocabulary: igboVocabulary }),
    []
  );
});
