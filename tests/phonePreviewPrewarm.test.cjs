const assert = require('node:assert/strict');
const test = require('node:test');

let phonePreview = {};
try {
  phonePreview = require('../scripts/lib/phone-preview-prewarm.cjs');
} catch {}

test('phone preview keeps Expo Go tunnel arguments and forwards caller flags', () => {
  assert.equal(typeof phonePreview.buildExpoStartArgs, 'function');
  assert.deepEqual(phonePreview.buildExpoStartArgs(['--clear', '--max-workers', '2']), [
    'start', '--go', '--tunnel', '--port', '8085', '--clear', '--max-workers', '2',
  ]);
});

test('phone preview waits for Metro and warms the exact iOS launch bundle', async () => {
  assert.equal(typeof phonePreview.prewarmExpoIosBundle, 'function');
  const requests = [];
  let statusAttempts = 0;
  const fetchImpl = async (url, options = {}) => {
    requests.push({ url: String(url), headers: options.headers || {} });
    if (String(url).endsWith('/status')) {
      statusAttempts += 1;
      return new Response(statusAttempts === 1 ? 'starting' : 'packager-status:running', {
        status: statusAttempts === 1 ? 503 : 200,
      });
    }
    if (String(url) === 'http://127.0.0.1:8085') {
      return Response.json({
        runtimeVersion: 'exposdk:58.0.0',
        launchAsset: {
          url: 'http://127.0.0.1:8085/index.bundle?platform=ios&transform.engine=hermes',
        },
      }, { headers: { 'content-type': 'application/expo+json' } });
    }
    return new Response('bundle', { status: 200 });
  };

  const result = await phonePreview.prewarmExpoIosBundle({
    fetchImpl,
    sleep: async () => {},
    maxAttempts: 3,
  });

  assert.deepEqual(result, {
    runtimeVersion: 'exposdk:58.0.0',
    bundleBytes: 6,
  });
  assert.equal(statusAttempts, 2);
  assert.equal(requests[2].headers['expo-platform'], 'ios');
  assert.match(requests[3].url, /platform=ios/);
});

test('phone preview rejects a manifest without an iOS launch asset', async () => {
  assert.equal(typeof phonePreview.prewarmExpoIosBundle, 'function');
  const fetchImpl = async (url) => String(url).endsWith('/status')
    ? new Response('packager-status:running')
    : Response.json({ runtimeVersion: 'exposdk:58.0.0' });

  await assert.rejects(
    phonePreview.prewarmExpoIosBundle({ fetchImpl, sleep: async () => {}, maxAttempts: 1 }),
    /launch asset/i
  );
});
