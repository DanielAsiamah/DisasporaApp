const assert = require('node:assert/strict');
const test = require('node:test');

const {
  COURSE_PRESENTATIONS,
  getCoursePresentationMetadata,
} = require('../src/data/coursePresentationContract.cjs');

test('course presentation metadata is explicit and never falls back to another culture', () => {
  assert.deepEqual(Object.keys(COURSE_PRESENTATIONS).sort(), ['haitian-creole', 'jamaican-patois', 'nobiin', 'sudanese-arabic', 'swahili', 'wolof']);
  assert.deepEqual(getCoursePresentationMetadata('swahili'), {
    flag: '\u{1F1F0}\u{1F1EA}',
    heroAsset: 'assets/images/chapters/swahili-greetings.png',
  });
  assert.deepEqual(getCoursePresentationMetadata('wolof'), {
    flag: '\u{1F1F8}\u{1F1F3}',
    heroAsset: 'assets/images/chapters/wolof-greetings.png',
  });
  assert.deepEqual(getCoursePresentationMetadata('haitian-creole'), {
    flag: '\u{1F1ED}\u{1F1F9}',
    heroAsset: 'assets/images/chapters/haitian-creole-greetings.png',
  });
  assert.deepEqual(getCoursePresentationMetadata('sudanese-arabic'), {
    flag: '\u{1F1F8}\u{1F1E9}',
    heroAsset: 'assets/images/chapters/sudanese-arabic-greetings.png',
  });
  assert.deepEqual(getCoursePresentationMetadata('nobiin'), {
    flag: '\u{1F1F8}\u{1F1E9}',
    heroAsset: 'assets/images/chapters/nobiin-greetings.png',
  });
  assert.equal(getCoursePresentationMetadata('toString'), null);
  assert.equal(getCoursePresentationMetadata(null), null);
});

test('current presentation records use canonical chapter hero paths', () => {
  assert.deepEqual(getCoursePresentationMetadata('jamaican-patois'), {
    flag: '\u{1F1EF}\u{1F1F2}',
    heroAsset: 'assets/images/chapters/jamaican-patois-greetings.png',
  });
  for (const presentation of Object.values(COURSE_PRESENTATIONS)) {
    assert.match(presentation.heroAsset, /^assets\/images\/chapters\/[a-z0-9-]+\.png$/);
    assert.ok(presentation.flag);
    assert.equal(Object.isFrozen(presentation), true);
  }
});
