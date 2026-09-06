'use strict';

function buildCorrectFeedback({ xpAwardStatus, answerLabel }) {
  if (xpAwardStatus === 'pending') {
    return {
      animationTone: 'saving',
      canContinue: false,
      message: 'Hold tight while your XP saves.',
      state: 'correct',
      title: 'Correct!',
      xpLabel: 'Saving +10 XP',
      answerLabel,
    };
  }
  if (xpAwardStatus === 'error') {
    return {
      animationTone: 'retry',
      canContinue: true,
      message: 'Your answer is right, but XP did not save yet.',
      state: 'correct',
      title: 'Correct!',
      xpLabel: 'Retry XP',
      answerLabel,
    };
  }
  if (xpAwardStatus === 'already-awarded') {
    return {
      animationTone: 'steady',
      canContinue: true,
      message: 'You already saved XP for this answer.',
      state: 'correct',
      title: 'Correct!',
      xpLabel: 'XP saved',
      answerLabel,
    };
  }
  return {
    animationTone: 'celebrate',
    canContinue: true,
    message: 'Nice work. Keep the streak moving.',
    state: 'correct',
    title: 'Correct!',
    xpLabel: xpAwardStatus === 'unavailable' ? '' : '+10 XP',
    answerLabel,
  };
}

function buildLessonFeedbackModel({
  answerLabel = '',
  feedback = null,
  finished = false,
  nextTopicTitle = '',
  topicTitle = '',
  xpAwardStatus = null,
} = {}) {
  if (finished) {
    return {
      animationTone: 'chapter-pop',
      canContinue: true,
      message: nextTopicTitle
        ? `You finished ${topicTitle}. Next up: ${nextTopicTitle}.`
        : `You finished ${topicTitle} and completed this chapter.`,
      state: 'complete',
      title: 'Lesson complete!',
      xpLabel: 'Path updated',
      answerLabel: '',
    };
  }
  if (feedback === 'correct') return buildCorrectFeedback({ xpAwardStatus, answerLabel });
  if (feedback === 'incorrect') {
    return {
      animationTone: 'shake',
      canContinue: true,
      message: 'No stress. Study the answer and try again.',
      state: 'incorrect',
      title: 'Almost',
      xpLabel: '',
      answerLabel,
    };
  }
  return {
    animationTone: 'idle',
    canContinue: false,
    message: '',
    state: 'idle',
    title: '',
    xpLabel: '',
    answerLabel,
  };
}

module.exports = {
  buildLessonFeedbackModel,
};
