const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const sourcePath = path.join(
  __dirname,
  '..',
  'src',
  'components',
  'mvp',
  'ProgressDashboard.js'
);

test('progress dashboard renders accessible course progress, real stats, and milestone states', () => {
  const source = fs.readFileSync(sourcePath, 'utf8');

  assert.match(source, /export default function ProgressDashboard/);
  assert.match(source, /accessibilityRole="progressbar"/);
  assert.match(source, /accessibilityValue={{ min: 0, max: 100, now: presentation\.progress\.percent \}\}/);
  assert.match(source, /presentation\.stats\.map/);
  assert.match(source, /presentation\.milestones\.map/);
  assert.match(source, /milestone\.state === 'complete'/);
  assert.match(source, /milestone\.state === 'current'/);
  assert.match(source, /<AnimatedGuide/);
  assert.match(source, /fontFamily: fonts\.display/);
  assert.match(source, /fontFamily: fonts\.editorial/);
});

test('progress dashboard offers useful next actions without fabricating due practice', () => {
  const source = fs.readFileSync(sourcePath, 'utf8');

  assert.match(source, /onContinue/);
  assert.match(source, /onPractice/);
  assert.match(source, /presentation\.practice\.dueCount > 0/);
  assert.match(source, /CONTINUE LEARNING/);
  assert.match(source, /START REVIEW/);
  assert.match(source, /REVIEW A TOPIC/);
  assert.match(source, /accessibilityState={{ disabled: !presentation\.ready \}\}/);
});
