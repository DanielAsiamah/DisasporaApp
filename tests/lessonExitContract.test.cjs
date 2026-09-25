const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/components/mvp/PatoisLessonModal.js'), 'utf8');

test('unfinished close requests confirm while finished lessons can close directly', () => {
  assert.match(source, /function requestCloseLesson\(\)[\s\S]*?if \(finished\)[\s\S]*?closeLesson\(\)[\s\S]*?setExitRequested\(true\)/);
  assert.match(source, /onRequestClose=\{requestCloseLesson\}/);
});

test('confirmation has explicit keep and leave actions and backs out without discarding', () => {
  assert.match(source, /accessibilityLabel="Keep learning"/);
  assert.match(source, /accessibilityLabel="Leave lesson"/);
  assert.match(source, /onRequestClose=\{\(\) => setExitRequested\(false\)\}/);
  assert.match(source, /This unfinished lesson will restart from the first question/);
});

test('exit confirmation distinguishes saved XP from an in-flight save', () => {
  assert.match(source, /xpAwardStatus === 'pending'/);
  assert.match(source, /An XP save is still running/);
  assert.match(source, /XP already saved stays in your account/);
});
