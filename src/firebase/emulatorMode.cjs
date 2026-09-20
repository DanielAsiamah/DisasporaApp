'use strict';

function getFirebaseEmulatorMode({ enabled, isDevelopment } = {}) {
  if (enabled !== 'true') return null;
  if (!isDevelopment) throw new Error('Firebase emulators may only be enabled in development.');
  return {
    projectId: 'demo-diaspora-app',
    appName: 'diaspora-local-testing',
    host: '127.0.0.1',
    authPort: 9099,
    firestorePort: 8080,
    storagePort: 9199,
  };
}

module.exports = { getFirebaseEmulatorMode };
