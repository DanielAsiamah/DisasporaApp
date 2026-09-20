const test = require('node:test');
const assert = require('node:assert/strict');
const { getFirebaseEmulatorMode } = require('../src/firebase/emulatorMode.cjs');

test('normal development and production do not silently use emulators', () => {
  assert.equal(getFirebaseEmulatorMode({ isDevelopment: true }), null);
  assert.equal(getFirebaseEmulatorMode({ enabled: 'false', isDevelopment: false }), null);
});

test('production builds reject emulator opt-in', () => {
  assert.throws(() => getFirebaseEmulatorMode({ enabled: 'true', isDevelopment: false }), /development/);
});

test('explicit development mode isolates all Firebase products and auth persistence', () => {
  const mode = getFirebaseEmulatorMode({ enabled: 'true', isDevelopment: true });
  assert.equal(mode.projectId, 'demo-diaspora-app');
  assert.equal(mode.appName, 'diaspora-local-testing');
  assert.equal(mode.host, '127.0.0.1');
  const config = require('../firebase.emulators.json');
  assert.equal(mode.authPort, config.emulators.auth.port);
  assert.equal(mode.firestorePort, config.emulators.firestore.port);
  assert.equal(mode.storagePort, config.emulators.storage.port);
  for (const key of ['auth', 'firestore', 'storage']) assert.equal(config.emulators[key].host, '127.0.0.1');
  assert.equal(config.firestore.rules, 'firestore.rules');
});
