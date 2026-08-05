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

test('Swahili derives the complete silent interaction flow from the verified course vocabulary', () => {
  const exercises = buildCourseTopicExercises('swahili', 'getting-started', {
    vocabulary: swahiliVocabulary,
    hasAudio: () => false,
  });

  assert.equal(exercises.length, 6);
  assert.deepEqual(exercises.map(({ type }) => type), [
    LESSON_EXERCISE_TYPES.TRANSLATE_CHOICE,
    LESSON_EXERCISE_TYPES.SENTENCE_BUILD,
    LESSON_EXERCISE_TYPES.MATCH_PAIRS,
    LESSON_EXERCISE_TYPES.WORD_TRAY,
    LESSON_EXERCISE_TYPES.TRANSLATE_CHOICE,
    LESSON_EXERCISE_TYPES.TRANSLATE_CHOICE,
  ]);
  assert.equal(exercises[0].prompt, 'What does "Ndiyo" mean?');
  assert.equal(exercises[1].answer, 'Hapana');
  assert.match(exercises[1].title, /Swahili phrase/);
  assert.ok(exercises[2].pairs.some(({ localized, meaning }) => localized === 'Labda' && meaning === 'maybe'));
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
