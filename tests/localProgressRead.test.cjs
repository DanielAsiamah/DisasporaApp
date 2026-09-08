const test = require('node:test');
const assert = require('node:assert/strict');
const { readLocalProgress } = require('../src/lessonEngine/localProgressRead.cjs');

test('only a missing key means the learner has no saved progress', async () => {
  assert.deepEqual(await readLocalProgress(async () => null), []);
  assert.deepEqual(await readLocalProgress(async () => '["greetings"]'), ['greetings']);
});

test('storage failures are not converted into an empty progress list', async () => {
  await assert.rejects(readLocalProgress(async () => { throw new Error('device unavailable'); }), /device unavailable/);
});

test('malformed or unexpected stored data is retained for recovery instead of treated as empty', async () => {
  for (const raw of ['', '{broken', '{}', 'null', '[1]', '["greetings",null]']) {
    await assert.rejects(readLocalProgress(async () => raw));
  }
});
