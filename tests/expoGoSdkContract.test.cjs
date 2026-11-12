const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const packageJson = require('../package.json');
const appJson = require('../app.json');

test('physical iPhone Expo Go stays on the supported SDK 58 runtime', () => {
  assert.match(packageJson.dependencies.expo, /^[~^]58\./);
  assert.equal(packageJson.dependencies.react, '19.3.0');
  assert.match(packageJson.dependencies['react-native'], /^0\.88\./);
  assert.match(packageJson.scripts['phone:preview'], /expo start --go --tunnel/);
});

test('SDK 58 app config contains only valid config plugins', () => {
  const pluginNames = appJson.expo.plugins.map((entry) => (
    Array.isArray(entry) ? entry[0] : entry
  ));

  assert.ok(pluginNames.includes('expo-font'));
  assert.ok(pluginNames.includes('expo-audio'));
  assert.ok(pluginNames.includes('expo-status-bar'));
  assert.ok(fs.existsSync(path.join(root, 'node_modules', 'expo-status-bar', 'app.plugin.js')));
});

test('the current phone handoff names SDK 58 and does not claim a device test', () => {
  const handoff = fs.readFileSync(
    path.join(root, 'docs/handoff/expo-go-sdk-58-current.md'),
    'utf8'
  );

  assert.match(handoff, /Expo SDK 58/);
  assert.match(handoff, /physical iPhone interaction remains unverified/i);
  assert.doesNotMatch(handoff, /SDK 54 from the iOS App Store/);
});
