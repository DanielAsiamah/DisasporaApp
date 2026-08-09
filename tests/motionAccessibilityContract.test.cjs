const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

test('motion preference follows the operating-system accessibility setting', () => {
  const source = fs.readFileSync(path.join(root, 'src/hooks/useReducedMotion.js'), 'utf8');
  assert.match(source, /AccessibilityInfo\.isReduceMotionEnabled\(\)/);
  assert.match(source, /reduceMotionChanged/);
  assert.match(source, /subscription\.remove\(\)/);
});

test('home clouds, guide breathing, and active-topic pulse respect reduced motion', () => {
  const source = fs.readFileSync(path.join(root, 'src/screens/MvpHomeScreen.js'), 'utf8');
  assert.match(source, /useReducedMotion/);
  assert.match(source, /function Cloud\([^)]*reducedMotion/);
  assert.match(source, /function BreathingGuide\([^)]*reducedMotion/);
  assert.match(source, /function TopicButton\([^)]*reducedMotion/);
  assert.match(source, /<Cloud[^>]+reducedMotion=/s);
  assert.match(source, /<BreathingGuide[^>]+reducedMotion=/s);
  assert.match(source, /<TopicButton[^>]+reducedMotion=/s);
});

test('lesson motion and modal transitions respect reduced motion', () => {
  const source = fs.readFileSync(path.join(root, 'src/components/mvp/PatoisLessonModal.js'), 'utf8');
  assert.match(source, /useReducedMotion/);
  assert.match(source, /function BreathingVocabularyImage\([^)]*reducedMotion/);
  assert.match(source, /function BreathingGuidePortrait\([^)]*reducedMotion/);
  assert.match(source, /function LessonClouds\([^)]*reducedMotion/);
  assert.match(source, /animationType=\{reducedMotion \? ['"]none['"] : ['"]slide['"]\}/);
  assert.match(source, /if \(correct && !reducedMotion\)/);
  assert.match(source, /<BreathingGuidePortrait[^>]+guideName=\{topic\.guide \|\| ['"]Kai['"]\}/s);
});

test('correct lesson feedback uses an explicit celebration treatment instead of plain text only', () => {
  const source = fs.readFileSync(path.join(root, 'src/components/mvp/PatoisLessonModal.js'), 'utf8');

  assert.match(source, /feedback === ['"]correct['"] &&/);
  assert.match(source, /<Text style=\{styles\.feedbackConfetti\}>/);
  assert.match(source, /<BreathingGuidePortrait[^>]+style=\{styles\.feedbackGuide\}/s);
});
