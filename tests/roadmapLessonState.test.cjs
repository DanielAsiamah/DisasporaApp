const test = require('node:test');
const assert = require('node:assert/strict');
const { getRoadmapLessonState } = require('../src/lessonExperience/roadmapLessonState.cjs');

test('roadmap uses exact playable IDs and waits for account progress', () => {
  const lesson = { id: 'igbo_u01_l01' };
  const topics = [{ id: lesson.id, state: 'active' }];
  assert.equal(getRoadmapLessonState(lesson, topics, false).canOpen, false);
  assert.equal(getRoadmapLessonState(lesson, topics, true).canOpen, true);
  assert.equal(getRoadmapLessonState(lesson, [{ ...topics[0], state: 'complete' }], true).label, 'Completed draft lesson');
  assert.equal(getRoadmapLessonState(lesson, [{ ...topics[0], state: 'locked' }], true).canOpen, false);
  assert.deepEqual(getRoadmapLessonState({ id: 'igbo_u01_l03', status: 'translation-needed' }, topics, true), {
    canOpen: false, icon: 'lock-closed-outline', label: 'Translation in preparation', topic: null,
  });
  assert.equal(getRoadmapLessonState({ id: 'swahili_u01_l01' }, topics, true).topic, null);
});
