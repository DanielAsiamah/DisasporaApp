const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildExpoPhoneHandoffHtml,
  normalizeExpoUrls,
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
  assert.match(html, /api\.qrserver\.com\/v1\/create-qr-code/);
  assert.match(html, /data=exp%3A%2F%2Fexample\.exp\.direct/);
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
