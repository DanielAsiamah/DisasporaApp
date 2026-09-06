const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildLessonFeedbackModel,
} = require('../src/lessonExperience/lessonFeedbackModel.cjs');

test('lesson feedback gives distinct Airlearn-style states for correct XP outcomes', () => {
  assert.deepEqual(
    buildLessonFeedbackModel({ feedback: 'correct', xpAwardStatus: 'pending', answerLabel: 'mi deh yah' }),
    {
      animationTone: 'saving',
      canContinue: false,
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
      message: 'Your answer is right, but XP did not save yet.',
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
      message: 'You finished Greetings. Next up: Family.',
      state: 'complete',
      title: 'Lesson complete!',
      xpLabel: 'Path updated',
      answerLabel: '',
    }
  );
});
