'use strict';

function normalizeCompletedTopicIds(value) {
  return new Set(Array.isArray(value) ? value.filter((id) => typeof id === 'string') : []);
}

function getTopicModeLabel(topic = {}) {
  if (topic.type === 'review') return 'Review';
  if (topic.type === 'challenge') return 'Challenge';
  return 'Lesson';
}

function getTopicCtaLabel(topic = {}, state, chapterComplete) {
  if (chapterComplete) return 'Practice again';
  if (state !== 'active') return state === 'complete' ? 'Practice again' : 'Keep going';
  if (topic.type === 'review') return 'Start review';
  if (topic.type === 'challenge') return 'Start challenge';
  return 'Start lesson';
}

function buildLessonCards(topics, completedTopicIds, activeTopicId) {
  let openTopicFound = false;
  return topics.map((topic, index) => {
    const complete = completedTopicIds.has(topic.id);
    const active = activeTopicId
      ? topic.id === activeTopicId
      : !openTopicFound && !complete;
    if (active) openTopicFound = true;
    const state = complete ? 'complete' : active ? 'active' : 'locked';
    return {
      id: topic.id,
      title: topic.title,
      order: topic.order || index + 1,
      state,
      modeLabel: getTopicModeLabel(topic),
      guide: topic.guide || 'Kai',
      conceptCount: Math.max(Number(topic.conceptCount) || 0, 0),
      ctaLabel: getTopicCtaLabel(topic, state, false),
    };
  });
}

function buildCoreLoopViewModel({
  course = {},
  topics = [],
  completedTopicIds = [],
  activeTopicId = null,
} = {}) {
  const sortedTopics = [...topics].sort((left, right) => (left.order || 0) - (right.order || 0));
  const completed = normalizeCompletedTopicIds(completedTopicIds);
  const total = sortedTopics.length;
  const completedCount = sortedTopics.filter((topic) => completed.has(topic.id)).length;
  const chapterComplete = total > 0 && completedCount >= total;
  const cards = buildLessonCards(sortedTopics, completed, activeTopicId);
  let activeCard = cards.find((card) => card.state === 'active') || cards[0] || null;
  if (chapterComplete && activeCard) {
    activeCard = { ...activeCard, ctaLabel: 'Practice again' };
  }

  return {
    courseIdentity: {
      title: course.displayName || course.label || 'Diaspora',
      flag: course.flag || '',
      category: course.category || 'Language course',
      reviewLabel: course.published === true ? '' : 'Native review pending',
    },
    progress: {
      completed: completedCount,
      total,
      percent: total > 0 ? Math.round((completedCount / total) * 100) : 0,
    },
    chapterComplete,
    activeCard,
    lessonCards: chapterComplete
      ? cards.map((card) => ({ ...card, state: 'complete', ctaLabel: 'Practice again' }))
      : cards,
  };
}

module.exports = {
  buildCoreLoopViewModel,
  getTopicModeLabel,
};
