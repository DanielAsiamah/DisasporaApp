const test = require('node:test');
const assert = require('node:assert/strict');
const { getAuthRuntime, runGoogleAuth } = require('../src/services/auth/authRuntime.cjs');

test('Expo Go uses email without offering native providers', () => {
  for (const platform of ['ios', 'android']) {
    const runtime = getAuthRuntime({ platform, executionEnvironment: 'storeClient' });
    assert.equal(runtime.google, 'unavailable');
    assert.equal(runtime.apple, false);
    assert.equal(runtime.email, true);
  }
});

test('web and development clients select their supported providers', () => {
  assert.equal(getAuthRuntime({ platform: 'web', appOwnership: 'expo' }).google, 'web');
  assert.equal(getAuthRuntime({ platform: 'ios' }).google, 'native');
  assert.equal(getAuthRuntime({ platform: 'ios' }).apple, true);
  assert.equal(getAuthRuntime({ platform: 'android' }).apple, false);
  assert.equal(getAuthRuntime({ platform: 'ios', appOwnership: 'expo' }).google, 'unavailable');
});

test('web auth does not invoke native code and returns the signed-in user', async () => {
  const user = { uid: 'browser-user' };
  const result = await runGoogleAuth({
    runtime: getAuthRuntime({ platform: 'web' }),
    web: async () => user,
    native: () => assert.fail('Native Google invoked on web'),
  });
  assert.equal(result, user);
});

test('Expo Go rejects before loading either provider', async () => {
  await assert.rejects(runGoogleAuth({
    runtime: getAuthRuntime({ platform: 'ios', appOwnership: 'expo' }),
    web: () => assert.fail('Web provider invoked'),
    native: () => assert.fail('Native provider invoked'),
  }), /email.*Expo Go/i);
});

test('native auth preserves provider failures', async () => {
  const error = new Error('cancelled');
  await assert.rejects(runGoogleAuth({
    runtime: getAuthRuntime({ platform: 'ios' }),
    native: async () => { throw error; },
  }), (actual) => actual === error);
});
