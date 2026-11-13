const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '../src/components/mvp/PatoisLessonModal.js'),
  'utf8'
);

test('lesson modal renders an accessible visual answer grid from the course image registry', () => {
  assert.match(source, /function ImageChoiceExercise\(/);
  assert.match(source, /exercise\.imageChoices\.map\(\(choice, index\) =>/);
  assert.match(source, /imageRegistry\[choice\.imageConceptId\]/);
  assert.match(source, /accessibilityRole="radio"/);
  assert.match(source, /accessibilityLabel=\{`\$\{choice\.label\}, image answer \$\{index \+ 1\} of \$\{exercise\.imageChoices\.length\}/);
  assert.match(source, /styles\.imageChoiceGrid/);
});

test('lesson header presents progress and hearts as one compact status rail', () => {
  assert.match(source, /style=\{styles\.statusRail\}/);
  assert.match(source, /accessibilityLabel="Lesson progress"/);
  assert.match(source, /accessibilityLabel=\{heartsPresentation\.accessibilityLabel\}/);
});
