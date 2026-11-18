const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildPracticeHubViewModel,
  getPracticeStartDestination,
} = require('../src/lessonExperience/practiceHubPresentation.cjs');

test('practice hub stays unavailable while saved progress loads', () => {
  assert.deepEqual(buildPracticeHubViewModel({ dueCount: 4 }), {
    canStart: false,
    countLabel: 'Checking saved practice',
    ctaLabel: 'PLEASE WAIT',
    message: 'Your saved mistakes and completed lessons are being prepared.',
    mode: 'loading',
    title: 'Preparing your practice',
  });
});

test('practice hub prioritises due mistakes with an honest count', () => {
  assert.deepEqual(buildPracticeHubViewModel({
    dueCount: 3,
    hasCompletedTopic: true,
    practiceTopicTitle: 'Personalised review',
    ready: true,
  }), {
    canStart: true,
    countLabel: '3 phrases due',
    ctaLabel: 'START REVIEW',
    message: 'Recall phrases from past mistakes and move them closer to mastery.',
    mode: 'due',
    title: 'Personalised review',
  });
});

test('practice hub offers an honest completed-topic replay when no mistakes are due', () => {
  assert.deepEqual(buildPracticeHubViewModel({
    dueCount: 0,
    hasCompletedTopic: true,
    practiceTopicTitle: 'Greetings and introductions',
    ready: true,
  }), {
    canStart: true,
    countLabel: 'Nothing due today',
    ctaLabel: 'REVIEW TOPIC',
    message: 'No saved mistakes are due. Replay a completed topic to keep it fresh.',
    mode: 'replay',
    title: 'Greetings and introductions',
  });
});

test('practice hub sends a new learner to their first lesson', () => {
  assert.deepEqual(buildPracticeHubViewModel({ ready: true }), {
    canStart: true,
    countLabel: 'Complete lesson one to begin',
    ctaLabel: 'GO TO LEARN',
    message: 'Your personalised practice queue grows from the mistakes you make in lessons.',
    mode: 'first-lesson',
    title: 'Practice starts after lesson one',
  });
});

test('practice hub rejects malformed counts and blank topic labels', () => {
  const presentation = buildPracticeHubViewModel({
    dueCount: 'many',
    hasCompletedTopic: true,
    practiceTopicTitle: '   ',
    ready: true,
  });

  assert.equal(presentation.mode, 'first-lesson');
  assert.equal(presentation.countLabel, 'Complete lesson one to begin');
});

test('practice start routing opens real review topics and returns new learners to Learn', () => {
  assert.equal(getPracticeStartDestination({ canStart: false, hasPracticeTopic: true, mode: 'due' }), 'none');
  assert.equal(getPracticeStartDestination({ canStart: true, hasPracticeTopic: true, mode: 'due' }), 'topic');
  assert.equal(getPracticeStartDestination({ canStart: true, hasPracticeTopic: true, mode: 'replay' }), 'topic');
  assert.equal(getPracticeStartDestination({ canStart: true, hasPracticeTopic: false, mode: 'first-lesson' }), 'learn');
  assert.equal(getPracticeStartDestination({ canStart: true, hasPracticeTopic: false, mode: 'due' }), 'learn');
});
