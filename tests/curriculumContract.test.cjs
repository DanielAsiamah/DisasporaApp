const test = require('node:test');
const assert = require('node:assert/strict');

const {
  CONCEPTS,
  COURSE_CATALOG,
  TOPICS,
  validateCourseVocabulary,
} = require('../src/data/curriculumContract.cjs');

const EXPECTED_MEANINGS = [
  'yes', 'no', 'maybe', 'okay', 'again',
  'good afternoon', 'nice to meet you', 'long time no see', 'how is your day', 'have a good day',
  'what is your name', 'my name is...', 'I am a student', 'I am learning...', 'I speak...',
  'where are you from', 'I am from...', 'where do you live', 'I live in...', 'which language do you speak',
  'family', 'parents', 'husband', 'wife', 'son', 'daughter', 'grandfather',
  'please', 'thank you', 'no problem', 'excuse me', 'sorry',
  'this is my family', 'this is my husband', 'this is my wife', 'he lives here', 'she works here',
  'we speak...', 'they are from...',
];

test('curriculum exposes exactly nine ordered topics and 39 replacement concepts', () => {
  assert.equal(TOPICS.length, 9);
  assert.deepEqual(TOPICS.map((topic) => topic.order), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.equal(CONCEPTS.length, 39);
  assert.deepEqual(CONCEPTS.map((concept) => concept.meaning), EXPECTED_MEANINGS);
  assert.equal(new Set(CONCEPTS.map((concept) => concept.id)).size, 39);
});

test('course catalog contains the six onboarding courses plus three later catalog courses', () => {
  assert.equal(COURSE_CATALOG.length, 9);
  assert.deepEqual(
    COURSE_CATALOG.filter((course) => course.onboarding).map((course) => course.id),
    ['jamaican-patois', 'swahili', 'wolof', 'haitian-creole', 'sudanese-arabic', 'nobiin']
  );
  assert.deepEqual(
    COURSE_CATALOG.filter((course) => !course.onboarding).map((course) => course.id),
    ['igbo', 'belizean-kriol', 'aave']
  );
});

test('published vocabulary must contain one complete, unique 39-entry concept set', () => {
  const complete = CONCEPTS.map((concept) => ({
    conceptId: concept.id,
    localized: `localized-${concept.id}`,
    image: `assets/images/vocab/jamaican-patois/${concept.id}.png`,
    audio: `assets/audio/jamaican-patois/${concept.id}.mp3`,
  }));

  assert.deepEqual(validateCourseVocabulary(complete), []);
  assert.match(validateCourseVocabulary(complete.slice(1)).join('\n'), /39 entries/);
  assert.match(validateCourseVocabulary([...complete, complete[0]]).join('\n'), /duplicate concept/i);
});
