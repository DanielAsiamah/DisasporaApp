function normalise(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9' ]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getMistakeKey(mistake = {}) {
  return [mistake.lessonId, mistake.prompt, mistake.correctAnswer]
    .map(normalise)
    .join('|');
}

export function getMistakeOccurrenceId(mistake = {}, index = 0) {
  return mistake.id || `${getMistakeKey(mistake)}:${mistake.occurredAt || index}`;
}

function vocabularyFromCourse(course) {
  const seen = new Set();
  return (course?.units || [])
    .flatMap((unit) => unit.vocabulary || [])
    .filter((item) => {
      const key = item.id || `${normalise(item.phrase)}|${normalise(item.meaning)}`;
      if (!item?.phrase || !item?.meaning || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function itemMatchesMistake(item, mistake) {
  const phrase = normalise(item.phrase);
  const meaning = normalise(item.meaning);
  const prompt = normalise(mistake.prompt);
  const correctAnswer = normalise(mistake.correctAnswer);

  if (prompt && correctAnswer) {
    return (
      (prompt === phrase && correctAnswer === meaning)
      || (prompt === meaning && correctAnswer === phrase)
    );
  }

  return Boolean(prompt && [phrase, meaning].includes(prompt));
}

export function buildAdaptiveReviewLesson(course, mistakes = []) {
  if (!course || !mistakes.length) return null;

  const vocabulary = vocabularyFromCourse(course);
  const grouped = new Map();

  mistakes.forEach((mistake, index) => {
    const key = getMistakeKey(mistake);
    const current = grouped.get(key) || { key, count: 0, latestAt: 0, mistakes: [] };
    current.count += 1;
    current.latestAt = Math.max(current.latestAt, Number(mistake.occurredAt) || 0);
    current.mistakes.push({ mistake, index });
    grouped.set(key, current);
  });

  const rankedGroups = [...grouped.values()].sort((left, right) => (
    right.count - left.count || right.latestAt - left.latestAt
  ));
  const selectedItems = [];
  const selectedMistakeIds = [];
  const selectedMistakeKeys = [];

  rankedGroups.forEach((group) => {
    if (selectedItems.length >= 4) return;
    const matchedItem = vocabulary.find((item) => itemMatchesMistake(item, group.mistakes[0].mistake));
    if (!matchedItem || selectedItems.some((item) => item.id === matchedItem.id)) return;

    selectedItems.push(matchedItem);
    selectedMistakeKeys.push(group.key);
    group.mistakes.forEach(({ mistake, index }) => {
      selectedMistakeIds.push(getMistakeOccurrenceId(mistake, index));
    });
  });

  if (!selectedItems.length) return null;

  return {
    id: `adaptive-review-${course.id || 'course'}`,
    type: 'review',
    title: 'Personalised review',
    phrase: 'Strengthen weak phrases',
    meaning: `${selectedItems.length} ${selectedItems.length === 1 ? 'phrase' : 'phrases'} selected from your mistakes`,
    note: 'Your guide picked these from answers that need another pass. Master them to clear the review queue.',
    xp: 15,
    items: selectedItems,
    reviewMistakeIds: selectedMistakeIds,
    reviewMistakeKeys: selectedMistakeKeys,
    reviewCount: selectedMistakeIds.length,
    unitId: 'adaptive-review',
    unitTitle: 'Personalised review',
  };
}

export function calculateReviewResult(sessionSummary = {}) {
  const total = Math.max(Number(sessionSummary.totalQuestions) || 0, 1);
  const correct = Math.min(Number(sessionSummary.correctCount) || 0, total);
  const accuracy = correct / total;
  const mastered = accuracy >= 0.8;
  const xpEarned = 5 + correct * 2 + (accuracy === 1 ? 5 : 0);

  return {
    accuracy,
    mastered,
    xpEarned: Math.min(xpEarned, 20),
    gemsEarned: mastered ? 2 : 0,
  };
}

export function resolveReviewedMistakes(mistakes = [], reviewedIds = [], mastered = false) {
  if (!mastered || !reviewedIds.length) return mistakes;
  const reviewed = new Set(reviewedIds);
  return mistakes.filter((mistake, index) => !reviewed.has(getMistakeOccurrenceId(mistake, index)));
}
