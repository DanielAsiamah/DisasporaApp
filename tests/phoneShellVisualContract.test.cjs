const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

test('the white MVP shell requests a light system appearance with a dark status bar', () => {
  const appConfig = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
  const appSource = fs.readFileSync(path.join(root, 'App.js'), 'utf8');

  assert.equal(appConfig.expo.userInterfaceStyle, 'light');
  assert.match(appSource, /import\s+\{\s*StatusBar\s*\}\s+from\s+['"]expo-status-bar['"]/);
  assert.match(appSource, /<StatusBar\s+style=['"]dark['"]\s*\/>/);
});

test('the drifting hero cloud uses one opaque fill so overlapping lobes have no bubble seams', () => {
  const source = fs.readFileSync(path.join(root, 'src/screens/MvpHomeScreen.js'), 'utf8');

  assert.match(source, /const CLOUD_FILL = ['"]#[0-9A-F]{6}['"]/i);
  assert.match(source, /cloud:\s*\{[^}]*backgroundColor:\s*CLOUD_FILL/s);
  assert.match(source, /cloudBubble:\s*\{[^}]*backgroundColor:\s*CLOUD_FILL/s);
  assert.doesNotMatch(source, /cloud(?:Bubble)?:\s*\{[^}]*rgba\(/s);
});

test('leaderboard podium uses animated guide characters on tiered podium blocks while rank rows keep contained PNG avatars', () => {
  const source = fs.readFileSync(path.join(root, 'src/screens/MvpHomeScreen.js'), 'utf8');

  assert.match(source, /function Leaderboard\(\{\s*profile,\s*reducedMotion\s*\}\)/);
  assert.match(source, /<BreathingGuide[^>]+name=\{guide\}[^>]+reducedMotion=\{reducedMotion\}[^>]+style=\{styles\.podiumGuide\}/s);
  assert.match(source, /styles\.podiumTierFirst/);
  assert.match(source, /styles\.podiumTierSecond/);
  assert.match(source, /styles\.podiumTierThird/);
  assert.match(source, /<Image\s+resizeMode=['"]contain['"]\s+source=\{guideArt\[guide\]\}\s+style=\{styles\.rankAvatar\}\s*\/>/s);
});

test('the Learn screen keeps the final topic row clear of the fixed bottom tab bar on phone screens', () => {
  const source = fs.readFileSync(path.join(root, 'src/screens/MvpHomeScreen.js'), 'utf8');

  assert.match(source, /learnContent:\s*\{\s*paddingBottom:\s*(?:12\d|1[3-9]\d|[2-9]\d{2,})\s*\}/s);
});

test('hero clouds start fully off-canvas so detached white bubbles never peek in from the screen edge', () => {
  const source = fs.readFileSync(path.join(root, 'src/screens/MvpHomeScreen.js'), 'utf8');

  assert.match(source, /const CLOUD_OFFSCREEN_START = -(?:2\d{2}|[3-9]\d{2,})/);
  assert.match(source, /new Animated\.Value\(CLOUD_OFFSCREEN_START\)/);
  assert.match(source, /Animated\.timing\(drift,\s*\{\s*toValue:\s*CLOUD_OFFSCREEN_START/s);
});

test('lesson prompts render inside a dedicated learning card with helper copy and inline audio controls', () => {
  const source = fs.readFileSync(path.join(root, 'src/components/mvp/PatoisLessonModal.js'), 'utf8');

  assert.match(source, /function getExerciseHelperText\(exercise\)/);
  assert.match(source, /<View style=\{styles\.promptCard\}>[\s\S]*?<Text style=\{styles\.prompt\}>\{exercise\?\.prompt\}<\/Text>[\s\S]*?<Text style=\{styles\.promptHelper\}>\{getExerciseHelperText\(exercise\)\}<\/Text>[\s\S]*?<AudioControls/s);
  assert.match(source, /promptCard:\s*\{/);
  assert.match(source, /promptHelper:\s*\{/);
});

test('leaderboard podium card reuses the drifting cloud treatment with reduced-motion support', () => {
  const source = fs.readFileSync(path.join(root, 'src/screens/MvpHomeScreen.js'), 'utf8');

  assert.match(source, /<LinearGradient[\s\S]*?<Cloud top=\{26\} size=\{82\} duration=\{16000\} reducedMotion=\{reducedMotion\} \/>[\s\S]*?<Cloud top=\{76\} size=\{60\} delay=\{2400\} duration=\{19000\} reducedMotion=\{reducedMotion\} \/>/s);
});

test('review and challenge topics get their own Learn-grid treatment instead of looking like generic numbered lessons', () => {
  const source = fs.readFileSync(path.join(root, 'src/screens/MvpHomeScreen.js'), 'utf8');

  assert.match(source, /function getTopicDisplayGlyph\(topic\)/);
  assert.match(source, /function getTopicBadgeLabel\(topic\)/);
  assert.match(source, /topic\.type === ['"]review['"]/);
  assert.match(source, /topic\.type === ['"]challenge['"]/);
  assert.match(source, /const topicGlyph = getTopicDisplayGlyph\(topic\)/);
  assert.match(source, /const topicBadgeLabel = getTopicBadgeLabel\(topic\)/);
  assert.match(source, /\{isLocked \? ['"]🔒['"] : isComplete \? ['"]✓['"] : topicGlyph\}/);
  assert.match(source, /topicBadgeLabel \? <Text style=\{styles\.topicBadge\}>\{topicBadgeLabel\}<\/Text> : null/);
  assert.match(source, /topicBadge:\s*\{/);
});

test('the Learn chapter header summarizes real progress and the next topic above the grid', () => {
  const source = fs.readFileSync(path.join(root, 'src/screens/MvpHomeScreen.js'), 'utf8');

  assert.match(source, /const completedTopicCount = topicStates\.filter\(\(topic\) => topic\.state === ['"]complete['"]\)\.length/);
  assert.match(source, /const nextUpTopic = topicStates\.find\(\(topic\) => topic\.state === ['"]active['"]\) \|\| null/);
  assert.match(source, /const chapterProgressLabel = `\$\{completedTopicCount\} of \$\{topicStates\.length\} topics complete`/);
  assert.match(source, /const nextUpLabel = completedTopicCount >= topicStates\.length[\s\S]*?['"]Chapter complete['"][\s\S]*?`Next up: \$\{nextUpTopic\?\.title \|\| ['"]Getting Started['"]\}`/);
  assert.match(source, /<View style=\{styles\.chapterSummaryRow\}>[\s\S]*?<Text style=\{styles\.chapterSummaryText\}>\{chapterProgressLabel\}<\/Text>[\s\S]*?<Text style=\{styles\.chapterSummaryText\}>\{nextUpLabel\}<\/Text>/s);
  assert.match(source, /chapterSummaryRow:\s*\{/);
  assert.match(source, /chapterSummaryPill:\s*\{/);
  assert.match(source, /chapterSummaryText:\s*\{/);
});

test('the lesson completion screen names the unlocked next topic instead of using only generic copy', () => {
  const source = fs.readFileSync(path.join(root, 'src/components/mvp/PatoisLessonModal.js'), 'utf8');

  assert.match(source, /const courseTopics = useMemo\(\(\) => \(/);
  assert.match(source, /GENERATED_CURRICULUM\.topics/);
  assert.match(source, /const nextTopic = useMemo\(\(\) => courseTopics\.find\(\(candidate\) => candidate\.order === \(topic\?\.order \?\? 0\) \+ 1\) \|\| null, \[courseTopics, topic\?\.order\]\)/);
  assert.match(source, /nextTopic \? `You finished \$\{topic\.title\}\. Next up: \$\{nextTopic\.title\}\.` : `You finished \$\{topic\.title\} and completed this chapter\.`/);
  assert.match(source, /nextTopic \? <View style=\{styles\.completeNextPill\}><Text style=\{styles\.completeNextPillText\}>Next up: \{nextTopic\.title\}<\/Text><\/View> : null/);
  assert.match(source, /completeNextPill:\s*\{/);
  assert.match(source, /completeNextPillText:\s*\{/);
});

test('review and challenge lessons carry their own mode label and completion title inside the modal', () => {
  const source = fs.readFileSync(path.join(root, 'src/components/mvp/PatoisLessonModal.js'), 'utf8');

  assert.match(source, /function getTopicModeLabel\(topic\)/);
  assert.match(source, /topic\.type === ['"]review['"]/);
  assert.match(source, /topic\.type === ['"]challenge['"]/);
  assert.match(source, /const topicModeLabel = getTopicModeLabel\(topic\)/);
  assert.match(source, /const completionTitle = topic\.type === ['"]challenge['"] \? ['"]Challenge complete!['"] : topic\.type === ['"]review['"] \? ['"]Review complete!['"] : ['"]Topic complete!['"]/);
  assert.match(source, /<View style=\{styles\.topicModePill\}><Text style=\{styles\.topicModePillText\}>\{topicModeLabel\}<\/Text><\/View>/);
  assert.match(source, /<Text style=\{styles\.completeTitle\}>\{completionTitle\}<\/Text>/);
  assert.match(source, /topicModePill:\s*\{/);
  assert.match(source, /topicModePillText:\s*\{/);
});
