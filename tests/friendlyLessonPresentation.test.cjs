const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('advancing topics remounts the lesson before old response state can render a new exercise', () => {
  assert.match(read('src/screens/MvpHomeScreen.js'), /key=\{`\$\{storageKey\}:\$\{activeTopic\?\.id \|\| 'closed'\}`\}/);
});

test('missed questions return for recall before completion without replacing reward IDs', () => {
  const modal = read('src/components/mvp/PatoisLessonModal.js');
  assert.match(modal, /buildMistakeReview\(exercises, mistakeIds\)/);
  assert.match(modal, /recordMistake\(current, exercise.id\)/);
  assert.match(modal, /Mistake practice/);
  assert.match(modal, /Object.hasOwn\(lessonSummary.rewards, rewardFields.rewardId\)/);
});

test('new questions reset the lesson scroll and checked feedback is brought into view', () => {
  const modal = read('src/components/mvp/PatoisLessonModal.js');
  assert.match(modal, /ref=\{lessonScrollRef\}/);
  assert.match(modal, /scrollTo\(\{ y: 0, animated: false \}\)/);
  assert.match(modal, /onContentSizeChange=/);
  assert.match(modal, /scrollToEnd\(\{ animated: !reducedMotion \}\)/);
});

test('theme and root load all friendly Nunito font weights', () => {
  for (const weight of ['400Regular', '500Medium', '600SemiBold', '700Bold', '800ExtraBold', '900Black']) {
    assert.ok(read('src/theme.js').includes(`Nunito_${weight}`));
    assert.ok(read('App.js').includes(`Nunito_${weight}`));
  }
});

test('rejected matches get red cards, non-color feedback and the incorrect sound event', () => {
  const modal = read('src/components/mvp/PatoisLessonModal.js');
  assert.match(modal, /rejectedMatchIds/);
  assert.match(modal, /rejected && styles.wrongCard/);
  assert.match(modal, /Not a match/);
  assert.match(modal, /audio.dispatch\(\{ event: 'answer-accepted', correct: false \}\)/);
});

test('the expanded original human cast is used beside lesson prompts', () => {
  const modal = read('src/components/mvp/PatoisLessonModal.js');
  assert.match(modal, /assets\/guides\/nia.png/);
  assert.match(modal, /assets\/guides\/kofi.png/);
  assert.match(modal, /styles.promptGuide/);
  for (const name of ['nia', 'kofi']) assert.ok(fs.statSync(path.join(__dirname, `../assets/guides/${name}.png`)).size > 1000);
});
