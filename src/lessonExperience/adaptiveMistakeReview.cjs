const MAX_SAVED_MISTAKES = 50;
const MAX_REVIEW_EXERCISES = 6;
const DAY_MS = 24 * 60 * 60 * 1000;
const MASTERY_REVIEW_COUNT = 3;
const REVIEW_INTERVALS_MS = [DAY_MS, 3 * DAY_MS];

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeMistake(record) {
  const exerciseId = normalizeText(record?.exerciseId);
  const topicId = normalizeText(record?.topicId);
  if (!exerciseId || !topicId) return null;
  const lastMissedAt = Math.max(0, Number(record?.lastMissedAt ?? record?.occurredAt) || 0);
  const lastReviewedAt = Math.max(0, Number(record?.lastReviewedAt) || 0);
  return {
    exerciseId,
    lastMissedAt,
    lastReviewedAt,
    misses: Math.max(1, Math.floor(Number(record?.misses) || 1)),
    nextReviewAt: Math.max(0, Number(record?.nextReviewAt) || lastMissedAt),
    successfulReviews: Math.max(0, Math.min(
      MASTERY_REVIEW_COUNT - 1,
      Math.floor(Number(record?.successfulReviews) || 0)
    )),
    topicId,
    updatedAt: Math.max(
      lastMissedAt,
      lastReviewedAt,
      Number(record?.updatedAt) || 0
    ),
  };
}

function mergeSameMistake(left, right) {
  if (left.updatedAt !== right.updatedAt) return left.updatedAt > right.updatedAt ? left : right;
  const latestMiss = left.lastMissedAt >= right.lastMissedAt ? left : right;
  return {
    ...latestMiss,
    lastReviewedAt: Math.max(left.lastReviewedAt, right.lastReviewedAt),
    misses: Math.max(left.misses, right.misses),
    nextReviewAt: Math.max(left.nextReviewAt, right.nextReviewAt),
    successfulReviews: Math.max(left.successfulReviews, right.successfulReviews),
    updatedAt: left.updatedAt,
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
      merged.set(record.exerciseId, mergeSameMistake(current, record));
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
        nextReviewAt: Math.max(record.lastMissedAt, incoming.lastMissedAt),
        successfulReviews: 0,
        updatedAt: Math.max(record.updatedAt, incoming.lastMissedAt),
      } : record)
    : [...existing, incoming];
  return mergeMistakeQueues(next);
}

function buildAdaptiveReviewTopic({ courseId, exercisesByTopic, mistakeQueue, now = Date.now(), resumeTopicId, topics } = {}) {
  if (!normalizeText(courseId) || !(exercisesByTopic instanceof Map)) return null;
  const reviewTime = Math.max(0, Number(now) || 0);
  const topicById = new Map((Array.isArray(topics) ? topics : []).map((topic) => [topic.id, topic]));
  const exerciseLookup = new Map();
  for (const [topicId, exercises] of exercisesByTopic) {
    for (const exercise of Array.isArray(exercises) ? exercises : []) {
      if (exercise?.id) exerciseLookup.set(`${topicId}:${exercise.id}`, exercise);
    }
  }
  const selected = mergeMistakeQueues(mistakeQueue)
    .filter((mistake) => mistake.nextReviewAt <= reviewTime)
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
    nextTopicId: normalizeText(resumeTopicId) || null,
    order: highestOrder + 1,
    dueCount: selected.length,
    reviewExerciseIds: selected.map(({ mistake }) => mistake.exerciseId),
    sourceTopicIdByExerciseId: Object.fromEntries(selected.map(({ mistake }) => [
      mistake.exerciseId,
      mistake.topicId,
    ])),
    title: 'Personalised review',
    type: 'review',
  };
}

function resolveAdaptiveReview(queue, reviewedExerciseIds, missedExerciseIds = [], reviewedAt = Date.now()) {
  const reviewed = new Set(Array.isArray(reviewedExerciseIds) ? reviewedExerciseIds : []);
  const missed = new Set(Array.isArray(missedExerciseIds) ? missedExerciseIds : []);
  const reviewTime = Math.max(0, Number(reviewedAt) || 0);
  const next = mergeMistakeQueues(queue).map((record) => {
    if (!reviewed.has(record.exerciseId)) return record;
    if (missed.has(record.exerciseId)) {
      return {
        ...record,
        lastReviewedAt: reviewTime,
        nextReviewAt: reviewTime,
        successfulReviews: 0,
        updatedAt: reviewTime,
      };
    }
    const successfulReviews = record.successfulReviews + 1;
    if (successfulReviews >= MASTERY_REVIEW_COUNT) return null;
    return {
      ...record,
      lastReviewedAt: reviewTime,
      nextReviewAt: reviewTime + REVIEW_INTERVALS_MS[successfulReviews - 1],
      successfulReviews,
      updatedAt: reviewTime,
    };
  }).filter(Boolean);
  return mergeMistakeQueues(next);
}

module.exports = {
  buildAdaptiveReviewTopic,
  mergeMistakeQueues,
  recordPersistentMistake,
  resolveAdaptiveReview,
};
