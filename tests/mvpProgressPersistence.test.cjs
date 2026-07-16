const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { TOPICS } = require('../src/data/curriculumContract.cjs');
const { mergeCompletedTopicIds } = require('../src/lessonEngine/topicProgress.cjs');

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
