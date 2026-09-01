const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getOptionalConfiguredPublicEnv,
  isGoogleSignInConfigured,
  isConfiguredPublicEnvValue,
  requireConfiguredPublicEnv,
} = require('../src/config/publicEnv.cjs');

test('public env validation rejects missing and example placeholder values', () => {
  for (const value of [
    undefined,
    null,
    '',
    '   ',
    'your_api_key_here',
    'your_messaging_sender_id',
    'your_app_id_here',
    'your_web_client_id.apps.googleusercontent.com',
    '<firebase_web_api_key>',
  ]) {
    assert.equal(isConfiguredPublicEnvValue(value), false, `expected ${value} to be rejected`);
  }
});

test('public env validation accepts real-looking client configuration values', () => {
  for (const value of [
    'AIzaSyA-real-public-web-client-key',
    '123456789012',
    '1:123456789012:web:abcdef1234567890',
    '123-exampleoauthid.apps.googleusercontent.com',
    'diasporaapp.firebaseapp.com',
  ]) {
    assert.equal(isConfiguredPublicEnvValue(value), true, `expected ${value} to be accepted`);
  }
});

test('required public env values fail closed with the variable name', () => {
  assert.throws(
    () => requireConfiguredPublicEnv('EXPO_PUBLIC_FIREBASE_API_KEY', 'your_api_key_here'),
    /EXPO_PUBLIC_FIREBASE_API_KEY/
  );
});

test('optional public env values omit placeholders instead of forwarding them', () => {
  assert.equal(getOptionalConfiguredPublicEnv('your_ios_client_id.apps.googleusercontent.com'), undefined);
  assert.equal(
    getOptionalConfiguredPublicEnv('123-ios-client.apps.googleusercontent.com'),
    '123-ios-client.apps.googleusercontent.com'
  );
});

test('Google sign-in requires real web and iOS client IDs on iOS', () => {
  assert.equal(
    isGoogleSignInConfigured({
      platformOS: 'ios',
      webClientId: '123-web-client.apps.googleusercontent.com',
      iosClientId: 'your_ios_client_id.apps.googleusercontent.com',
    }),
    false
  );
  assert.equal(
    isGoogleSignInConfigured({
      platformOS: 'ios',
      webClientId: '123-web-client.apps.googleusercontent.com',
      iosClientId: '123-ios-client.apps.googleusercontent.com',
    }),
    true
  );
  assert.equal(
    isGoogleSignInConfigured({
      platformOS: 'android',
      webClientId: '123-web-client.apps.googleusercontent.com',
      iosClientId: 'your_ios_client_id.apps.googleusercontent.com',
    }),
    true
  );
});
