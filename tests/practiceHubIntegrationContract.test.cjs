const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

test('home shell wires Progress into Practice and Practice into the persisted review topic', () => {
  const source = fs.readFileSync(path.join(root, 'src/screens/MvpHomeScreen.js'), 'utf8');

  assert.match(source, /activeTab === 'practice'[\s\S]*?<PracticeHub/s);
  assert.match(source, /onPractice=\{\(\) => setActiveTab\('practice'\)\}/);
  assert.match(source, /onStart=\{startPractice\}/);
  assert.match(source, /setActiveTopic\(practiceTopic\)/);
  assert.match(source, /setActiveTab\('learn'\)/);
});

test('practice state changes are politely announced to assistive technology', () => {
  const source = fs.readFileSync(path.join(root, 'src/components/mvp/PracticeHub.js'), 'utf8');

  assert.match(source, /accessibilityLiveRegion="polite"/);
  assert.match(source, /accessibilityState=\{\{ disabled: !presentation\.canStart \}\}/);
});
