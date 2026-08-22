const EMPTY_TOPIC_IDS = Object.freeze([]);

function normalizeStorageKey(storageKey) {
  return typeof storageKey === 'string' && storageKey.trim() ? storageKey : null;
}

function normalizeRemoteReadStatus(value) {
  return ['error', 'not-required', 'success'].includes(value) ? value : 'not-required';
}

function createProgressSnapshot(storageKey, completedTopicIds = [], options = {}) {
  const remoteReadStatus = normalizeRemoteReadStatus(options.remoteReadStatus);
  return {
    completedTopicIds: Array.isArray(completedTopicIds) ? [...completedTopicIds] : [],
    remoteReadStatus,
    shouldSyncRemote: Boolean(options.shouldSyncRemote && remoteReadStatus === 'success'),
    storageKey: normalizeStorageKey(storageKey),
  };
}

function createMutationProgressSnapshot(current, storageKey, completedTopicIds = []) {
  const remoteReadStatus = normalizeRemoteReadStatus(current?.remoteReadStatus);
  return createProgressSnapshot(storageKey, completedTopicIds, {
    remoteReadStatus,
    shouldSyncRemote: remoteReadStatus === 'success',
  });
}

function isProgressSnapshotCurrent(snapshot, storageKey) {
  const normalizedKey = normalizeStorageKey(storageKey);
  return Boolean(normalizedKey && snapshot?.storageKey === normalizedKey);
}

function getCompletedTopicIdsForKey(snapshot, storageKey) {
  if (!isProgressSnapshotCurrent(snapshot, storageKey)) return EMPTY_TOPIC_IDS;
  return Array.isArray(snapshot.completedTopicIds) ? snapshot.completedTopicIds : EMPTY_TOPIC_IDS;
}

module.exports = {
  createMutationProgressSnapshot,
  createProgressSnapshot,
  getCompletedTopicIdsForKey,
  isProgressSnapshotCurrent,
};
