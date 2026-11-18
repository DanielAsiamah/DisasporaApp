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

test('every available Igbo lesson uses only same-course mapped artwork for two visual questions', () => {
  const mappedConceptIds = new Set([
    'igbo_u01_01_hello',
    'igbo_u01_02_good_morning',
    'igbo_u01_03_good_afternoon',
    'igbo_u01_04_good_evening',
    'igbo_u01_05_good_night',
    'igbo_u01_06_goodbye',
    'igbo_u01_07_see_you_later',
    'igbo_u01_08_welcome',
    'igbo_u01_09_how_are_you',
    'igbo_u01_10_i_am_fine',
    'igbo_u01_11_whats_up',
    'igbo_u01_12_nice_to_meet_you',
  ]);
  for (const topicId of ['igbo_u01_l01', 'igbo_u01_l02', 'igbo_u01_l03', 'igbo_u01_l04']) {
    const exercises = buildCourseTopicExercises('igbo', topicId, {
      hasAudio: () => false,
      hasImage: conceptId => mappedConceptIds.has(conceptId),
    });
    const visuals = exercises.filter(({ type }) => type === LESSON_EXERCISE_TYPES.IMAGE_CHOICE);

    assert.equal(visuals.length, 2, `${topicId} should contain two visual questions`);
    assert.equal(new Set(visuals.map(({ answer }) => answer)).size, 2);
    for (const visual of visuals) {
      assert.equal(visual.imageChoices.length, 4);
      assert.ok(visual.imageChoices.every(({ conceptId }) => mappedConceptIds.has(conceptId)));
      assert.equal(new Set(visual.imageChoices.map(({ conceptId }) => conceptId)).size, 4);
    }
  }
});

test('visual generation deduplicates repeated source steps for the same concept', () => {
  const concepts = [
    { id: 'one', meaning: 'one' },
    { id: 'two', meaning: 'two' },
    { id: 'three', meaning: 'three' },
    { id: 'four', meaning: 'four' },
  ];
  const vocabulary = concepts.map(({ id, meaning }) => ({
    courseId: 'fixture-course',
    conceptId: id,
    localized: `target ${meaning}`,
  }));
  const lessonSteps = [
    { courseId: 'fixture-course', topicId: 'fixture-topic', id: 'step-one-a', order: 1, exerciseType: 'translate-to-meaning', conceptId: 'one', conceptRefs: ['one'], answer: 'one', distractors: ['two', 'three', 'four'] },
    { courseId: 'fixture-course', topicId: 'fixture-topic', id: 'step-one-b', order: 2, exerciseType: 'translate-to-target', conceptId: 'one', conceptRefs: ['one'], answer: 'target one', distractors: ['target two', 'target three', 'target four'] },
    { courseId: 'fixture-course', topicId: 'fixture-topic', id: 'step-two', order: 3, exerciseType: 'translate-to-meaning', conceptId: 'two', conceptRefs: ['two'], answer: 'two', distractors: ['one', 'three', 'four'] },
  ];

  const visuals = buildCourseTopicExercises('fixture-course', 'fixture-topic', {
    concepts,
    vocabulary,
    lessonSteps,
    hasImage: () => true,
  }).filter(({ type }) => type === LESSON_EXERCISE_TYPES.IMAGE_CHOICE);

  assert.equal(visuals.length, 2);
  assert.equal(new Set(visuals.map(({ answer }) => answer)).size, 2);
});

test('a small topic can reinforce a second verified course image without inventing content', () => {
  const concepts = [
    { id: 'one', meaning: 'one' },
    { id: 'two', meaning: 'two' },
    { id: 'three', meaning: 'three' },
    { id: 'four', meaning: 'four' },
  ];
  const vocabulary = concepts.map(({ id, meaning }) => ({
    courseId: 'fixture-course',
    conceptId: id,
    localized: `target ${meaning}`,
  }));
  const lessonSteps = [
    { courseId: 'fixture-course', topicId: 'fixture-topic', id: 'step-one', order: 1, exerciseType: 'translate-to-meaning', conceptId: 'one', conceptRefs: ['one'], answer: 'one', distractors: ['two', 'three', 'four'] },
  ];

  const visuals = buildCourseTopicExercises('fixture-course', 'fixture-topic', {
    concepts,
    vocabulary,
    lessonSteps,
    hasImage: () => true,
  }).filter(({ type }) => type === LESSON_EXERCISE_TYPES.IMAGE_CHOICE);

  assert.equal(visuals.length, 2);
  assert.equal(new Set(visuals.map(({ answer }) => answer)).size, 2);
  assert.ok(visuals.every(({ answer }) => vocabulary.some(({ conceptId }) => conceptId === answer)));
});

test('an unknown topic cannot synthesize visual lessons from course-wide artwork', () => {
  const concepts = [
    { id: 'one', meaning: 'one' },
    { id: 'two', meaning: 'two' },
    { id: 'three', meaning: 'three' },
    { id: 'four', meaning: 'four' },
  ];
  const vocabulary = concepts.map(({ id, meaning }) => ({
    courseId: 'fixture-course',
    conceptId: id,
    localized: `target ${meaning}`,
  }));

  assert.deepEqual(buildCourseTopicExercises('fixture-course', 'missing-topic', {
    concepts,
    vocabulary,
    lessonSteps: [],
    hasImage: () => true,
  }), []);
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
