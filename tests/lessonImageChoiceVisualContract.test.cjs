const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '../src/components/mvp/PatoisLessonModal.js'),
  'utf8'
);
const verifierSource = fs.readFileSync(
  path.join(__dirname, '../scripts/verify-local-core-loop.cjs'),
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

test('lesson modal presents vocabulary cards as accessible unscored study steps', () => {
  assert.match(source, /function VocabularyCardExercise\(/);
  assert.match(source, /buildVocabularyCardPresentation\(exercise\)/);
  assert.match(source, /accessibilityLabel=\{presentation\.accessibilityLabel\}/);
  assert.match(source, /source=\{imageRegistry\[exercise\.imageConceptId\]\}/);
  assert.match(source, /presentation\.pronunciationLabel \?/);
  assert.match(source, /<AudioControls conceptId=\{exercise\.conceptId\}/);
  assert.match(source, /const isStudyCard = isUnscoredExercise\(exercise\)/);
  assert.match(source, /\(isStudyCard \|\| feedback\) \? continueLesson : checkAnswer/);
  assert.match(source, /isStudyCard \? 'Continue learning'/);
  assert.match(verifierSource, /isUnscoredExercise\(exercise\)/);
  assert.match(verifierSource, /Continue learning/);
});
