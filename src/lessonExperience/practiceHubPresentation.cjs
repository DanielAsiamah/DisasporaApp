function normalizeCount(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return 0;
  return Math.floor(number);
}

function cleanLabel(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function buildPracticeHubViewModel({
  dueCount,
  hasCompletedTopic = false,
  practiceTopicTitle,
  ready = false,
} = {}) {
  if (!ready) {
    return {
      canStart: false,
      countLabel: 'Checking saved practice',
      ctaLabel: 'PLEASE WAIT',
      message: 'Your saved mistakes and completed lessons are being prepared.',
      mode: 'loading',
      title: 'Preparing your practice',
    };
  }

  const safeDueCount = normalizeCount(dueCount);
  const safeTitle = cleanLabel(practiceTopicTitle);

  if (safeDueCount > 0) {
    return {
      canStart: true,
      countLabel: `${safeDueCount} ${safeDueCount === 1 ? 'phrase' : 'phrases'} due`,
      ctaLabel: 'START REVIEW',
      message: 'Recall phrases from past mistakes and move them closer to mastery.',
      mode: 'due',
      title: safeTitle || 'Personalised review',
    };
  }

  if (hasCompletedTopic && safeTitle) {
    return {
      canStart: true,
      countLabel: 'Nothing due today',
      ctaLabel: 'REVIEW TOPIC',
      message: 'No saved mistakes are due. Replay a completed topic to keep it fresh.',
      mode: 'replay',
      title: safeTitle,
    };
  }

  return {
    canStart: true,
    countLabel: 'Complete lesson one to begin',
    ctaLabel: 'GO TO LEARN',
    message: 'Your personalised practice queue grows from the mistakes you make in lessons.',
    mode: 'first-lesson',
    title: 'Practice starts after lesson one',
  };
}

function getPracticeStartDestination({ canStart = false, hasPracticeTopic = false, mode } = {}) {
  if (!canStart) return 'none';
  if (mode === 'first-lesson' || !hasPracticeTopic) return 'learn';
  return 'topic';
}

module.exports = { buildPracticeHubViewModel, getPracticeStartDestination };
