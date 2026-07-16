const test = require('node:test');
const assert = require('node:assert/strict');

const { buildTopicStates } = require('../src/lessonEngine/topicProgress.cjs');

test('topics unlock sequentially and keep completed topics available', () => {
  const topics = Array.from({ length: 9 }, (_, index) => ({ id: `topic-${index + 1}`, order: index + 1 }));
  const states = buildTopicStates(topics, ['topic-1', 'topic-2']);
  assert.deepEqual(states.map((topic) => topic.state), ['complete', 'complete', 'active', 'locked', 'locked', 'locked', 'locked', 'locked', 'locked']);
});

test('the first topic is active for a new learner', () => {
  assert.equal(buildTopicStates([{ id: 'first', order: 1 }], [])[0].state, 'active');
});
