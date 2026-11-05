const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const packageJson = require('../package.json');
const appJson = require('../app.json');

test('physical iPhone Expo Go stays on the supported SDK 54 runtime', () => {
  assert.match(packageJson.dependencies.expo, /^~54\./);
  assert.equal(packageJson.dependencies.react, '19.1.0');
  assert.equal(packageJson.dependencies['react-native'], '0.81.5');
  assert.match(packageJson.scripts['phone:preview'], /expo start --go --tunnel/);
});

test('SDK 54 app config contains only valid config plugins', () => {
  const pluginNames = appJson.expo.plugins.map((entry) => (
    Array.isArray(entry) ? entry[0] : entry
  ));

  assert.ok(pluginNames.includes('expo-font'));
  assert.ok(pluginNames.includes('expo-audio'));
  assert.ok(!pluginNames.includes('expo-status-bar'));
});

test('the current phone handoff names SDK 54 and does not claim a device test', () => {
  const handoff = fs.readFileSync(
    path.join(root, 'docs/handoff/expo-go-sdk-54-current.md'),
    'utf8'
  );

  assert.match(handoff, /Expo SDK 54/);
  assert.match(handoff, /physical iPhone interaction remains unverified/i);
  assert.doesNotMatch(handoff, /SDK 58 from the iOS App Store/);
});
