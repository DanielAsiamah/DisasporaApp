const test = require('node:test');
const assert = require('node:assert/strict');
const { getSoundEffectsEnabled, saveSoundPreference } = require('../src/audio/soundPreference.cjs');

test('sound effects default on unless the saved preference is explicitly false', () => {
  for (const value of [undefined, null, true, 'false']) assert.equal(getSoundEffectsEnabled(value), true);
  assert.equal(getSoundEffectsEnabled(false), false);
});

test('sound choice applies immediately but reports saved only after the profile write resolves', async () => {
  const states = [];
  let finish;
  const task = saveSoundPreference({
    enabled: false,
    save: fields => {
      assert.deepEqual(fields, { soundEffectsEnabled: false });
      return new Promise(resolve => { finish = resolve; });
    },
    onChange: value => states.push(value),
  });
  assert.deepEqual(states, [{ enabled: false, status: 'saving' }]);
  finish();
  assert.equal(await task, true);
  assert.deepEqual(states.at(-1), { enabled: false, status: 'saved' });
});

test('a failed save keeps the session preference and supports retry without changing other profile fields', async () => {
  const states = [];
  const onChange = state => states.push(state);
  assert.equal(await saveSoundPreference({ enabled: false, save: async () => { throw new Error('offline'); }, onChange }), false);
  assert.deepEqual(states.at(-1), { enabled: false, status: 'error' });
  assert.equal(await saveSoundPreference({ enabled: false, save: async fields => assert.deepEqual(fields, { soundEffectsEnabled: false }), onChange }), true);
  assert.deepEqual(states.at(-1), { enabled: false, status: 'saved' });
});

test('invalid sound settings cannot be written to the profile', async () => {
  let wrote = false;
  await assert.rejects(saveSoundPreference({ enabled: 'off', save: () => { wrote = true; }, onChange: () => {} }), /boolean/);
  assert.equal(wrote, false);
});
