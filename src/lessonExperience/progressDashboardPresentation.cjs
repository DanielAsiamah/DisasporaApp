function normalizeCount(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return 0;
  return Math.floor(number);
}

function normalizeGoal(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 5;
  return Math.min(Math.max(Math.floor(number), 1), 60);
}

function buildMilestones(percent, completed) {
  const milestones = [
    { id: 'first-step', label: 'First step', detail: 'Complete one topic', threshold: completed > 0 ? 0 : 1 },
    { id: 'explorer', label: 'Explorer', detail: 'Reach 25% of the chapter', threshold: 25 },
    { id: 'connector', label: 'Connector', detail: 'Reach the chapter midpoint', threshold: 50 },
    { id: 'storyteller', label: 'Storyteller', detail: 'Reach 75% of the chapter', threshold: 75 },
    { id: 'chapter-keeper', label: 'Chapter keeper', detail: 'Complete every topic', threshold: 100 },
  ];
  const firstIncomplete = milestones.findIndex((milestone) => percent < milestone.threshold);

  return milestones.map((milestone, index) => ({
    ...milestone,
    state: percent >= milestone.threshold
      ? 'complete'
      : index === firstIncomplete
        ? 'current'
        : 'locked',
  }));
}

function buildProgressDashboardViewModel({
  completedTopicIds,
  courseName,
  dailyGoalMinutes,
  duePracticeCount,
  ready = false,
  streak,
  topics,
  totalWords,
  xp,
} = {}) {
  const safeTopics = Array.isArray(topics) ? topics.filter((topic) => topic?.id) : [];
  const completedIds = new Set(Array.isArray(completedTopicIds) ? completedTopicIds : []);
  const completedTopics = safeTopics.filter((topic) => completedIds.has(topic.id));
  const total = safeTopics.length;
  const completed = completedTopics.length;
  const percent = ready && total ? Math.round((completed / total) * 100) : 0;
  const availableWords = normalizeCount(totalWords)
    || safeTopics.reduce((sum, topic) => sum + normalizeCount(topic.conceptCount), 0);
  const coveredWords = Math.min(
    availableWords,
    completedTopics.reduce((sum, topic) => sum + normalizeCount(topic.conceptCount), 0)
  );
  const dueCount = normalizeCount(duePracticeCount);
  const goal = normalizeGoal(dailyGoalMinutes);
  const safeXp = normalizeCount(xp);
  const safeStreak = normalizeCount(streak);
  const title = !ready
    ? 'Gathering your journey'
    : percent === 100
      ? 'Chapter complete'
      : completed > 0
        ? 'Momentum is building'
        : 'Your story starts here';

  return {
    courseName: typeof courseName === 'string' && courseName.trim() ? courseName.trim() : 'Your course',
    dailyGoal: {
      label: `${goal} min daily target`,
      minutes: goal,
    },
    milestones: buildMilestones(percent, completed),
    practice: {
      dueCount,
      label: dueCount ? `${dueCount} ${dueCount === 1 ? 'phrase' : 'phrases'} due` : 'Nothing due yet',
      message: dueCount
        ? 'A short personalised review is ready from your saved mistakes.'
        : 'Mistakes you make in lessons will appear here for spaced review.',
    },
    progress: {
      accessibilityLabel: ready
        ? `${completed} of ${total} topics complete, ${percent} percent`
        : 'Course progress loading',
      completed,
      percent,
      total,
    },
    ready,
    stats: [
      { id: 'xp', icon: 'star', label: 'Total XP', value: ready ? String(safeXp) : '...' },
      { id: 'streak', icon: 'flame', label: 'Day streak', value: ready ? String(safeStreak) : '...' },
      { id: 'topics', icon: 'checkmark-circle', label: 'Topics', value: ready ? `${completed}/${total}` : '...' },
      { id: 'words', icon: 'chatbubble-ellipses', label: 'Words covered', value: ready ? `${coveredWords}/${availableWords}` : '...' },
    ],
    subtitle: !ready
      ? 'Syncing the progress saved for this language.'
      : percent === 100
        ? 'You finished every available topic. Keep the language alive through review.'
        : completed > 0
          ? `${completed} ${completed === 1 ? 'topic' : 'topics'} complete in ${courseName || 'this course'}.`
          : 'Complete your first lesson to begin your learning record.',
    title,
  };
}

module.exports = { buildProgressDashboardViewModel };
