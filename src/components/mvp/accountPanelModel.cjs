'use strict';

function getAccountProgressNotice({ local, remote, remoteReadStatus } = {}) {
  if (local === 'saving') return 'Lesson progress is still saving on this device. Wait a moment before signing out.';
  if (local === 'error') return 'Recent lesson progress has not been saved on this device. Retry saving before signing out.';
  if (local !== 'saved') return 'Lesson progress has not been confirmed yet. Signing out now may leave recent progress unsaved.';
  if (remote === 'saved' || (remote === 'not-required' && remoteReadStatus === 'success')) return 'Lesson progress is saved on this device and synced to your account.';
  return 'Lesson progress is saved on this device. Cloud sync is not confirmed yet.';
}

async function signOutAndReturn({ signOut, onSignedOut }) {
  await signOut();
  onSignedOut();
}

module.exports = { getAccountProgressNotice, signOutAndReturn };
