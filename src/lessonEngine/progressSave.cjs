'use strict';
const { isProgressSnapshotCurrent } = require('./mvpProgressState.cjs');

async function saveProgressSnapshot({ snapshot, storageKey, saveLocal, saveRemote, onUpdate = () => {} }) {
  if (!isProgressSnapshotCurrent(snapshot, storageKey)) {
    return { local: 'not-required', remote: 'not-required' };
  }
  const status = { local: saveLocal ? 'saving' : 'not-required', remote: snapshot.shouldSyncRemote && saveRemote ? 'saving' : 'not-required' };
  const attempt = async (key, save) => {
    if (!save) return;
    try { await save(); status[key] = 'saved'; } catch { status[key] = 'error'; }
    onUpdate({ ...status });
  };
  await Promise.all([
    attempt('local', saveLocal),
    attempt('remote', snapshot.shouldSyncRemote ? saveRemote : null),
  ]);
  return { ...status };
}

module.exports = { saveProgressSnapshot };
