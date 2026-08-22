const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { TOPICS } = require('../src/data/curriculumContract.cjs');
const { mergeCompletedTopicIds } = require('../src/lessonEngine/topicProgress.cjs');
const {
  createMutationProgressSnapshot,
  createProgressSnapshot,
  getCompletedTopicIdsForKey,
  isProgressSnapshotCurrent,
} = require('../src/lessonEngine/mvpProgressState.cjs');

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
  assert.match(source, /progressSnapshot/);
  assert.match(source, /progressReady/);
  assert.match(source, /mergeCompletedTopicIds/);
});

test('an old account snapshot is never treated as current for a new account key', () => {
  const oldKey = 'diaspora:mvp-topics:v1:aisha:jamaican-patois';
  const newKey = 'diaspora:mvp-topics:v1:kwame:jamaican-patois';
  const oldSnapshot = createProgressSnapshot(oldKey, ['getting-started', 'easy-greetings']);

  assert.equal(isProgressSnapshotCurrent(oldSnapshot, oldKey), true);
  assert.equal(isProgressSnapshotCurrent(oldSnapshot, newKey), false);
  assert.deepEqual(getCompletedTopicIdsForKey(oldSnapshot, newKey), []);
  assert.deepEqual(getCompletedTopicIdsForKey(oldSnapshot, oldKey), ['getting-started', 'easy-greetings']);
});

test('a failed remote read can never arm a later Firestore progress write', () => {
  const key = 'diaspora:mvp-topics:v1:aisha:jamaican-patois';
  const failedHydration = createProgressSnapshot(key, [], { remoteReadStatus: 'error' });
  const localCompletion = createMutationProgressSnapshot(
    failedHydration,
    key,
    ['getting-started']
  );
  const successfulHydration = createProgressSnapshot(key, [], { remoteReadStatus: 'success' });
  const safeCompletion = createMutationProgressSnapshot(
    successfulHydration,
    key,
    ['getting-started']
  );

  assert.equal(failedHydration.shouldSyncRemote, false);
  assert.equal(localCompletion.shouldSyncRemote, false);
  assert.equal(safeCompletion.shouldSyncRemote, true);
});

test('MVP shell persists only an identity-matched progress snapshot and gates lessons while loading', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'screens', 'MvpHomeScreen.js'), 'utf8');

  assert.match(source, /const progressReady = isProgressSnapshotCurrent\(progressSnapshot, storageKey\)/);
  assert.match(source, /if \(!isProgressSnapshotCurrent\(progressSnapshot, storageKey\)\) return;/);
  assert.match(source, /progressSnapshot\.shouldSyncRemote/);
  assert.match(source, /remoteReadStatus:\s*remoteResult\.status/);
  assert.match(source, /progressReady=\{progressReady\}/);
  assert.match(source, /disabled=\{!progressReady \|\| !activeLearnTopic\}/);
  assert.match(source, /Loading your saved progress…/);
});

test('account and course progress live in a storage-keyed shell that remounts lessons on handoff', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'screens', 'MvpHomeScreen.js'), 'utf8');

  assert.match(source, /<MvpHomeCourseShell[\s\S]*?key=\{storageKey\}[\s\S]*?storageCourseId=\{storageCourseId\}[\s\S]*?storageKey=\{storageKey\}/s);
  assert.match(source, /function MvpHomeCourseShell\(\{ previewCourseId, storageCourseId, storageKey \}\)/);
  assert.match(source, /<PatoisLessonModal[\s\S]*?key=\{storageKey\}[\s\S]*?visible=\{Boolean\(activeTopic\) && progressReady\}/s);
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

test('Firestore topic writes merge completion IDs instead of replacing concurrent device progress', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'services', 'firestore', 'userService.js'),
    'utf8'
  );

  assert.match(source, /const \{ completedTopicIds, \.\.\.otherFields \} = fields/);
  assert.match(source, /completedTopicIds:\s*arrayUnion\(\.\.\.completedTopicIds\)/);
  assert.match(source, /Array\.isArray\(completedTopicIds\) && completedTopicIds\.length > 0/);
});
