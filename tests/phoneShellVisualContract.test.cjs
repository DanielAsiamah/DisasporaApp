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
