const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { VOICE_ROLES } = require('../src/audio/voiceRoleContract.cjs');
const {
  NARRATOR_SAMPLE_SCRIPTS,
  buildAllNarratorAuditionManifests,
  buildNarratorAuditionManifest,
} = require('../src/audio/narratorAudioManifest.cjs');

const projectRoot = path.resolve(__dirname, '..');

test('English, French, and Arabic narrator auditions are separate zero-secret plans', () => {
  const manifests = buildAllNarratorAuditionManifests();

  assert.deepEqual(Object.keys(manifests), ['narrator-en', 'narrator-fr', 'narrator-ar']);
  assert.equal(new Set(Object.values(manifests).map((manifest) => manifest.voiceEnvVar)).size, 3);
  for (const [roleId, manifest] of Object.entries(manifests)) {
    assert.equal(manifest.roleId, roleId);
    assert.equal(manifest.roleKind, 'interface-narrator');
    assert.equal(manifest.locale, VOICE_ROLES[roleId].locale);
    assert.equal(manifest.status, 'voice-audition-required');
    assert.equal(manifest.entries.length, 3);
    assert.ok(manifest.estimatedCredits > 0 && manifest.estimatedCredits <= 250);
    for (const entry of manifest.entries) {
      assert.equal(entry.voiceRole, roleId);
      assert.equal(entry.voiceEnvVar, VOICE_ROLES[roleId].voiceEnvVar);
      assert.equal(entry.roleKind, 'interface-narrator');
      assert.equal(entry.status, 'planned-native-review-required');
      assert.match(entry.textHash, /^[a-f0-9]{64}$/);
      assert.match(entry.filename, new RegExp(`^narrators/${manifest.locale}/[a-z0-9-]+\\.mp3$`));
      assert.equal('voiceId' in entry, false);
      assert.equal('apiKey' in entry, false);
    }
  }
});

test('the audition scripts exercise natural instructional speech in each writing system', () => {
  assert.equal(NARRATOR_SAMPLE_SCRIPTS['narrator-en'].length, 3);
  assert.ok(NARRATOR_SAMPLE_SCRIPTS['narrator-fr'].some(({ text }) => /[Éèàç]/u.test(text)));
  assert.ok(NARRATOR_SAMPLE_SCRIPTS['narrator-ar'].every(({ text }) => /[\u0600-\u06ff]/u.test(text)));
  assert.notDeepEqual(
    NARRATOR_SAMPLE_SCRIPTS['narrator-en'].map(({ text }) => text),
    NARRATOR_SAMPLE_SCRIPTS['narrator-fr'].map(({ text }) => text)
  );
});

test('unassigned or target-language roles cannot masquerade as interface narrators', () => {
  assert.throws(() => buildNarratorAuditionManifest('target-swahili-yna'), /interface narrator/i);
  assert.throws(() => buildNarratorAuditionManifest('unknown-role'), /interface narrator/i);
});

test('the package exposes a preparation-only narrator dry run', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
  const source = fs.readFileSync(path.join(projectRoot, 'scripts', 'prepare-narrator-auditions.js'), 'utf8');

  assert.equal(pkg.scripts['audio:narrators:dry-run'], 'node scripts/prepare-narrator-auditions.js');
  assert.doesNotMatch(source, /fetch\s*\(|api\.elevenlabs\.io|xi-api-key|--generate|--approve-spend/);
  assert.match(source, /zero credits were spent/i);
});
