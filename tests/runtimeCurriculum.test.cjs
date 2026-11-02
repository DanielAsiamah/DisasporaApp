const test = require('node:test');
const assert = require('node:assert/strict');
const { getRuntimeCurriculum } = require('../src/data/runtimeCurriculum.cjs');
const { GENERATED_CURRICULUM } = require('../src/data/generatedCurriculum.cjs');
const { buildCourseTopicExercises } = require('../src/lessonEngine/patoisLessonSteps.cjs');
const { buildTopicStates } = require('../src/lessonEngine/topicProgress.cjs');

test('master drafts do not replace canonical curricula for other courses', () => {
  for (const courseId of ['jamaican-patois', 'swahili', 'wolof', 'haitian-creole', 'sudanese-arabic', 'unknown']) {
    assert.equal(getRuntimeCurriculum(courseId), GENERATED_CURRICULUM);
  }
  assert.notEqual(getRuntimeCurriculum('igbo'), GENERATED_CURRICULUM);
  assert.deepEqual(buildCourseTopicExercises('unknown', 'igbo_u01_l01'), []);
  assert.deepEqual(buildCourseTopicExercises('igbo', 'getting-started'), []);
});

test('Igbo master lessons unlock sequentially without inheriting another course progress', () => {
  const { topics } = getRuntimeCurriculum('igbo');
  assert.equal(topics.length, 4);
  assert.deepEqual(buildTopicStates(topics, ['getting-started']).map(t => t.state), ['active', 'locked', 'locked', 'locked']);
  assert.deepEqual(buildTopicStates(topics, ['igbo_u01_l01']).map(t => t.state), ['complete', 'active', 'locked', 'locked']);
  assert.equal(topics.flatMap(topic => buildCourseTopicExercises('igbo', topic.id)).length, 27);
});

test('the Learn progress message distinguishes available drafts from a complete planned chapter', () => {
  const { getLearningProgressPresentation } = require('../src/screens/mvpHomePresentation.cjs');
  const result = getLearningProgressPresentation({ ready: true, completed: 2, total: 2, hasMorePlannedLessons: true });
  assert.match(result.subtitle, /available draft lessons/);
  assert.doesNotMatch(result.subtitle, /Chapter complete/);
});
