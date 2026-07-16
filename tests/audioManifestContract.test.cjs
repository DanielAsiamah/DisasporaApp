const test = require('node:test');
const assert = require('node:assert/strict');

const { JAMAICAN_PATOIS_VOCABULARY } = require('../src/data/jamaicanPatoisVocabulary.cjs');
const {
  AUDITION_CONCEPT_IDS,
  buildPatoisAudioManifest,
  createAuditionPlan,
  shouldGenerateClip,
  validateSpendGate,
} = require('../src/audio/patoisAudioManifest.cjs');

test('the Patois manifest records all 39 phrases without embedding voice IDs or API keys', () => {
  const manifest = buildPatoisAudioManifest(JAMAICAN_PATOIS_VOCABULARY);

  assert.equal(manifest.entries.length, 39);
  assert.equal(new Set(manifest.entries.map(({ conceptId }) => conceptId)).size, 39);
  assert.equal(new Set(manifest.entries.map(({ filename }) => filename)).size, 39);
  assert.deepEqual(new Set(manifest.entries.map(({ voiceRole }) => voiceRole)), new Set(['target-patois-denzel', 'target-patois-annakay']));
  for (const entry of manifest.entries) {
    assert.match(entry.textHash, /^[a-f0-9]{64}$/);
    assert.match(entry.filename, /^jamaican-patois\/[a-z0-9-]+\.mp3$/);
    assert.match(entry.voiceEnvVar, /^ELEVENLABS_VOICE_ID_/);
    assert.equal(entry.roleKind, 'target-language');
    assert.equal(entry.locale, 'en-JM');
    assert.equal('voiceId' in entry, false);
    assert.equal('apiKey' in entry, false);
    assert.equal(entry.requestId, null);
    assert.equal(entry.characterCost, null);
  }
});

test('the audition plan contains exactly three representative phrases under the 250-credit cap', () => {
  const manifest = buildPatoisAudioManifest(JAMAICAN_PATOIS_VOCABULARY);
  const audition = createAuditionPlan(manifest);

  assert.deepEqual(audition.entries.map(({ conceptId }) => conceptId), AUDITION_CONCEPT_IDS);
  assert.equal(audition.entries.length, 3);
  assert.ok(audition.estimatedCredits > 0);
  assert.ok(audition.estimatedCredits <= 250);
  assert.deepEqual(new Set(audition.entries.map(({ voiceRole }) => voiceRole)), new Set(['target-patois-denzel', 'target-patois-annakay']));
});

test('paid generation requires all spend gates and enough live balance', () => {
  assert.match(validateSpendGate({ approved: false, estimatedCredits: 80, liveBalance: 1000, maxCredits: 250 }).join('\n'), /approval/i);
  assert.match(validateSpendGate({ approved: true, estimatedCredits: 300, liveBalance: 1000, maxCredits: 250 }).join('\n'), /cap/i);
  assert.match(validateSpendGate({ approved: true, estimatedCredits: 80, liveBalance: 20, maxCredits: 250 }).join('\n'), /balance/i);
  assert.deepEqual(validateSpendGate({ approved: true, estimatedCredits: 80, liveBalance: 1000, maxCredits: 250 }), []);
});

test('unchanged clips are reused unless force is explicitly enabled', () => {
  const planned = { textHash: 'same-hash', voiceRole: 'target-patois-denzel', modelId: 'eleven_multilingual_v2' };
  const existing = { textHash: 'same-hash', voiceRole: 'target-patois-denzel', modelId: 'eleven_multilingual_v2' };

  assert.equal(shouldGenerateClip({ planned, existing, fileExists: true, force: false }), false);
  assert.equal(shouldGenerateClip({ planned, existing, fileExists: false, force: false }), true);
  assert.equal(shouldGenerateClip({ planned, existing: { ...existing, textHash: 'old' }, fileExists: true, force: false }), true);
  assert.equal(shouldGenerateClip({ planned, existing, fileExists: true, force: true }), true);
});
