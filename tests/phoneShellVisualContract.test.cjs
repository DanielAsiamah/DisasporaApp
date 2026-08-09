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

test('leaderboard character artwork always uses contained static PNG rendering', () => {
  const source = fs.readFileSync(path.join(root, 'src/screens/MvpHomeScreen.js'), 'utf8');

  assert.match(source, /<Image\s+resizeMode=['"]contain['"]\s+source=\{guideArt\[guide\]\}\s+style=\{styles\.podiumAvatar\}\s*\/>/s);
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
