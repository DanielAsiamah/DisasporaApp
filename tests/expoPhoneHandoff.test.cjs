const test = require('node:test');
const assert = require('node:assert/strict');

test('phone command does not embed stale machine addresses', () => {
  assert.equal(require('../package.json').scripts['phone:handoff'],
    'node scripts/open-expo-phone-handoff.js');
});

test('phone options accept separate values and last occurrence wins', () => {
  assert.equal(readLastOption(['--lan-url=old', '--lan-url', 'exp://192.168.1.32:8085'], 'lan-url'), 'exp://192.168.1.32:8085');
  assert.equal(readLastOption(['--lan-url', '--web-url=http://localhost:8085'], 'lan-url'), '');
});

test('LAN-only handoff explains Wi-Fi and does not claim a tunnel', () => {
  const html = buildExpoPhoneHandoffHtml({lanUrl: 'exp://192.168.1.32:8085'});
  assert.match(html, /same Wi-Fi/);
  assert.doesNotMatch(html, /Open Expo Go tunnel/);
});

const {
  buildExpoPhoneHandoffHtml,
  normalizeExpoUrls,
  resolvePhoneHandoffUrls,
  readLastOption,
} = require('../scripts/lib/expo-phone-handoff.cjs');

test('Expo phone handoff normalizes tunnel and LAN URLs into a tappable HTML page', () => {
  const urls = normalizeExpoUrls({
    tunnelUrl: ' exp://example.exp.direct ',
    lanUrl: 'exp://192.168.1.32:8082',
    webUrl: 'http://localhost:8082',
  });

  assert.deepEqual(urls, {
    tunnelUrl: 'exp://example.exp.direct',
    lanUrl: 'exp://192.168.1.32:8082',
    webUrl: 'http://localhost:8082',
  });

  const html = buildExpoPhoneHandoffHtml({ ...urls, generatedAt: '2026-09-06 12:00' });

  assert.match(html, /Open Diaspora in Expo Go/);
  assert.match(html, /href="exp:\/\/example\.exp\.direct"/);
  assert.match(html, /href="exp:\/\/192\.168\.1\.32:8082"/);
  assert.match(html, /href="http:\/\/localhost:8082"/);
  const qr = html.match(/src="data:image\/svg\+xml;base64,([^"]+)"/);
  assert.ok(qr, 'QR image is embedded for offline viewing');
  assert.match(Buffer.from(qr[1], 'base64').toString(), /<path/);
  assert.doesNotMatch(html, /api\.qrserver\.com/);
  assert.match(html, /class="button" href="exp:\/\/192\.168\.1\.32:8082">Open Expo Go on Wi-Fi/);
  assert.match(html, /Tunnel fallback: exp:\/\/example\.exp\.direct/);
});

test('Expo phone handoff command options let explicit caller values override defaults', () => {
  assert.equal(
    readLastOption([
      '--tunnel-url=exp://old.exp.direct',
      '--lan-url=exp://192.168.1.32:8082',
      '--tunnel-url=exp://fresh.exp.direct',
    ], 'tunnel-url'),
    'exp://fresh.exp.direct'
  );
});

test('discovers the current iPhone Expo Go URL with its launch flags', async () => {
  const tunnelUrl = 'exps://fresh.on.expo.app?__expo_disable_fab=1';
  const urls = await resolvePhoneHandoffUrls({}, async (url, options) => {
    assert.equal(url, 'http://127.0.0.1:8085/_expo/link?choice=expo-go&platform=ios');
    assert.equal(options.redirect, 'manual');
    assert.equal(options.headers['expo-platform'], 'ios');
    return new Response(null, { status: 307, headers: { location: tunnelUrl } });
  });
  assert.equal(urls.tunnelUrl, tunnelUrl);
});

test('explicit LAN and tunnel addresses work without a running local server', async () => {
  const lanUrl = 'exp://192.168.1.32:8085';
  const urls = await resolvePhoneHandoffUrls({ lanUrl }, () => assert.fail('unexpected discovery request'));
  assert.equal(urls.lanUrl, lanUrl);
});

test('a stopped preview or an unreachable phone address gives a restart instruction', async () => {
  for (const location of ['', 'http://localhost:8085', 'exp://127.0.0.1:8085', 'diaspora://dev-client']) {
    const response = new Response(null, { status: location ? 307 : 200, headers: { location } });
    await assert.rejects(resolvePhoneHandoffUrls({}, async () => response), /npm run phone:preview/);
  }
  await assert.rejects(resolvePhoneHandoffUrls({}, async () => { throw Error('connection refused'); }), /npm run phone:preview/);
});
