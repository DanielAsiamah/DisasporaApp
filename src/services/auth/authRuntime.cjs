'use strict';

function getAuthRuntime({ platform, executionEnvironment, appOwnership } = {}) {
  const expoGo = platform !== 'web' &&
    (executionEnvironment === 'storeClient' || appOwnership === 'expo');
  return {
    email: true,
    google: platform === 'web' ? 'web' : expoGo ? 'unavailable' : 'native',
    apple: platform === 'ios' && !expoGo,
  };
}

async function runGoogleAuth({ runtime, web, native }) {
  if (runtime.google === 'web') return web();
  if (runtime.google === 'native') return native();
  throw new Error('Use email sign-in in Expo Go. Native Google sign-in is available in a development build.');
}

module.exports = { getAuthRuntime, runGoogleAuth };
