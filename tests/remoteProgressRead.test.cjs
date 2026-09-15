const test = require('node:test');
const assert = require('node:assert/strict');
const { readRemoteProgress } = require('../src/lessonEngine/remoteProgressRead.cjs');
const { createProgressSnapshot, createMutationProgressSnapshot } = require('../src/lessonEngine/mvpProgressState.cjs');

test('successful reads preserve saved progress and clear the timeout', async () => {
  let cleared = false;
  const value = { completedTopicIds: ['greetings'] };
  assert.deepEqual(await readRemoteProgress(() => value, {
    schedule: () => 5,
    cancel: (id) => { assert.equal(id, 5); cleared = true; },
  }), { status: 'success', value });
  assert.equal(cleared, true);
});

test('network failures are errors, not empty successful reads', async () => {
  assert.deepEqual(await readRemoteProgress(() => { throw new Error('offline'); }), { status: 'error', value: null });
});

test('a stalled read settles safely and cannot enable cloud writes', async () => {
  let expire;
  let finish;
  const pending = new Promise((resolve) => { finish = resolve; });
  const read = readRemoteProgress(() => pending, {
    schedule: (callback, delay) => { expire = callback; assert.equal(delay, 10000); return 1; },
    cancel: () => {},
  });
  expire();
  const result = await read;
  assert.deepEqual(result, { status: 'error', value: null });
  const snapshot = createProgressSnapshot('user:course', ['local-topic'], { remoteReadStatus: result.status });
  assert.equal(createMutationProgressSnapshot(snapshot, 'user:course', ['local-topic', 'new-topic']).shouldSyncRemote, false);
  finish({ completedTopicIds: ['remote-topic'] });
  assert.deepEqual(await read, result);
});

test('a missing remote document remains a successful read', async () => {
  assert.deepEqual(await readRemoteProgress(() => null), { status: 'success', value: null });
});
