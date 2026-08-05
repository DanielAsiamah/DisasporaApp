const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { TOPICS } = require('../src/data/curriculumContract.cjs');
const { mergeCompletedTopicIds } = require('../src/lessonEngine/topicProgress.cjs');

function loadCourseProgressKeyHelper() {
  let helper;
  assert.doesNotThrow(() => {
    helper = require('../src/lessonEngine/courseProgressKey.cjs');
  });
  return helper;
}

test('local and Firestore topic progress merge in curriculum order and reject stale IDs', () => {
  assert.deepEqual(
    mergeCompletedTopicIds(TOPICS, ['easy-greetings', 'removed-topic'], ['getting-started', 'easy-greetings']),
    ['getting-started', 'easy-greetings']
  );
});

test('MVP shell hydrates progress through the authenticated UID-aware Firestore loader', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'screens', 'MvpHomeScreen.js'), 'utf8');
  assert.match(source, /loadLanguageProgress/);
  assert.match(source, /cancelled\s*=\s*true/);
  assert.match(source, /progressHydrated/);
  assert.match(source, /mergeCompletedTopicIds/);
});

test('course progress keys isolate users and courses while making guest progress explicit', () => {
  const { buildCourseProgressStorageKey } = loadCourseProgressKeyHelper();
  const patoisForAisha = buildCourseProgressStorageKey('aisha', 'jamaican-patois');
  const patoisForKwame = buildCourseProgressStorageKey('kwame', 'jamaican-patois');
  const swahiliForAisha = buildCourseProgressStorageKey('aisha', 'swahili');

  assert.equal(patoisForAisha, 'diaspora:mvp-topics:v1:aisha:jamaican-patois');
  assert.equal(buildCourseProgressStorageKey(undefined, 'swahili'), 'diaspora:mvp-topics:v1:guest:swahili');
  assert.notEqual(patoisForAisha, patoisForKwame);
  assert.notEqual(patoisForAisha, swahiliForAisha);
});

test('course progress keys reject blank course IDs', () => {
  const { buildCourseProgressStorageKey } = loadCourseProgressKeyHelper();
  assert.throws(() => buildCourseProgressStorageKey('aisha', ''), /course ID/i);
  assert.throws(() => buildCourseProgressStorageKey('aisha', '   '), /course ID/i);
});

test('MVP shell delegates local storage keys and retains canonical IDs for Firestore load and sync', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'screens', 'MvpHomeScreen.js'), 'utf8');

  assert.match(source, /require\(['"]\.\.\/lessonEngine\/courseProgressKey\.cjs['"]\)/);
  assert.match(source, /buildCourseProgressStorageKey\(user\?\.uid, storageCourseId\)/);
  assert.match(source, /loadLanguageProgress\?\.\(storageCourseId\)/);
  assert.match(source, /syncLanguageProgress\?\.\(storageCourseId,/);
});
