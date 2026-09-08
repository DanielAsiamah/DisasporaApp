const test = require('node:test');
const assert = require('node:assert/strict');
const { saveProgressSnapshot } = require('../src/lessonEngine/progressSave.cjs');
const snapshot = { storageKey: 'a', completedTopicIds: ['greetings'], shouldSyncRemote: true };

test('failed local writes do not hide successful cloud writes and can be retried', async () => {
  let fail = true;
  let remoteCalls = 0;
  const input = { snapshot, storageKey: 'a', saveLocal: async () => {
    if (fail) throw new Error('storage unavailable');
  }, saveRemote: async () => { remoteCalls += 1; } };
  assert.deepEqual(await saveProgressSnapshot(input), { local: 'error', remote: 'saved' });
  fail = false;
  assert.deepEqual(await saveProgressSnapshot(input), { local: 'saved', remote: 'saved' });
  assert.equal(remoteCalls, 2);
});

test('does not persist another account snapshot or arm cloud sync after a failed read', async () => {
  let localCalls = 0;
  let remoteCalls = 0;
  const input = { snapshot, storageKey: 'b', saveLocal: async () => { localCalls += 1; }, saveRemote: async () => { remoteCalls += 1; } };
  assert.deepEqual(await saveProgressSnapshot(input), { local: 'not-required', remote: 'not-required' });
  assert.equal(localCalls, 0);
  await saveProgressSnapshot({ ...input, storageKey: 'a', snapshot: { ...snapshot, shouldSyncRemote: false } });
  assert.equal(localCalls, 1);
  assert.equal(remoteCalls, 0);
});

test('reports failed cloud saves while preserving the successful local result', async () => {
  const result = await saveProgressSnapshot({ snapshot, storageKey: 'a', saveLocal: async () => {}, saveRemote: async () => { throw new Error('offline'); } });
  assert.deepEqual(result, { local: 'saved', remote: 'error' });
});

test('reports local failure while the cloud operation is still pending', async () => {
  let finishRemote;
  const remote = new Promise((resolve) => { finishRemote = resolve; });
  let localReported;
  const reported = new Promise((resolve) => { localReported = resolve; });
  const pending = saveProgressSnapshot({ snapshot, storageKey: 'a',
    saveLocal: async () => { throw new Error('disk full'); }, saveRemote: () => remote,
    onUpdate: (status) => { if (status.local === 'error') localReported(status); },
  });
  const status = await reported;
  assert.equal(status.remote, 'saving');
  finishRemote();
  await pending;
});
