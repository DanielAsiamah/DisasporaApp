const test = require('node:test');
const assert = require('node:assert/strict');

const { GENERATED_CURRICULUM } = require('../src/data/generatedCurriculum.cjs');
const {
  LESSON_EXERCISE_TYPES,
  buildCourseTopicExercises,
} = require('../src/lessonEngine/patoisLessonSteps.cjs');
const {
  createExerciseResponse,
  evaluateExerciseResponse,
  isResponseReady,
  selectMatchItem,
  toggleWordBankItem,
} = require('../src/lessonEngine/patoisLessonSession.cjs');

const swahiliVocabulary = GENERATED_CURRICULUM.courseVocabulary
  .filter(({ courseId }) => courseId === 'swahili');
const swahiliTopics = GENERATED_CURRICULUM.topics
  .filter(({ courseId }) => courseId === 'swahili')
  .sort((left, right) => left.order - right.order);

function completeCorrectly(exercise) {
  let response = createExerciseResponse(exercise);
  assert.equal(isResponseReady(exercise, response), false, `${exercise.id} starts unanswered`);

  if (exercise.type === LESSON_EXERCISE_TYPES.MATCH_PAIRS) {
    for (const pair of exercise.pairs) {
      const left = exercise.leftItems.find(({ pairId }) => pairId === pair.conceptId);
      const right = exercise.rightItems.find(({ pairId }) => pairId === pair.conceptId);
      const selected = selectMatchItem(response, { ...left, side: 'left' });
      assert.equal(selected.status, 'selected', `${exercise.id} selects ${pair.conceptId}`);
      const matched = selectMatchItem(selected.response, { ...right, side: 'right' });
      assert.equal(matched.status, 'matched', `${exercise.id} accepts ${pair.conceptId}`);
      response = matched.response;
    }
  } else if ([
    LESSON_EXERCISE_TYPES.SENTENCE_BUILD,
    LESSON_EXERCISE_TYPES.WORD_TRAY,
  ].includes(exercise.type)) {
    const unusedIndexes = new Set(exercise.wordBank.map((_, index) => index));
    for (const token of exercise.answerTokens) {
      const index = [...unusedIndexes].find((candidate) => exercise.wordBank[candidate] === token);
      assert.notEqual(index, undefined, `${exercise.id} exposes answer token ${token}`);
      response = toggleWordBankItem(response, { index, value: exercise.wordBank[index] });
      unusedIndexes.delete(index);
    }
  } else {
    assert.ok(exercise.choices.includes(exercise.answer), `${exercise.id} exposes the correct choice`);
    response = { selectedChoice: exercise.answer };
  }

  assert.equal(isResponseReady(exercise, response), true, `${exercise.id} becomes ready`);
  assert.equal(evaluateExerciseResponse(exercise, response), true, `${exercise.id} accepts its correct answer`);
}

test('the complete hidden Swahili journey is answerable and silent', () => {
  const exercises = swahiliTopics.flatMap((topic) => (
    buildCourseTopicExercises('swahili', topic.id, {
      vocabulary: swahiliVocabulary,
      hasAudio: () => false,
    })
  ));

  assert.equal(swahiliTopics.length, 9);
  assert.equal(exercises.length, 64);
  assert.ok(exercises.every(({ type }) => type !== LESSON_EXERCISE_TYPES.LISTEN_CHOICE));
  assert.ok(exercises.every(({ audioPath, voiceId }) => !audioPath && !voiceId));

  for (const exercise of exercises) completeCorrectly(exercise);
});
