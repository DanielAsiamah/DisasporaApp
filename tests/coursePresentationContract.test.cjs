const assert = require('node:assert/strict');
const test = require('node:test');

const {
  COURSE_PRESENTATIONS,
  getCoursePresentationMetadata,
} = require('../src/data/coursePresentationContract.cjs');

test('course presentation metadata is explicit and never falls back to another culture', () => {
  assert.deepEqual(Object.keys(COURSE_PRESENTATIONS).sort(), ['jamaican-patois', 'swahili']);
  assert.deepEqual(getCoursePresentationMetadata('swahili'), {
    flag: '\u{1F1F0}\u{1F1EA}',
    heroAsset: 'assets/images/chapters/swahili-greetings.png',
  });
  assert.equal(getCoursePresentationMetadata('wolof'), null);
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
