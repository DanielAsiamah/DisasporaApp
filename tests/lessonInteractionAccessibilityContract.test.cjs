const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const lessonSource = fs.readFileSync(
  path.join(root, 'src/components/mvp/PatoisLessonModal.js'),
  'utf8'
);

test('lesson feedback uses the cross-platform announcement API with the revealed answer', () => {
  assert.match(lessonSource, /function getFeedbackAnnouncement\(correct, exercise\)/);
  assert.match(lessonSource, /const answerCopy = exercise\?\.type === LESSON_EXERCISE_TYPES\.MATCH_PAIRS[\s\S]*?['"]All pairs matched\.['"][\s\S]*?`Answer: \$\{exercise\?\.answer \|\| ['"]unknown['"]\}\.`/s);
  assert.match(lessonSource, /const incorrectCopy = exercise\?\.type === LESSON_EXERCISE_TYPES\.MATCH_PAIRS[\s\S]*?['"]Match every phrase with its meaning\.['"][\s\S]*?`Correct answer: \$\{exercise\?\.answer \|\| ['"]unknown['"]\}\.`/s);
  assert.match(lessonSource, /return correct[\s\S]*?`Correct\. \$\{answerCopy\}`[\s\S]*?`Incorrect\. \$\{incorrectCopy\}`/s);
  assert.match(lessonSource, /AccessibilityInfo\.announceForAccessibility\(getFeedbackAnnouncement\(correct, exercise\)\)/);
  assert.match(lessonSource, /function getExerciseAnswerLabel\(exercise\)[\s\S]*?MATCH_PAIRS\) return ['"]All pairs matched['"]/s);
  assert.match(lessonSource, /<Text style=\{styles\.feedbackAnswer\}>\{exerciseAnswerLabel\}<\/Text>/);
});

test('answer choices expose exclusive selection, position, result, and disabled state', () => {
  assert.match(lessonSource, /<View accessibilityLabel=['"]Answer choices['"] accessibilityRole=['"]radiogroup['"] style=\{styles\.choiceList\}>/);
  assert.match(lessonSource, /exercise\.choices\.map\(\(choice, index\) => \{/);
  assert.match(lessonSource, /const choiceStateLabel = feedback[\s\S]*?['"], correct answer['"][\s\S]*?['"], incorrect selection['"]/s);
  assert.match(lessonSource, /const choiceLabel = `\$\{choice\}, answer \$\{index \+ 1\} of \$\{exercise\.choices\.length\}\$\{choiceStateLabel\}`/);
  assert.match(lessonSource, /accessibilityLabel=\{choiceLabel\}[\s\S]*?accessibilityRole=['"]radio['"][\s\S]*?accessibilityState=\{\{ checked: selected, disabled: Boolean\(feedback\) \}\}/s);
});

test('word-tray controls clearly add and remove words with accessible state', () => {
  assert.match(lessonSource, /response\.builtWords\.map\(\(word, position\) => \(/);
  assert.match(lessonSource, /accessibilityLabel=\{`Remove word: \$\{word\.value\}, position \$\{position \+ 1\} of \$\{response\.builtWords\.length\}`\}/);
  assert.match(lessonSource, /accessibilityRole=['"]button['"][\s\S]*?accessibilityState=\{\{ disabled: Boolean\(feedback\) \}\}[\s\S]*?key=\{`built-/s);
  assert.match(lessonSource, /const duplicateCount = exercise\.wordBank\.filter\(\(word\) => word === value\)\.length/);
  assert.match(lessonSource, /const bankWordLabel = `Add word: \$\{value\}\$\{duplicateLabel\}`/);
  assert.match(lessonSource, /accessibilityLabel=\{used \? `\$\{bankWordLabel\}, already used` : bankWordLabel\}[\s\S]*?accessibilityRole=['"]button['"][\s\S]*?accessibilityState=\{\{ disabled: Boolean\(feedback\) \|\| used, selected: used \}\}/s);
});

test('lesson navigation, progress, footer, and completion actions expose explicit semantics', () => {
  assert.match(lessonSource, /accessibilityHint=['"]Closes this lesson and returns to the chapter['"][\s\S]*?accessibilityLabel=['"]Close lesson['"][\s\S]*?accessibilityRole=['"]button['"]/s);
  assert.match(lessonSource, /accessible[\s\S]*?accessibilityLabel=['"]Lesson progress['"][\s\S]*?accessibilityRole=['"]progressbar['"][\s\S]*?accessibilityValue=\{\{[\s\S]*?max: Math\.max\(exercises\.length, 1\)[\s\S]*?now: finished \? exercises\.length : index \+ 1/s);
  assert.match(lessonSource, /accessibilityLabel=\{`Start next topic: \$\{nextTopic\.title\}`\}[\s\S]*?accessibilityRole=['"]button['"]/s);
  assert.match(lessonSource, /accessibilityLabel=['"]Back to chapter['"][\s\S]*?accessibilityRole=['"]button['"]/s);
  assert.match(lessonSource, /const footerActionLabel = xpAwardFailed[\s\S]*?['"]Retry saving XP['"][\s\S]*?feedback === ['"]incorrect['"][\s\S]*?['"]Try again['"][\s\S]*?['"]Continue lesson['"][\s\S]*?['"]Check answer['"]/s);
  assert.match(lessonSource, /accessibilityLabel=\{footerActionLabel\}[\s\S]*?accessibilityRole=['"]button['"][\s\S]*?accessibilityState=\{\{ disabled: !footerReady \}\}/s);
});
