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

test('the lesson completion screen can launch the next unlocked topic directly from its completion card', () => {
  const modalSource = fs.readFileSync(path.join(root, 'src/components/mvp/PatoisLessonModal.js'), 'utf8');
  const homeSource = fs.readFileSync(path.join(root, 'src/screens/MvpHomeScreen.js'), 'utf8');

  assert.match(modalSource, /export default function PatoisLessonModal\(\{[\s\S]*onAdvance[\s\S]*topic,\s*visible\s*\}\)/);
  assert.match(modalSource, /<View style=\{styles\.completeActions\}>/);
  assert.match(modalSource, /nextTopic \? <Pressable onPress=\{\(\) => onAdvance\?\.\(nextTopic\)\} style=\{styles\.primaryButton\}><Text style=\{styles\.primaryButtonText\}>START NEXT TOPIC<\/Text><\/Pressable> : null/);
  assert.match(modalSource, /const completionBackButtonStyle = nextTopic \? styles\.secondaryButton : styles\.primaryButton/);
  assert.match(modalSource, /const completionBackButtonTextStyle = nextTopic \? styles\.secondaryButtonText : styles\.primaryButtonText/);
  assert.match(modalSource, /<Pressable onPress=\{closeLesson\} style=\{completionBackButtonStyle\}><Text style=\{completionBackButtonTextStyle\}>BACK TO CHAPTER<\/Text><\/Pressable>/);
  assert.match(modalSource, /completeActions:\s*\{/);
  assert.match(modalSource, /secondaryButton:\s*\{/);
  assert.match(modalSource, /secondaryButtonText:\s*\{/);
  assert.match(homeSource, /<PatoisLessonModal[\s\S]*onAdvance=\{setActiveTopic\}[\s\S]*visible=\{Boolean\(activeTopic\)\}/);
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

test('the lesson modal keeps the current topic title visible above every exercise prompt', () => {
  const source = fs.readFileSync(path.join(root, 'src/components/mvp/PatoisLessonModal.js'), 'utf8');

  assert.match(source, /<Text style=\{styles\.topicTitle\}>\{topic\.title\}<\/Text>/);
  assert.match(source, /topicTitle:\s*\{/);
});

test('every lesson type keeps the animated stage alive by deriving a stable visual concept for the scene', () => {
  const source = fs.readFileSync(path.join(root, 'src/components/mvp/PatoisLessonModal.js'), 'utf8');

  assert.match(source, /function getExerciseVisualConceptId\(exercise\)/);
  assert.match(source, /exercise\?\.imageConceptId \|\| exercise\?\.conceptId \|\| exercise\?\.pairs\?\.\[0\]\?\.conceptId \|\| null/);
  assert.match(source, /const exerciseVisualConceptId = getExerciseVisualConceptId\(exercise\);/);
  assert.match(source, /<View style=\{styles\.scene\}>[\s\S]*?<LessonClouds reducedMotion=\{reducedMotion\} \/>[\s\S]*?<BreathingVocabularyImage conceptId=\{exerciseVisualConceptId\} imageRegistry=\{imageRegistry\} reducedMotion=\{reducedMotion\} \/>[\s\S]*?<BreathingGuidePortrait guideName=\{topic\.guide \|\| ['"]Kai['"]\} reducedMotion=\{reducedMotion\} style=\{styles\.lessonGuide\} \/>[\s\S]*?<\/View>/s);
  assert.doesNotMatch(source, /\{!isMatch \?/);
});

test('the Learn shell surfaces the active topic in a dedicated current-focus card above the grid', () => {
  const source = fs.readFileSync(path.join(root, 'src/screens/MvpHomeScreen.js'), 'utf8');

  assert.match(source, /function getTopicFocusDescription\(topic\)/);
  assert.match(source, /const activeLearnTopic = topicStates\.find\(\(topic\) => topic\.state === ['"]active['"]\) \|\| topicStates\[0\] \|\| null/);
  assert.match(source, /<Pressable disabled=\{!activeLearnTopic\} onPress=\{\(\) => activeLearnTopic && setActiveTopic\(activeLearnTopic\)\} style=\{styles\.currentFocusCard\}>/);
  assert.match(source, /<Text style=\{styles\.currentFocusEyebrow\}>CURRENT FOCUS<\/Text>/);
  assert.match(source, /<Text style=\{styles\.currentFocusTitle\}>\{currentFocusTitle\}<\/Text>/);
  assert.match(source, /<Text style=\{styles\.currentFocusBody\}>\{currentFocusBody\}<\/Text>/);
  assert.match(source, /currentFocusCard:\s*\{/);
  assert.match(source, /currentFocusEyebrow:\s*\{/);
  assert.match(source, /currentFocusTitle:\s*\{/);
  assert.match(source, /currentFocusBody:\s*\{/);
});

test('the current-focus card spells out lesson position and a continue cue for the active topic', () => {
  const source = fs.readFileSync(path.join(root, 'src/screens/MvpHomeScreen.js'), 'utf8');

  assert.match(source, /const activeTopicIndex = activeLearnTopic \? topicStates\.findIndex\(\(topic\) => topic\.id === activeLearnTopic\.id\) \+ 1 : 1/);
  assert.match(source, /<View style=\{styles\.currentFocusFooter\}>/);
  assert.match(source, /<Text style=\{styles\.currentFocusMeta\}>\{currentFocusMetaLabel\}<\/Text>/);
  assert.match(source, /<Text style=\{styles\.currentFocusCta\}>\{currentFocusCtaLabel\}<\/Text>/);
  assert.match(source, /currentFocusFooter:\s*\{/);
  assert.match(source, /currentFocusMeta:\s*\{/);
  assert.match(source, /currentFocusCta:\s*\{/);
});

test('the current-focus card switches to a chapter-complete state instead of pretending there is another active lesson', () => {
  const source = fs.readFileSync(path.join(root, 'src/screens/MvpHomeScreen.js'), 'utf8');

  assert.match(source, /const chapterComplete = completedTopicCount >= topicStates\.length && topicStates\.length > 0/);
  assert.match(source, /const currentFocusTitle = chapterComplete \? ['"]Chapter complete['"] : activeLearnTopic\?\.title \|\| ['"]Getting Started['"]/);
  assert.match(source, /const currentFocusBody = chapterComplete \? ['"]You finished this chapter — replay any topic below whenever you want a refresher\.['"] : getTopicFocusDescription\(activeLearnTopic\)/);
  assert.match(source, /const currentFocusMetaLabel = chapterComplete \? ['"]9 topics complete['"] : `Lesson \$\{activeTopicIndex\} of \$\{topicStates\.length\}`/);
  assert.match(source, /const currentFocusCtaLabel = chapterComplete \? ['"]Review chapter ↓['"] : ['"]Tap to continue →['"]/);
  assert.match(source, /<Text style=\{styles\.currentFocusTitle\}>\{currentFocusTitle\}<\/Text>/);
  assert.match(source, /<Text style=\{styles\.currentFocusBody\}>\{currentFocusBody\}<\/Text>/);
  assert.match(source, /<Text style=\{styles\.currentFocusMeta\}>\{currentFocusMetaLabel\}<\/Text>/);
  assert.match(source, /<Text style=\{styles\.currentFocusCta\}>\{currentFocusCtaLabel\}<\/Text>/);
});
