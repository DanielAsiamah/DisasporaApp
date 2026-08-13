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
  assert.match(source, /<BreathingGuide[^>]+accessible=\{false\}[^>]+name=\{entry\.guide\}[^>]+reducedMotion=\{reducedMotion\}[^>]+style=\{styles\.podiumGuide\}/s);
  assert.match(source, /styles\.podiumTierFirst/);
  assert.match(source, /styles\.podiumTierSecond/);
  assert.match(source, /styles\.podiumTierThird/);
  assert.match(source, /<Image\s+accessible=\{false\}\s+resizeMode=['"]contain['"]\s+source=\{guideArt\[entry\.guide\]\}\s+style=\{styles\.rankAvatar\}\s*\/>/s);
});

test('leaderboard rankings below the podium live in their own card with a section title and supportive copy', () => {
  const source = fs.readFileSync(path.join(root, 'src/screens/MvpHomeScreen.js'), 'utf8');

  assert.match(source, /<View style=\{styles\.rankCard\}>[\s\S]*?<Text style=\{styles\.rankCardTitle\}>Your position<\/Text>[\s\S]*?<Text style=\{styles\.rankCardBody\}>\{progressCopy\}<\/Text>[\s\S]*?<View style=\{styles\.rankList\}>/s);
  assert.match(source, /rankCard:\s*\{[^}]*backgroundColor:\s*['"]#FFFFFF['"]/s);
  assert.match(source, /rankCard:\s*\{[^}]*borderRadius:\s*2\d/s);
  assert.match(source, /rankCard:\s*\{[^}]*padding:\s*1\d/s);
  assert.match(source, /rankCardTitle:\s*\{/);
  assert.match(source, /rankCardBody:\s*\{/);
});

test('leaderboard derives a truthful practice rank from saved profile XP and stable identity', () => {
  const source = fs.readFileSync(path.join(root, 'src/screens/MvpHomeScreen.js'), 'utf8');

  assert.match(source, /const \{ learner, progressCopy, rows \} = buildLeaderboard\(profile\)/);
  assert.doesNotMatch(source, /\[learner,\s*600/);
  assert.doesNotMatch(source, /name === learner/);
  assert.match(source, /<Text style=\{styles\.pageTitle\}>Practice League<\/Text>/);
  assert.match(source, /<View style=\{styles\.leaderboardSummaryRow\}>[\s\S]*?<View style=\{styles\.leaderboardSummaryPill\}>[\s\S]*?<Text style=\{styles\.leaderboardSummaryLabel\}>LEAGUE<\/Text>[\s\S]*?<Text style=\{styles\.leaderboardSummaryValue\}>Diaspora Practice<\/Text>[\s\S]*?<\/View>[\s\S]*?<View style=\{styles\.leaderboardSummaryPill\}>[\s\S]*?<Text style=\{styles\.leaderboardSummaryLabel\}>YOUR RANK<\/Text>[\s\S]*?<Text style=\{styles\.leaderboardSummaryValue\}>#\{learner\.rank\}<\/Text>[\s\S]*?<\/View>/s);
  assert.match(source, /leaderboardSummaryRow:\s*\{/);
  assert.match(source, /leaderboardSummaryPill:\s*\{/);
  assert.match(source, /leaderboardSummaryLabel:\s*\{/);
  assert.match(source, /leaderboardSummaryValue:\s*\{/);
});

test('leaderboard entries expose rank, name, XP, and current-user context as one accessible item', () => {
  const source = fs.readFileSync(path.join(root, 'src/screens/MvpHomeScreen.js'), 'utf8');

  assert.match(source, /key=\{entry\.id\}/);
  assert.match(source, /accessible\s+accessibilityLabel=\{formatLeaderboardEntryAccessibilityLabel\(entry\)\}/);
  assert.match(source, /entry\.isCurrentUser && styles\.rankRowYou/);
  assert.match(source, /showsVerticalScrollIndicator=\{false\}/);
});

test('the Learn screen keeps the final topic row clear of the fixed bottom tab bar on phone screens', () => {
  const source = fs.readFileSync(path.join(root, 'src/screens/MvpHomeScreen.js'), 'utf8');

  assert.match(source, /learnContent:\s*\{\s*paddingBottom:\s*(?:12\d|1[3-9]\d|[2-9]\d{2,})\s*\}/s);
});

test('hero clouds start off-canvas, settle into place, and then drift gently around their resting positions', () => {
  const source = fs.readFileSync(path.join(root, 'src/screens/MvpHomeScreen.js'), 'utf8');

  assert.match(source, /const CLOUD_OFFSCREEN_START = -(?:2\d{2}|[3-9]\d{2,})/);
  assert.match(source, /const CLOUD_DRIFT_DELTA = \d+/);
  assert.match(source, /new Animated\.Value\(CLOUD_OFFSCREEN_START\)/);
  assert.match(source, /Animated\.timing\(drift,\s*\{\s*toValue:\s*restingX/s);
  assert.match(source, /Animated\.timing\(drift,\s*\{\s*toValue:\s*restingX \+ CLOUD_DRIFT_DELTA/s);
  assert.match(source, /Animated\.timing\(drift,\s*\{\s*toValue:\s*restingX - CLOUD_DRIFT_DELTA/s);
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

  assert.match(source, /<LinearGradient[\s\S]*?<Cloud top=\{26\} size=\{82\} duration=\{16000\} restingX=\{CLOUD_PODIUM_RESTING_X\} reducedMotion=\{reducedMotion\} \/>[\s\S]*?<Cloud top=\{76\} size=\{60\} delay=\{2400\} duration=\{19000\} restingX=\{CLOUD_PODIUM_SECONDARY_RESTING_X\} reducedMotion=\{reducedMotion\} \/>/s);
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

test('the Learn topic grid uses centered spacing with enough width and bottom padding for tidy phone rows', () => {
  const source = fs.readFileSync(path.join(root, 'src/screens/MvpHomeScreen.js'), 'utf8');

  assert.match(source, /topicGrid:\s*\{[^}]*justifyContent:\s*['"]space-evenly['"]/s);
  assert.match(source, /topicGrid:\s*\{[^}]*paddingBottom:\s*2\d/s);
  assert.match(source, /topicWrap:\s*\{[^}]*width:\s*['"]30%['"]/s);
  assert.match(source, /topicWrap:\s*\{[^}]*marginBottom:\s*2\d/s);
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

test('the Learn chapter section sits in a floating white card that overlaps the hero instead of merging flatly into the page', () => {
  const source = fs.readFileSync(path.join(root, 'src/screens/MvpHomeScreen.js'), 'utf8');

  assert.match(source, /<View style=\{styles\.chapterCard\}>[\s\S]*?<View style=\{styles\.chapterHeader\}>/s);
  assert.match(source, /chapterCard:\s*\{[^}]*backgroundColor:\s*['"]#FFFFFF['"]/s);
  assert.match(source, /chapterCard:\s*\{[^}]*borderTopLeftRadius:\s*3\d/s);
  assert.match(source, /chapterCard:\s*\{[^}]*borderTopRightRadius:\s*3\d/s);
  assert.match(source, /chapterCard:\s*\{[^}]*marginTop:\s*-?[2-9]\d/s);
  assert.match(source, /chapterCard:\s*\{[^}]*paddingTop:\s*2\d/s);
  assert.match(source, /chapterHeader:\s*\{[^}]*paddingHorizontal:\s*20/s);
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
  assert.match(modalSource, /nextTopic \? \([\s\S]*?<Pressable[\s\S]*?accessibilityLabel=\{`Start next topic: \$\{nextTopic\.title\}`\}[\s\S]*?onPress=\{\(\) => onAdvance\?\.\(nextTopic\)\}[\s\S]*?style=\{styles\.primaryButton\}[\s\S]*?<Text style=\{styles\.primaryButtonText\}>START NEXT TOPIC<\/Text>[\s\S]*?<\/Pressable>[\s\S]*?\) : null/s);
  assert.match(modalSource, /const completionBackButtonStyle = nextTopic \? styles\.secondaryButton : styles\.primaryButton/);
  assert.match(modalSource, /const completionBackButtonTextStyle = nextTopic \? styles\.secondaryButtonText : styles\.primaryButtonText/);
  assert.match(modalSource, /<Pressable[\s\S]*?accessibilityLabel=['"]Back to chapter['"][\s\S]*?onPress=\{closeLesson\}[\s\S]*?style=\{completionBackButtonStyle\}[\s\S]*?<Text style=\{completionBackButtonTextStyle\}>BACK TO CHAPTER<\/Text>[\s\S]*?<\/Pressable>/s);
  assert.match(modalSource, /completeActions:\s*\{/);
  assert.match(modalSource, /secondaryButton:\s*\{/);
  assert.match(modalSource, /secondaryButtonText:\s*\{/);
  assert.match(homeSource, /<PatoisLessonModal[\s\S]*onAdvance=\{setActiveTopic\}[\s\S]*visible=\{Boolean\(activeTopic\)\}/);
});

test('the lesson completion screen scrolls safely on short phones while preserving a centered celebration card', () => {
  const source = fs.readFileSync(path.join(root, 'src/components/mvp/PatoisLessonModal.js'), 'utf8');

  assert.match(source, /<ScrollView contentContainerStyle=\{styles\.completeScrollContent\} showsVerticalScrollIndicator=\{false\} style=\{styles\.completeScroll\}>[\s\S]*?<View style=\{styles\.completeScreen\}>[\s\S]*?<Text style=\{styles\.completeTitle\}>\{completionTitle\}<\/Text>[\s\S]*?<View style=\{styles\.completeActions\}>/s);
  assert.match(source, /completeScroll:\s*\{[^}]*flex:\s*1/s);
  assert.match(source, /completeScrollContent:\s*\{[^}]*flexGrow:\s*1[^}]*justifyContent:\s*['"]center['"]/s);
  assert.match(source, /completeScreen:\s*\{[^}]*paddingBottom:\s*(?:2[4-9]|[3-9]\d)/s);
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

test('the lesson modal adds a compact summary row so learners can see the current step and exercise mode at a glance', () => {
  const source = fs.readFileSync(path.join(root, 'src/components/mvp/PatoisLessonModal.js'), 'utf8');

  assert.match(source, /const currentStepLabel = `STEP \$\{Math\.min\(index \+ 1, exercises\.length\)\} OF \$\{exercises\.length\}`/);
  assert.match(source, /const currentExerciseLabel = exercise\?\.title \|\| ['"]Lesson step['"]/);
  assert.match(source, /<View style=\{styles\.lessonSummaryRow\}>[\s\S]*?<View style=\{styles\.lessonSummaryPill\}>[\s\S]*?<Text style=\{styles\.lessonSummaryLabel\}>\{currentStepLabel\}<\/Text>[\s\S]*?<\/View>[\s\S]*?<View style=\{styles\.lessonSummaryPill\}>[\s\S]*?<Text style=\{styles\.lessonSummaryValue\}>\{currentExerciseLabel\}<\/Text>[\s\S]*?<\/View>/s);
  assert.match(source, /lessonSummaryRow:\s*\{/);
  assert.match(source, /lessonSummaryPill:\s*\{/);
  assert.match(source, /lessonSummaryLabel:\s*\{/);
  assert.match(source, /lessonSummaryValue:\s*\{/);
});

test('the lesson modal structures feedback into an outcome header and dedicated answer reveal card', () => {
  const source = fs.readFileSync(path.join(root, 'src/components/mvp/PatoisLessonModal.js'), 'utf8');

  assert.match(source, /<View style=\{styles\.feedbackHeader\}>[\s\S]*?<Text style=\{styles\.feedbackEyebrow\}>\{feedback === ['"]correct['"] \? ['"]NICE WORK['"] : ['"]KEEP GOING['"]\}<\/Text>[\s\S]*?<Text style=\{styles\.feedbackTitle\}>\{feedback === ['"]correct['"] \? ['"]Correct! \+10 XP['"] : ['"]Almost — try again['"]\}<\/Text>[\s\S]*?<\/View>/s);
  assert.match(source, /const exerciseAnswerLabel = getExerciseAnswerLabel\(exercise\)/);
  assert.match(source, /<View style=\{styles\.feedbackAnswerCard\}>[\s\S]*?<Text style=\{styles\.feedbackAnswerLabel\}>ANSWER<\/Text>[\s\S]*?<Text style=\{styles\.feedbackAnswer\}>\{exerciseAnswerLabel\}<\/Text>[\s\S]*?<\/View>/s);
  assert.match(source, /feedbackHeader:\s*\{/);
  assert.match(source, /feedbackEyebrow:\s*\{/);
  assert.match(source, /feedbackAnswerCard:\s*\{/);
  assert.match(source, /feedbackAnswerLabel:\s*\{/);
});

test('word-tray lessons add compact headers so learners can track progress and understand how to use the bank', () => {
  const source = fs.readFileSync(path.join(root, 'src/components/mvp/PatoisLessonModal.js'), 'utf8');

  assert.match(source, /const answerProgressLabel = `\$\{response\.builtWords\.length\} \/ \$\{exercise\.wordBank\.length\} words placed`/);
  assert.match(source, /<View style=\{styles\.sectionHeader\}>[\s\S]*?<Text style=\{styles\.sectionLabel\}>YOUR ANSWER<\/Text>[\s\S]*?<Text style=\{styles\.sectionMeta\}>\{answerProgressLabel\}<\/Text>[\s\S]*?<\/View>/s);
  assert.match(source, /<View style=\{styles\.sectionHeader\}>[\s\S]*?<Text style=\{styles\.sectionLabel\}>WORD BANK<\/Text>[\s\S]*?<Text style=\{styles\.sectionMeta\}>Tap a word to add it below<\/Text>[\s\S]*?<\/View>/s);
  assert.match(source, /sectionHeader:\s*\{/);
  assert.match(source, /sectionMeta:\s*\{/);
});

test('matching lessons explain both columns, surface pair progress, and announce interaction state accessibly', () => {
  const source = fs.readFileSync(path.join(root, 'src/components/mvp/PatoisLessonModal.js'), 'utf8');

  assert.match(source, /const matchedPairCount = response\.matchedPairIds\.length/);
  assert.match(source, /const matchProgressLabel = `\$\{matchedPairCount\} \/ \$\{exercise\.pairs\.length\} pairs matched`/);
  assert.match(source, /<View style=\{styles\.matchHeader\}>[\s\S]*?<Text style=\{styles\.sectionLabel\}>MATCH THE PAIRS<\/Text>[\s\S]*?<Text style=\{styles\.sectionMeta\}>\{matchProgressLabel\}<\/Text>[\s\S]*?<\/View>/s);
  assert.match(source, /<Text style=\{styles\.matchColumnLabel\}>PHRASE<\/Text>[\s\S]*?\{column\(exercise\.leftItems, ['"]left['"]\)\}/s);
  assert.match(source, /<Text style=\{styles\.matchColumnLabel\}>MEANING<\/Text>[\s\S]*?\{column\(exercise\.rightItems, ['"]right['"]\)\}/s);
  assert.match(source, /const matchStateLabel = matched \? ['"]matched['"] : selected \? ['"]selected['"] : ['"]not selected['"]/);
  assert.match(source, /accessibilityLabel=\{`\$\{side === ['"]left['"] \? ['"]Phrase['"] : ['"]Meaning['"]\}: \$\{item\.value\}, \$\{matchStateLabel\}`\}/);
  assert.match(source, /accessibilityRole=['"]button['"]/);
  assert.match(source, /accessibilityState=\{\{ disabled: Boolean\(feedback\) \|\| matched, selected, checked: matched \}\}/);
  assert.match(source, /AccessibilityInfo\.announceForAccessibility\(matchMessage\)/);
  assert.match(source, /accessibilityLiveRegion=['"]polite['"][\s\S]*?style=\{styles\.matchMessage\}/s);
  assert.match(source, /matchHeader:\s*\{/);
  assert.match(source, /matchColumnLabel:\s*\{/);
});

test('every lesson type keeps the animated stage alive by deriving a stable visual concept for the scene', () => {
  const source = fs.readFileSync(path.join(root, 'src/components/mvp/PatoisLessonModal.js'), 'utf8');

  assert.match(source, /function getExerciseVisualConceptId\(exercise\)/);
  assert.match(source, /exercise\?\.imageConceptId \|\| exercise\?\.conceptId \|\| exercise\?\.pairs\?\.\[0\]\?\.conceptId \|\| null/);
  assert.match(source, /const exerciseVisualConceptId = getExerciseVisualConceptId\(exercise\);/);
  assert.match(source, /<View style=\{styles\.scene\}>[\s\S]*?<LessonClouds[\s\S]*?primaryRestingX=\{LESSON_CLOUD_PRIMARY_RESTING_X\}[\s\S]*?secondaryRestingX=\{LESSON_CLOUD_SECONDARY_RESTING_X\}[\s\S]*?reducedMotion=\{reducedMotion\}[\s\S]*?\/>[\s\S]*?<BreathingVocabularyImage conceptId=\{exerciseVisualConceptId\} imageRegistry=\{imageRegistry\} reducedMotion=\{reducedMotion\} \/>[\s\S]*?<BreathingGuidePortrait guideName=\{topic\.guide \|\| ['"]Kai['"]\} reducedMotion=\{reducedMotion\} style=\{styles\.lessonGuide\} \/>[\s\S]*?<\/View>/s);
  assert.doesNotMatch(source, /\{!isMatch \?/);
});

test('the Learn shell surfaces the active topic in a dedicated current-focus card above the grid', () => {
  const source = fs.readFileSync(path.join(root, 'src/screens/MvpHomeScreen.js'), 'utf8');

  assert.match(source, /function getTopicFocusDescription\(topic\)/);
  assert.match(source, /const activeLearnTopic = topicStates\.find\(\(topic\) => topic\.state === ['"]active['"]\) \|\| topicStates\[0\] \|\| null/);
  assert.match(source, /<Pressable\s+accessibilityHint=\{currentFocusHint\}[\s\S]*?disabled=\{!activeLearnTopic\}[\s\S]*?onPress=\{\(\) => activeLearnTopic && setActiveTopic\(activeLearnTopic\)\}[\s\S]*?style=\{styles\.currentFocusCard\}\s*>/s);
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
  assert.match(source, /const currentFocusHint = chapterComplete[\s\S]*?`Opens \$\{activeLearnTopic\?\.title \|\| ['"]the first topic['"]\} for review`[\s\S]*?: ['"]Opens your current lesson['"]/s);
  assert.match(source, /const currentFocusCtaLabel = chapterComplete[\s\S]*?`Review \$\{activeLearnTopic\?\.title \|\| ['"]first topic['"]\} →`[\s\S]*?: ['"]Tap to continue →['"]/s);
  assert.match(source, /<Text style=\{styles\.currentFocusTitle\}>\{currentFocusTitle\}<\/Text>/);
  assert.match(source, /<Text style=\{styles\.currentFocusBody\}>\{currentFocusBody\}<\/Text>/);
  assert.match(source, /<Text style=\{styles\.currentFocusMeta\}>\{currentFocusMetaLabel\}<\/Text>/);
  assert.match(source, /<Text style=\{styles\.currentFocusCta\}>\{currentFocusCtaLabel\}<\/Text>/);
});

test('Learn topics, current focus, and bottom tabs expose clear accessible roles and states', () => {
  const source = fs.readFileSync(path.join(root, 'src/screens/MvpHomeScreen.js'), 'utf8');

  assert.match(source, /const topicStateLabel = isLocked \? ['"]locked['"] : isComplete \? ['"]completed['"] : ['"]ready to learn['"]/);
  assert.match(source, /accessibilityLabel=\{`\$\{topic\.title\}, \$\{topicStateLabel\}`\}/);
  assert.match(source, /accessibilityRole=['"]button['"][\s\S]*?accessibilityState=\{\{ disabled: isLocked, selected: topic\.state === ['"]active['"] \}\}/s);
  assert.match(source, /accessibilityLabel=\{`\$\{currentFocusTitle\}\. \$\{currentFocusMetaLabel\}`\}/);
  assert.match(source, /accessibilityHint=\{currentFocusHint\}[\s\S]*?accessibilityLabel=\{`\$\{currentFocusTitle\}\. \$\{currentFocusMetaLabel\}`\}[\s\S]*?accessibilityRole=['"]button['"][\s\S]*?accessibilityState=\{\{ disabled: !activeLearnTopic \}\}/s);
  assert.match(source, /\.map\(\(\[id, icon, label\], index\) => \(/);
  assert.match(source, /accessibilityLabel=\{`\$\{label\}, \$\{index \+ 1\} of 2, main navigation`\}/);
  assert.match(source, /accessibilityRole=['"]tab['"][\s\S]*?accessibilityState=\{\{ selected: activeTab === id \}\}/s);
  assert.match(source, /tabButton:\s*\{[^}]*minHeight:\s*(?:4[8-9]|[5-9]\d)/s);
});
