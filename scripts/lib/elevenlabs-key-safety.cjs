'use strict';

const crypto = require('node:crypto');

const COMPROMISED_ELEVENLABS_KEY_FINGERPRINTS = Object.freeze([
  '2ed45779c16b1338beabcc571eeac6c9664f9a79d151575d108b7ecb5e8050bb',
  '4634a3c88e0cd25d229c26f8bd48ffbba7b58bcce9e05b25cb8323bf05922c9c',
]);

function clean(value) {
  return String(value ?? '').trim();
}

function hashPrivateElevenLabsKey(value) {
  return crypto.createHash('sha256').update(clean(value), 'utf8').digest('hex');
}

function assertSafePrivateElevenLabsKey(value, label = 'ElevenLabs API key') {
  const normalized = clean(value);
  if (!normalized) {
    throw new Error(`${label} is missing from the private development environment.`);
  }
  const fingerprint = hashPrivateElevenLabsKey(normalized);
  if (COMPROMISED_ELEVENLABS_KEY_FINGERPRINTS.includes(fingerprint)) {
    throw new Error(
      `${label} matches a previously exposed development key. Rotate it before any ElevenLabs request.`
    );
  }
  return fingerprint;
}

module.exports = {
  COMPROMISED_ELEVENLABS_KEY_FINGERPRINTS,
  assertSafePrivateElevenLabsKey,
  hashPrivateElevenLabsKey,
};
