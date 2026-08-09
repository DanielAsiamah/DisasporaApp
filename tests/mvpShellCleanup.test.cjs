const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const MVP_HOME_PATH = path.join(__dirname, '..', 'src', 'screens', 'MvpHomeScreen.js');
const source = fs.readFileSync(MVP_HOME_PATH, 'utf8');
const lessonSource = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'components', 'mvp', 'PatoisLessonModal.js'),
  'utf8'
);
const presentationRegistrySource = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'data', 'coursePresentationRegistry.js'),
  'utf8'
);

test('MVP shell delegates lessons to the production Patois lesson modal', () => {
  assert.match(source, /import PatoisLessonModal from ['"]\.\.\/components\/mvp\/PatoisLessonModal['"]/);
  assert.match(source, /<PatoisLessonModal\b/);
  assert.doesNotMatch(source, /function\s+LessonModal\s*\(/);
  assert.doesNotMatch(source, /function\s+buildExercises\s*\(/);
  assert.doesNotMatch(source, /^\s*Modal,\s*$/m);
  assert.doesNotMatch(source, /\bJAMAICAN_PATOIS_VOCABULARY\b/);
});

test('MVP shell retains the approved chapter contract', () => {
  assert.match(source, /courseChapter\?\.title \|\| ['"]Greetings & basic conversations['"]/);
  assert.match(source, /courseChapter\?\.topicCount \?\? 9/);
  assert.match(source, /courseChapter\?\.wordCount \?\? 39/);
  assert.match(source, /\[['"]learn['"],\s*[^,]+,\s*['"]Learn['"]\],\s*\[['"]leaderboard['"],\s*[^,]+,\s*['"]Leaderboard['"]\]/);
});

test('the Learn shell derives chapter title and meta from the rebuilt curriculum chapter row', () => {
  assert.match(source, /const courseChapter = useMemo\(\(\) => \(/);
  assert.match(source, /GENERATED_CURRICULUM\.chapters/);
  assert.match(source, /chapter\.courseId === storageCourseId/);
  assert.match(source, /<Text style=\{styles\.chapterTitle\}>\{courseChapter\?\.title \|\| ['"]Greetings & basic conversations['"]\}<\/Text>/);
  assert.match(source, /<Text style=\{styles\.chapterMeta\}>\{`\$\{courseChapter\?\.topicCount \?\? 9\} topics .* \$\{courseChapter\?\.wordCount \?\? 39\} words`\}<\/Text>/);
});

test('the chapter uses original Jamaica artwork behind the active topic guide instead of a hardcoded mascot', () => {
  assert.match(source, /getCoursePresentation\(storageCourseId\)/);
  assert.match(presentationRegistrySource, /jamaican-patois-greetings\.png/);
  assert.match(source, /function\s+ChapterHero\s*\(/);
  assert.match(source, /const\s+featuredGuide\s*=\s*topicStates\.find\(\(topic\)\s*=>\s*topic\.state\s*===\s*['"]active['"]\)\?\.guide/);
  assert.match(source, /<ChapterHero[^>]+guideName=\{featuredGuide\}/s);
  assert.match(source, /<BreathingGuide[^>]+name=\{guideName\}/s);
  assert.doesNotMatch(source, /<BreathingGuide\s+name="Kai"/);
  assert.match(source, /<Cloud\b/);
  assert.match(source, /courseId\s*=\s*['"]jamaican-patois['"]/);
});

test('legacy product destinations and exercises are absent from visible MVP copy', () => {
  const bannedVisibleCopy = [
    'Shop',
    'Progress',
    'Profile',
    'Settings',
    'Video call',
    'Microphone',
    'Mascot store',
    'Brown path',
  ];

  for (const label of bannedVisibleCopy) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const visibleLiteral = new RegExp("(?:>|['\"])\\s*" + escaped + "\\s*(?:<|['\"])", 'i');
    assert.doesNotMatch(source, visibleLiteral, `${label} must not appear as MVP navigation or lesson copy`);
  }
});

test('preview courses disclose that native review is still pending in the shell and active lessons', () => {
  assert.match(source, /const courseReviewPending = runtimeCourse\?\.published !== true/);
  assert.match(source, /Native review pending/);
  assert.match(source, /awaiting native-speaker approval/i);
  assert.match(lessonSource, /const courseReviewPending = runtimeCourse\?\.published !== true/);
  assert.match(lessonSource, /Native review pending/);
  assert.match(lessonSource, /preview content is still awaiting native-speaker approval/i);
});

test('the retired brown-path lesson implementation is physically removed', () => {
  const retiredPaths = [
    'src/screens/HomeScreen.js',
    'src/screens/StartUnitScreen.js',
    'src/screens/ProficiencyCheckScreen.js',
    'src/data/curriculumRepository.js',
    'src/data/generatedCourses.js',
    'src/data/generatedImageRegistry.js',
    'src/data/lessons.js',
    'src/data/patoisCurriculum.js',
    'src/lessonEngine/buildLessonSteps.js',
    'src/components/lesson/AudioPressable.js',
    'src/components/lesson/LanguageMascot.js',
    'src/components/lesson/LessonAudioButton.js',
    'src/components/lesson/LessonCutscene.js',
    'src/components/lesson/LessonStepRenderer.js',
    'src/components/lesson/MascotSpeechBubble.js',
    'src/components/lesson/TeachingSlide.js',
    'src/components/lesson/VocabularyCard.js',
  ];

  for (const relativePath of retiredPaths) {
    assert.equal(
      fs.existsSync(path.join(__dirname, '..', relativePath)),
      false,
      `${relativePath} must not remain as a fallback to the retired lesson UI`
    );
  }
});
