const test = require('node:test');
const assert = require('node:assert/strict');

const { JAMAICAN_PATOIS_VOCABULARY } = require('../src/data/jamaicanPatoisVocabulary.cjs');
const { GENERATED_CURRICULUM } = require('../src/data/generatedCurriculum.cjs');
const {
  AUDITION_CONCEPT_IDS,
  buildCourseAudioManifest,
  buildPatoisAudioManifest,
  createCourseAuditionPlan,
  createAuditionPlan,
  shouldGenerateClip,
  validateVocabularyForGeneration,
  validateSpendGate,
} = require('../src/audio/patoisAudioManifest.cjs');

const SWAHILI_VOCABULARY = GENERATED_CURRICULUM.courseVocabulary
  .filter(({ courseId }) => courseId === 'swahili');

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

test('Swahili has a three-phrase zero-secret audition manifest without pretending audio is approved', () => {
  assert.equal(typeof buildCourseAudioManifest, 'function');
  assert.equal(typeof createCourseAuditionPlan, 'function');

  const manifest = buildCourseAudioManifest({
    courseId: 'swahili',
    vocabulary: SWAHILI_VOCABULARY,
    defaultVoiceRole: 'target-swahili-yna',
  });
  const audition = createCourseAuditionPlan(manifest);

  assert.equal(manifest.entries.length, 39);
  assert.deepEqual(audition.entries.map(({ conceptId }) => conceptId), AUDITION_CONCEPT_IDS);
  assert.equal(audition.entries.length, 3);
  assert.ok(audition.estimatedCredits > 0 && audition.estimatedCredits <= 250);
  for (const entry of manifest.entries) {
    assert.equal(entry.voiceRole, 'target-swahili-yna');
    assert.equal(entry.voiceEnvVar, 'ELEVENLABS_VOICE_ID_SWAHILI');
    assert.equal(entry.locale, 'sw-KE');
    assert.equal(entry.status, 'planned-native-review-required');
    assert.match(entry.filename, /^swahili\/[a-z0-9-]+\.mp3$/);
    assert.equal('voiceId' in entry, false);
    assert.equal('apiKey' in entry, false);
  }
});

test('paid generation requires all spend gates and enough live balance', () => {
  assert.match(validateSpendGate({ approved: false, estimatedCredits: 80, liveBalance: 1000, maxCredits: 250 }).join('\n'), /approval/i);
  assert.match(validateSpendGate({ approved: true, estimatedCredits: 300, liveBalance: 1000, maxCredits: 250 }).join('\n'), /cap/i);
  assert.match(validateSpendGate({ approved: true, estimatedCredits: 80, liveBalance: 20, maxCredits: 250 }).join('\n'), /balance/i);
  assert.deepEqual(validateSpendGate({ approved: true, estimatedCredits: 80, liveBalance: 1000, maxCredits: 250 }), []);
});

test('paid generation is impossible until all 39 vocabulary rows have native approval', () => {
  assert.match(validateVocabularyForGeneration(SWAHILI_VOCABULARY).join('\n'), /39 approved/i);
  assert.deepEqual(
    validateVocabularyForGeneration(
      SWAHILI_VOCABULARY.map((row) => ({ ...row, reviewStatus: 'approved' }))
    ),
    []
  );
});

test('unchanged clips are reused only when exact voice, model, and format provenance agrees', () => {
  const planned = { textHash: 'same-hash', voiceRole: 'target-patois-denzel', voiceId: 'voice-1', modelId: 'eleven_multilingual_v2', outputFormat: 'mp3_44100_128' };
  const existing = { textHash: 'same-hash', voiceRole: 'target-patois-denzel', voiceId: 'voice-1', modelId: 'eleven_multilingual_v2', outputFormat: 'mp3_44100_128' };

  assert.equal(shouldGenerateClip({ planned, existing, fileExists: true, force: false }), false);
  assert.equal(shouldGenerateClip({ planned, existing, fileExists: false, force: false }), true);
  assert.equal(shouldGenerateClip({ planned, existing: { ...existing, textHash: 'old' }, fileExists: true, force: false }), true);
  assert.equal(shouldGenerateClip({ planned, existing: { ...existing, voiceId: 'voice-2' }, fileExists: true, force: false }), true);
  assert.equal(shouldGenerateClip({ planned, existing: { ...existing, outputFormat: 'mp3_22050_32' }, fileExists: true, force: false }), true);
  assert.equal(shouldGenerateClip({ planned, existing, fileExists: true, force: true }), true);
});
