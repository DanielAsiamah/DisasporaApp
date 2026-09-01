const test = require('node:test');
const assert = require('node:assert/strict');

const {
  REQUIRED_PUBLIC_ENV_NAMES,
  checkPublicEnvValues,
  parseDotenvContent,
  summarizePublicEnvCheck,
} = require('../scripts/lib/public-env-check.cjs');

test('dotenv parser reads simple public Expo values without exposing comments', () => {
  assert.deepEqual(
    parseDotenvContent(`
# local config
EXPO_PUBLIC_FIREBASE_API_KEY=AIza-demo
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID="123-web.apps.googleusercontent.com"
EMPTY=
    `),
    {
      EMPTY: '',
      EXPO_PUBLIC_FIREBASE_API_KEY: 'AIza-demo',
      EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: '123-web.apps.googleusercontent.com',
    }
  );
});

test('public env check reports missing and placeholder variable names only', () => {
  const result = checkPublicEnvValues({
    EXPO_PUBLIC_FIREBASE_API_KEY: 'your_api_key_here',
    EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: 'diasporaapp.firebaseapp.com',
    EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'diasporaapp',
    EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: 'diasporaapp.firebasestorage.app',
    EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '',
    EXPO_PUBLIC_FIREBASE_APP_ID: '1:123:web:abc',
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: '123-web.apps.googleusercontent.com',
    EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: 'your_ios_client_id.apps.googleusercontent.com',
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.configuredNames.sort(), [
    'EXPO_PUBLIC_FIREBASE_APP_ID',
    'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
    'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
  ].sort());
  assert.deepEqual(result.missingNames, ['EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID']);
  assert.deepEqual(result.placeholderNames.sort(), [
    'EXPO_PUBLIC_FIREBASE_API_KEY',
    'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID',
  ].sort());
  assert.equal(JSON.stringify(result).includes('your_api_key_here'), false);
});

test('public env check passes when every required value is configured', () => {
  const result = checkPublicEnvValues(Object.fromEntries(
    REQUIRED_PUBLIC_ENV_NAMES.map((name, index) => [name, `real-value-${index}`])
  ));

  assert.equal(result.ok, true);
  assert.deepEqual(result.missingNames, []);
  assert.deepEqual(result.placeholderNames, []);
});

test('public env summary avoids printing secret values', () => {
  const summary = summarizePublicEnvCheck(checkPublicEnvValues({
    EXPO_PUBLIC_FIREBASE_API_KEY: 'your_api_key_here',
    EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: 'diasporaapp.firebaseapp.com',
  }));

  assert.match(summary, /Public env check failed/);
  assert.match(summary, /EXPO_PUBLIC_FIREBASE_API_KEY/);
  assert.doesNotMatch(summary, /your_api_key_here/);
  assert.doesNotMatch(summary, /diasporaapp\.firebaseapp\.com/);
});
