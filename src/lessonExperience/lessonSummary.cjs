'use strict';

function createLessonSummary() {
  return { checkedAnswers: 0, correctAnswers: 0, rewards: {} };
}

function recordCheckedAnswer(state, correct) {
  return {
    ...state,
    checkedAnswers: state.checkedAnswers + 1,
    correctAnswers: state.correctAnswers + (correct === true ? 1 : 0),
  };
}

function recordSavedReward(state, rewardId, amount) {
  if (typeof rewardId !== 'string' || !rewardId || !Number.isSafeInteger(amount) || amount < 0) return state;
  if (Object.hasOwn(state.rewards, rewardId)) return state;
  return { ...state, rewards: { ...state.rewards, [rewardId]: amount } };
}

function presentLessonSummary(state) {
  return {
    accuracy: state.checkedAnswers ? Math.round(state.correctAnswers / state.checkedAnswers * 100) : null,
    checkedAnswers: state.checkedAnswers,
    mistakes: state.checkedAnswers - state.correctAnswers,
    savedXp: Object.values(state.rewards).reduce((total, amount) => total + amount, 0),
  };
}

module.exports = { createLessonSummary, recordCheckedAnswer, recordSavedReward, presentLessonSummary };
