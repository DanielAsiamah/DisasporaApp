'use strict';

const DEFAULT_BASE_URL = 'http://127.0.0.1:8085';

function buildExpoStartArgs(extraArgs = []) {
  return ['start', '--go', '--tunnel', '--port', '8085', ...extraArgs];
}

async function prewarmExpoIosBundle({
  baseUrl = DEFAULT_BASE_URL,
  fetchImpl = fetch,
  sleep = delay => new Promise(resolve => setTimeout(resolve, delay)),
  maxAttempts = 180,
} = {}) {
  const origin = String(baseUrl).replace(/\/$/, '');
  let metroReady = false;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const response = await fetchImpl(`${origin}/status`);
      const body = await response.text();
      if (response.ok && body.includes('packager-status:running')) {
        metroReady = true;
        break;
      }
    } catch {}
    await sleep(1000);
  }

  if (!metroReady) throw new Error('Metro did not become ready for the phone preview.');

  const manifestResponse = await fetchImpl(origin, {
    headers: {
      'expo-platform': 'ios',
      accept: 'application/expo+json,application/json',
    },
  });
  if (!manifestResponse.ok) {
    throw new Error(`Expo iOS manifest failed with HTTP ${manifestResponse.status}.`);
  }
  const manifest = await manifestResponse.json();
  if (!manifest.launchAsset?.url) throw new Error('Expo iOS manifest has no launch asset.');

  const launchAsset = new URL(manifest.launchAsset.url);
  const localBundleUrl = new URL(`${launchAsset.pathname}${launchAsset.search}`, origin);
  const bundleResponse = await fetchImpl(localBundleUrl);
  if (!bundleResponse.ok) {
    throw new Error(`Expo iOS bundle prewarm failed with HTTP ${bundleResponse.status}.`);
  }
  const bundle = await bundleResponse.arrayBuffer();

  return {
    runtimeVersion: manifest.runtimeVersion || manifest.extra?.expoClient?.sdkVersion || 'unknown',
    bundleBytes: bundle.byteLength,
  };
}

module.exports = {
  buildExpoStartArgs,
  prewarmExpoIosBundle,
};
