const test = require('node:test');
const assert = require('node:assert/strict');

const {
  COMPROMISED_ELEVENLABS_KEY_FINGERPRINTS,
  assertSafePrivateElevenLabsKey,
  hashPrivateElevenLabsKey,
} = require('../scripts/lib/elevenlabs-key-safety.cjs');

test('the shared-key denylist is stored as fingerprints instead of raw secret values', () => {
  assert.equal(COMPROMISED_ELEVENLABS_KEY_FINGERPRINTS.length >= 2, true);
  for (const fingerprint of COMPROMISED_ELEVENLABS_KEY_FINGERPRINTS) {
    assert.match(fingerprint, /^[a-f0-9]{64}$/);
    assert.equal(fingerprint.includes('6e855395'), false);
    assert.equal(fingerprint.includes('564a1619'), false);
  }
});

test('known exposed ElevenLabs development keys are rejected before any network request', () => {
  assert.throws(
    () => assertSafePrivateElevenLabsKey(
      '6e855395d81d737092a8e513e99080672afcbb199426b3e9f1180cd5983ab6d9'
    ),
    /rotate/i
  );
  assert.throws(
    () => assertSafePrivateElevenLabsKey(
      '564a161941de431821a7efe0a7ae573fe1b14930d8be0f3d34dc414b2f1eccac'
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
