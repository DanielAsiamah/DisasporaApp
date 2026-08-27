const test = require('node:test');
const assert = require('node:assert/strict');

const {
  COMPROMISED_ELEVENLABS_KEY_FINGERPRINTS,
  assertSafePrivateElevenLabsKey,
  hashPrivateElevenLabsKey,
} = require('../scripts/lib/elevenlabs-key-safety.cjs');

test('the disclosed-key denylist retains only the two non-reversible fingerprints', () => {
  assert.deepEqual(COMPROMISED_ELEVENLABS_KEY_FINGERPRINTS, [
    '2ed45779c16b1338beabcc571eeac6c9664f9a79d151575d108b7ecb5e8050bb',
    '4634a3c88e0cd25d229c26f8bd48ffbba7b58bcce9e05b25cb8323bf05922c9c',
  ]);
});

test('a caller-supplied disclosed-key fingerprint is rejected before any network request', () => {
  assert.throws(
    () => assertSafePrivateElevenLabsKey(
      'fixture-disclosed-elevenlabs-key',
      'Fixture ElevenLabs API key',
      ['3af57e6699a4d2d3ebb208125ec90c12d44e5d5a2cbf5bcaf3d9d3454a8dff1e']
    ),
    /rotate/i
  );
});

test('a different private key hashes cleanly and passes the denylist check', () => {
  const freshKey = 'brand-new-private-dev-key';
  const fingerprint = hashPrivateElevenLabsKey(freshKey);

  assert.match(fingerprint, /^[a-f0-9]{64}$/);
  assert.doesNotThrow(() => assertSafePrivateElevenLabsKey(freshKey));
});
