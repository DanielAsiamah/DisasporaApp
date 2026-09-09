const test = require('node:test');
const assert = require('node:assert/strict');
const { buildCourseRoadmap } = require('../scripts/lib/course-roadmap.cjs');

const source = {
  languages: [{ language_id: 'patois', language_name: 'Jamaican Patois' }],
  units: [{ language_id: 'patois', unit_id: 'u1', unit_number: 1, unit_title: 'Greetings', objective: 'Say hello', section_title: 'Foundations' }],
  lessons: [{ language_id: 'patois', unit_id: 'u1', lesson_id: 'l1', lesson_number: 1, lesson_title: 'Greetings 1', lesson_type: 'teach', xp_reward: 15, status: 'published' }],
  vocabulary: [{ language_id: 'patois', lesson_id: 'l1', target_text: '', needs_native_review: true }],
};
test('preserves spreadsheet identity, objectives and lesson order without trusting publication labels', () => {
  const [course] = buildCourseRoadmap(source);
  assert.equal(course.id, 'jamaican-patois');
  assert.equal(course.units[0].objective, 'Say hello');
  assert.equal(course.units[0].lessons[0].title, 'Greetings 1');
  assert.equal(course.units[0].lessons[0].missingTranslations, 1);
  assert.equal(course.units[0].lessons[0].status, 'translation-needed');
});
test('translated planning content is not silently promoted into playable lessons', () => {
  const [course] = buildCourseRoadmap({ ...source, vocabulary: [{ ...source.vocabulary[0], target_text: 'Hello' }] });
  assert.equal(course.units[0].lessons[0].status, 'review-needed');
});
test('rejects orphan lessons rather than silently dropping spreadsheet content', () => {
  assert.throws(() => buildCourseRoadmap({ ...source, lessons: [{ ...source.lessons[0], unit_id: 'missing' }] }), /Unknown unit/);
});

test('sorts shuffled lesson rows using spreadsheet lesson numbers', () => {
  const courses = buildCourseRoadmap({ ...source, lessons: [
    { ...source.lessons[0], lesson_id: 'l2', lesson_number: 2 },
    source.lessons[0],
  ] });
  assert.deepEqual(courses[0].units[0].lessons.map((lesson) => lesson.id), ['l1', 'l2']);
});

test('generated plans cover the supplied workbook without marking blank translations as available', () => {
  const { courses } = require('../src/data/generatedCourseRoadmap.cjs');
  assert.equal(courses.length, 20);
  for (const course of courses) {
    assert.equal(course.units.length, 42, course.id);
    assert.equal(course.units[0].title, 'Greetings');
    for (const unit of course.units) {
      assert.equal(unit.lessons.length, 4, unit.id);
      assert.ok(unit.lessons.every((lesson) => lesson.status === 'translation-needed'));
    }
  }
});
