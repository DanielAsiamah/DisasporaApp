const test = require('node:test');
const assert = require('node:assert/strict');
const { saveXpWithDeadline } = require('../src/lessonExperience/xpSaveAttempt.cjs');

test('confirmed saves return their result and clear the deadline', async () => {
  let cleared = false;
  const result = { awarded: true, xp: 10 };
  assert.equal(await saveXpWithDeadline(() => result, {
    schedule: () => 42,
    cancel: (id) => { assert.equal(id, 42); cleared = true; },
  }), result);
  assert.equal(cleared, true);
});

test('a stalled save times out and a late acknowledgement cannot change its outcome', async () => {
  let expire;
  let resolve;
  const task = new Promise((done) => { resolve = done; });
  const result = saveXpWithDeadline(() => task, {
    schedule: (callback, delay) => { expire = callback; assert.equal(delay, 15000); return 1; },
    cancel: () => {},
  });
  const rejection = assert.rejects(result, { code: 'deadline-exceeded' });
  expire();
  await rejection;
  resolve({ awarded: true });
  await assert.rejects(result, { code: 'deadline-exceeded' });
});

test('missing acknowledgements are retryable rather than announced as saved', async () => {
  for (const result of [undefined, null, {}, { awarded: 'yes' }]) {
    await assert.rejects(saveXpWithDeadline(() => result), { code: 'unavailable' });
  }
});

test('already saved and account-changed results preserve their semantics', async () => {
  for (const result of [{ awarded: false }, { currentAccount: false }]) {
    assert.equal(await saveXpWithDeadline(() => result), result);
  }
});

test('provider errors are preserved for existing retry policy', async () => {
  const error = Object.assign(new Error('No connection'), { code: 'unavailable' });
  await assert.rejects(saveXpWithDeadline(() => { throw error; }), (actual) => actual === error);
});
