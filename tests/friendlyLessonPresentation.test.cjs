const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { auditPngBuffer } = require('../scripts/lib/audit-vocab-images.cjs');
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

test('theme and root load the editorial display, serif, and readable UI type system', () => {
  for (const face of ['Anton_400Regular', 'DMSerifDisplay_400Regular', 'Inter_400Regular', 'Inter_500Medium', 'Inter_600SemiBold', 'Inter_700Bold']) {
    assert.ok(read('src/theme.js').includes(face));
    assert.ok(read('App.js').includes(face));
  }
  assert.match(read('src/theme.js'), /display:\s*['"]Anton_400Regular['"]/);
  assert.match(read('src/theme.js'), /editorial:\s*['"]DMSerifDisplay_400Regular['"]/);
  assert.match(read('src/theme.js'), /regular:\s*['"]Inter_400Regular['"]/);
  assert.doesNotMatch(read('src/theme.js'), /Nunito_/);
  assert.doesNotMatch(read('src/theme.js'), /Fredoka_/);
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
  const registry = read('src/data/guideArtRegistry.js');
  assert.match(modal, /getPromptGuideName\(topic\?\.guide, index\)/);
  assert.match(read('src/components/mvp/AnimatedGuide.js'), /guideArt\[name\]/);
  assert.match(modal, /styles.promptGuide/);
  for (const name of ['kai', 'amara', 'sol', 'nia', 'kofi', 'ayo', 'safiya', 'nneka', 'chidi']) {
    assert.ok(registry.includes(`assets/guides/${name}.png`));
    assert.ok(fs.statSync(path.join(__dirname, `../assets/guides/${name}.png`)).size > 1000);
  }
  for (const name of ['nneka', 'chidi']) {
    const result = auditPngBuffer(fs.readFileSync(path.join(__dirname, `../assets/guides/${name}.png`)), {
      label: name, expectedWidth: 1024, expectedHeight: 1536,
    });
    assert.deepEqual(result.failures, []);
  }
});
