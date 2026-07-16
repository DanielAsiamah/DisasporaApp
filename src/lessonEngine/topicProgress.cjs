function buildTopicStates(topics, completedTopicIds = []) {
  const completed = new Set(completedTopicIds);
  const ordered = [...topics].sort((a, b) => a.order - b.order);
  const firstIncompleteIndex = ordered.findIndex((topic) => !completed.has(topic.id));
  return ordered.map((topic, index) => ({
    ...topic,
    state: completed.has(topic.id)
      ? 'complete'
      : index === (firstIncompleteIndex === -1 ? ordered.length - 1 : firstIncompleteIndex)
        ? 'active'
        : 'locked',
  }));
}

function mergeCompletedTopicIds(topics, ...sources) {
  const completed = new Set(sources.flat().filter(Boolean));
  return [...topics]
    .sort((left, right) => left.order - right.order)
    .filter(({ id }) => completed.has(id))
    .map(({ id }) => id);
}

module.exports = { buildTopicStates, mergeCompletedTopicIds };
