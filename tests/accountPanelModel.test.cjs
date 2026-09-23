const test = require('node:test');
const assert = require('node:assert/strict');
const { getAccountProgressNotice, signOutAndReturn } = require('../src/components/mvp/accountPanelModel.cjs');

test('account panel distinguishes saved progress from unconfirmed cloud sync', () => {
  assert.match(getAccountProgressNotice({ local: 'saved', remote: 'saved' }), /synced to your account/);
  assert.match(getAccountProgressNotice({ local: 'saved', remote: 'error' }), /Cloud sync is not confirmed/);
  assert.match(getAccountProgressNotice({ local: 'error' }), /not been saved/);
  assert.match(getAccountProgressNotice({ local: 'saving' }), /still saving/);
  assert.match(getAccountProgressNotice({ local: 'saved', remote: 'not-required', remoteReadStatus: 'success' }), /synced to your account/);
  assert.match(getAccountProgressNotice({ local: 'saved', remote: 'not-required', remoteReadStatus: 'error' }), /not confirmed/);
  assert.doesNotMatch(getAccountProgressNotice({}), /is saved|synced/);
});

test('a successful sign-out returns to welcome only after auth completes', async () => {
  const events = [];
  await signOutAndReturn({
    signOut: async () => { events.push('signed-out'); },
    onSignedOut: () => { events.push('welcome'); },
  });
  assert.deepEqual(events, ['signed-out', 'welcome']);
});

test('failed sign-out keeps the learner on the current screen for retry', async () => {
  let navigated = false;
  await assert.rejects(signOutAndReturn({
    signOut: async () => { throw new Error('sign-out failed'); },
    onSignedOut: () => { navigated = true; },
  }), /sign-out failed/);
  assert.equal(navigated, false);
});
