const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

test('motion preference follows the operating-system accessibility setting', () => {
  const source = fs.readFileSync(path.join(root, 'src/hooks/useReducedMotion.js'), 'utf8');
  assert.match(source, /useReducedMotion\(initialValue = false\)/);
  assert.match(source, /useState\(initialValue\)/);
  assert.match(source, /AccessibilityInfo\.isReduceMotionEnabled\(\)/);
  assert.match(source, /reduceMotionChanged/);
  assert.match(source, /preferenceChanged = true/);
  assert.match(source, /if \(mounted && !preferenceChanged\)/);
  assert.match(source, /subscription\.remove\(\)/);
});

test('first-launch splash skips staged waits and animations when reduced motion is enabled', () => {
  const source = fs.readFileSync(path.join(root, 'src/screens/SplashScreen.js'), 'utf8');

  assert.match(source, /useReducedMotion/);
  assert.match(source, /useReducedMotion\(null\)/);
  assert.match(source, /if \(reducedMotion == null\) return undefined/);
  assert.match(source, /onFinishRef\.current = onFinish/);
  assert.match(source, /onFinishRef\.current\(\)/);
  assert.match(source, /if \(reducedMotion\) \{\s*textOpacity\.setValue\(1\);\s*textScale\.setValue\(1\);\s*sublineOpacity\.setValue\(1\);/s);
  assert.match(source, /if \(reducedMotion\)[\s\S]+requestAnimationFrame\(finishSplash\)/);
  assert.match(source, /return \(\) => \{[\s\S]+textOpacity\.stopAnimation\(\);[\s\S]+exitOpacity\.stopAnimation\(\);/);
});

test('welcome entrance and atmosphere settle into static resting values for reduced motion', () => {
  const welcomeSource = fs.readFileSync(path.join(root, 'src/screens/WelcomeScreen.js'), 'utf8');
  const atmosphereSource = fs.readFileSync(path.join(root, 'src/components/AnimatedAtmosphere.js'), 'utf8');

  assert.match(welcomeSource, /useReducedMotion/);
  assert.match(welcomeSource, /useReducedMotion\(null\)/);
  assert.match(welcomeSource, /if \(reducedMotion == null\) return undefined/);
  assert.match(welcomeSource, /if \(reducedMotion\) \{\s*fadeAnim\.stopAnimation\(\);\s*slideAnim\.stopAnimation\(\);\s*fadeAnim\.setValue\(1\);\s*slideAnim\.setValue\(0\);/s);
  assert.match(welcomeSource, /return \(\) => entrance\.stop\(\)/);

  assert.match(atmosphereSource, /useReducedMotion/);
  assert.match(atmosphereSource, /useReducedMotion\(null\)/);
  assert.match(atmosphereSource, /if \(reducedMotion !== false\) \{\s*drift\.setValue\(0\.5\);\s*float\.setValue\(0\);/s);
  assert.match(atmosphereSource, /return \(\) => \{\s*driftLoop\.stop\(\);\s*floatLoop\.stop\(\);/s);
});

test('home clouds, guide breathing, and active-topic pulse respect reduced motion', () => {
  const source = fs.readFileSync(path.join(root, 'src/screens/MvpHomeScreen.js'), 'utf8');
  assert.match(source, /useReducedMotion/);
  assert.match(source, /function Cloud\([^)]*restingX[^)]*reducedMotion/);
  assert.match(source, /function BreathingGuide\([^)]*reducedMotion/);
  assert.match(source, /function TopicButton\([^)]*reducedMotion/);
  assert.match(source, /if \(reducedMotion\) \{\s*drift\.setValue\(restingX\)/s);
  assert.match(source, /<Cloud[^>]+restingX=\{/s);
  assert.match(source, /<BreathingGuide[^>]+reducedMotion=/s);
  assert.match(source, /<TopicButton[^>]+reducedMotion=/s);
});

test('lesson motion and modal transitions respect reduced motion', () => {
  const source = fs.readFileSync(path.join(root, 'src/components/mvp/PatoisLessonModal.js'), 'utf8');
  assert.match(source, /useReducedMotion/);
  assert.match(source, /function BreathingVocabularyImage\([^)]*reducedMotion/);
  assert.match(source, /function BreathingGuidePortrait\([^)]*reducedMotion/);
  assert.match(source, /function LessonClouds\([^)]*primaryRestingX[^)]*secondaryRestingX[^)]*reducedMotion/);
  assert.match(source, /if \(reducedMotion\) \{\s*drift\.setValue\(primaryRestingX\)/s);
  assert.match(source, /LESSON_CLOUD_FILL/);
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
