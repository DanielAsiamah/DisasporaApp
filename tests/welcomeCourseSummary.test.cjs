const test = require('node:test');
const assert = require('node:assert/strict');
const { COURSE_CATALOG } = require('../src/data/courseCatalog.cjs');

function build(courses) {
  return require('../src/data/welcomeCourseSummary.cjs').buildWelcomeCourseSummary(courses);
}

test('actual catalog advertises the Patois preview, not six released courses', () => {
  const result = build(COURSE_CATALOG);
  assert.equal(result.headline, '1 course to explore');
  assert.match(result.description, /Jamaican Patois \(preview\)/);
  assert.doesNotMatch(result.description, /Swahili/);
  assert.match(result.lanes[0].detail, /Jamaican Patois \(preview\)/);
  assert.match(result.lanes[0].detail, /In preparation: Swahili/);
  assert.match(result.lanes[1].detail, /In preparation/);
  assert.match(result.lanes[2].detail, /In preparation/);
});

test('newly available courses update counts while published courses lose preview labels', () => {
  const result = build([
    { id: 'one', label: 'One', baseLanguage: 'english', onboarding: true, available: true, published: true },
    { id: 'two', label: 'Two', baseLanguage: 'french', onboarding: true, available: true, published: false },
    { id: 'hidden', label: 'Hidden', baseLanguage: 'english', onboarding: false, available: true },
  ]);
  assert.equal(result.headline, '2 courses to explore');
  assert.match(result.description, /One, Two \(preview\)/);
  assert.doesNotMatch(result.description, /Hidden|One \(preview\)/);
});

test('empty catalogs make no playable-course promises', () => {
  const result = build([]);
  assert.equal(result.headline, 'Courses in preparation');
  assert.doesNotMatch(result.description, /Start with/);
  assert.equal(result.lanes.length, 0);
});

test('fully published catalogs do not imply pending courses or preview review', () => {
  const result = build([
    { label: 'Ready', onboarding: true, available: true, published: true, baseLanguage: 'english' },
  ]);
  assert.equal(result.description, 'Start with Ready.');
});
