const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildLessonFeedbackModel,
} = require('../src/lessonExperience/lessonFeedbackModel.cjs');

test('finishing the available draft lessons does not claim the planned chapter is finished', () => {
  const result = buildLessonFeedbackModel({ finished: true, topicTitle: 'Greetings 2', hasMorePlannedLessons: true });
  assert.match(result.message, /available draft lessons/);
  assert.doesNotMatch(result.message, /completed this chapter/);
  assert.match(buildLessonFeedbackModel({ finished: true, topicTitle: 'Greetings 1', nextTopicTitle: 'Greetings 2', hasMorePlannedLessons: true }).message, /Next up: Greetings 2/);
});

test('lesson feedback gives distinct Airlearn-style states for correct XP outcomes', () => {
  assert.deepEqual(
    buildLessonFeedbackModel({ feedback: 'correct', xpAwardStatus: 'pending', answerLabel: 'mi deh yah' }),
    {
      animationTone: 'saving',
      canContinue: false,
      guideTone: 'celebrate',
      message: 'Hold tight while your XP saves.',
      state: 'correct',
      title: 'Correct!',
      xpLabel: 'Saving +10 XP',
      answerLabel: 'mi deh yah',
    }
  );

  assert.deepEqual(
    buildLessonFeedbackModel({ feedback: 'correct', xpAwardStatus: 'awarded', answerLabel: 'mi deh yah' }),
    {
      animationTone: 'celebrate',
      canContinue: true,
      guideTone: 'celebrate',
      message: 'Nice work. Keep the streak moving.',
      state: 'correct',
      title: 'Correct!',
      xpLabel: '+10 XP',
      answerLabel: 'mi deh yah',
    }
  );
});

test('lesson feedback supports retry, wrong answer, and completion states', () => {
  assert.deepEqual(
    buildLessonFeedbackModel({ feedback: 'correct', xpAwardStatus: 'error', answerLabel: 'all pairs matched' }),
    {
      animationTone: 'retry',
      canContinue: true,
      guideTone: 'celebrate',
      message: 'Your answer is right. XP is not confirmed yet; retry or keep practising without confirmed XP.',
      state: 'correct',
      title: 'Correct!',
      xpLabel: 'Retry XP',
      answerLabel: 'all pairs matched',
    }
  );

  assert.deepEqual(
    buildLessonFeedbackModel({ feedback: 'incorrect', answerLabel: 'good morning' }),
    {
      animationTone: 'shake',
      canContinue: true,
      guideTone: 'encourage',
      message: 'No stress. Study the answer and try again.',
      state: 'incorrect',
      title: 'Almost',
      xpLabel: '',
      answerLabel: 'good morning',
    }
  );

  assert.deepEqual(
    buildLessonFeedbackModel({ finished: true, topicTitle: 'Greetings', nextTopicTitle: 'Family' }),
    {
      animationTone: 'chapter-pop',
      canContinue: true,
      guideTone: 'celebrate',
      message: 'You finished Greetings. Next up: Family.',
      state: 'complete',
      title: 'Lesson complete!',
      xpLabel: 'Path updated',
      answerLabel: '',
    }
  );
});
