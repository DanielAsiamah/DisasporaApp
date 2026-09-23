'use strict';

function recordMistake(ids, exerciseId) {
  if (typeof exerciseId !== 'string' || !exerciseId || ids.includes(exerciseId)) return ids;
  return [...ids, exerciseId];
}

function buildMistakeReview(exercises, ids) {
  const missed = new Set(ids);
  return exercises.filter(exercise => missed.has(exercise.id));
}

module.exports = { recordMistake, buildMistakeReview };
