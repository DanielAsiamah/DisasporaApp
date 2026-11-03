const MAX_SAVED_MISTAKES = 50;
const MAX_REVIEW_EXERCISES = 6;

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeMistake(record) {
  const exerciseId = normalizeText(record?.exerciseId);
  const topicId = normalizeText(record?.topicId);
  if (!exerciseId || !topicId) return null;
  return {
    exerciseId,
    lastMissedAt: Math.max(0, Number(record?.lastMissedAt ?? record?.occurredAt) || 0),
    misses: Math.max(1, Math.floor(Number(record?.misses) || 1)),
    topicId,
  };
}

function mergeMistakeQueues(...queues) {
  const merged = new Map();
  for (const queue of queues) {
    if (!Array.isArray(queue)) continue;
    for (const candidate of queue) {
      const record = normalizeMistake(candidate);
      if (!record) continue;
      const current = merged.get(record.exerciseId);
      if (!current) {
        merged.set(record.exerciseId, record);
        continue;
      }
      if (current.topicId !== record.topicId) continue;
      merged.set(record.exerciseId, {
        ...current,
        lastMissedAt: Math.max(current.lastMissedAt, record.lastMissedAt),
        misses: Math.max(current.misses, record.misses),
      });
    }
  }
  return [...merged.values()]
    .sort((left, right) => left.lastMissedAt - right.lastMissedAt)
    .slice(-MAX_SAVED_MISTAKES);
}

function recordPersistentMistake(queue, mistake) {
  const incoming = normalizeMistake(mistake);
  if (!incoming) return mergeMistakeQueues(queue);
  const existing = mergeMistakeQueues(queue);
  const current = existing.find((record) => record.exerciseId === incoming.exerciseId);
  const next = current
    ? existing.map((record) => record.exerciseId === incoming.exerciseId ? {
        ...record,
        lastMissedAt: Math.max(record.lastMissedAt, incoming.lastMissedAt),
        misses: record.misses + 1,
      } : record)
    : [...existing, incoming];
  return mergeMistakeQueues(next);
}

function buildAdaptiveReviewTopic({ courseId, exercisesByTopic, mistakeQueue, topics } = {}) {
  if (!normalizeText(courseId) || !(exercisesByTopic instanceof Map)) return null;
  const topicById = new Map((Array.isArray(topics) ? topics : []).map((topic) => [topic.id, topic]));
  const exerciseLookup = new Map();
  for (const [topicId, exercises] of exercisesByTopic) {
    for (const exercise of Array.isArray(exercises) ? exercises : []) {
      if (exercise?.id) exerciseLookup.set(`${topicId}:${exercise.id}`, exercise);
    }
  }
  const selected = mergeMistakeQueues(mistakeQueue)
    .map((mistake) => ({
      exercise: exerciseLookup.get(`${mistake.topicId}:${mistake.exerciseId}`),
      mistake,
    }))
    .filter(({ exercise }) => Boolean(exercise))
    .sort((left, right) => (
      right.mistake.misses - left.mistake.misses
      || right.mistake.lastMissedAt - left.mistake.lastMissedAt
    ))
    .slice(0, MAX_REVIEW_EXERCISES);
  if (!selected.length) return null;

  const firstTopic = topicById.get(selected[0].mistake.topicId);
  const highestOrder = Math.max(0, ...(Array.isArray(topics) ? topics : []).map((topic) => Number(topic.order) || 0));
  return {
    awardsXp: true,
    courseId,
    exerciseOverrides: selected.map(({ exercise }) => exercise),
    guide: firstTopic?.guide || topics?.[0]?.guide || 'Kai',
    id: `${courseId}-personalised-review`,
    isAdaptiveReview: true,
    order: highestOrder + 1,
    reviewExerciseIds: selected.map(({ mistake }) => mistake.exerciseId),
    sourceTopicIdByExerciseId: Object.fromEntries(selected.map(({ mistake }) => [
      mistake.exerciseId,
      mistake.topicId,
    ])),
    title: 'Personalised review',
    type: 'review',
  };
}

function resolveAdaptiveReview(queue, reviewedExerciseIds, missedExerciseIds = []) {
  const reviewed = new Set(Array.isArray(reviewedExerciseIds) ? reviewedExerciseIds : []);
  const missed = new Set(Array.isArray(missedExerciseIds) ? missedExerciseIds : []);
  return mergeMistakeQueues(queue).filter(({ exerciseId }) => (
    !reviewed.has(exerciseId) || missed.has(exerciseId)
  ));
}

module.exports = {
  buildAdaptiveReviewTopic,
  mergeMistakeQueues,
  recordPersistentMistake,
  resolveAdaptiveReview,
};
