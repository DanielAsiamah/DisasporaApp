const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');

const {
  COMMON_RUNTIME_SOURCE_PATHS,
  buildReleaseCandidateDigest,
} = require('../scripts/lib/release-candidate-digest.cjs');

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function fixture() {
  const courseId = 'swahili';
  const workbook = Buffer.from('workbook');
  const sourceWorkbookSha256 = sha256(workbook);
  const files = new Map([
    ['patois_learn_database_1.xlsx', workbook],
    ['runtime.js', Buffer.from('runtime-v1')],
    ['assets/images/chapters/swahili-greetings.png', Buffer.from('hero')],
    ['assets/images/vocab/swahili/yes.png', Buffer.from('yes-image')],
    ['content/release-evidence/art/swahili/contact-sheet.png', Buffer.from('contact')],
    ['content/release-evidence/native-review/swahili/hash/review.xlsx', Buffer.from('review')],
    ['assets/audio/swahili/yes.mp3', Buffer.from('target-audio')],
    ['assets/audio/narrators/en/listen.mp3', Buffer.from('narrator-audio')],
  ]);
  const nativeReceiptPath = 'content/release-evidence/native-review/swahili/hash/receipt.json';
  files.set(nativeReceiptPath, Buffer.from(JSON.stringify({
    reviewWorkbookPath: 'content/release-evidence/native-review/swahili/hash/review.xlsx',
  })));
  const targetManifestPath = 'content/release-evidence/audio/swahili/target-manifest.json';
  files.set(targetManifestPath, Buffer.from(JSON.stringify({
    entries: [{ filename: 'assets/audio/swahili/yes.mp3' }],
  })));
  const narratorManifestPath = 'content/release-evidence/audio/narrator-en/manifest.json';
  files.set(narratorManifestPath, Buffer.from(JSON.stringify({
    entries: [{ filename: 'assets/audio/narrators/en/listen.mp3' }],
  })));

  return {
    courseId,
    curriculum: {
      courseVocabulary: [{
        courseId,
        conceptId: 'yes',
        image: 'assets/images/vocab/swahili/yes.png',
      }],
    },
    sourceWorkbookSha256,
    approval: {
      nativeReview: { receiptPath: nativeReceiptPath },
      artReview: { contactSheetPath: 'content/release-evidence/art/swahili/contact-sheet.png' },
      targetAudio: { manifestPath: targetManifestPath },
      narratorAudio: { manifestPath: narratorManifestPath },
    },
    presentation: {
      heroAsset: 'assets/images/chapters/swahili-greetings.png',
    },
    readFile: (relativePath) => files.get(relativePath) || null,
    runtimeSourcePaths: ['runtime.js'],
    files,
  };
}

test('candidate digest binds runtime, workbook, art, review proof, manifests, and audio files', () => {
  const input = fixture();
  const first = buildReleaseCandidateDigest(input);

  assert.equal(first.ready, true, first.errors.join('\n'));
  assert.match(first.digest, /^[a-f0-9]{64}$/);
  assert.deepEqual(first.artifacts.map(({ path }) => path), [
    'assets/audio/narrators/en/listen.mp3',
    'assets/audio/swahili/yes.mp3',
    'assets/images/chapters/swahili-greetings.png',
    'assets/images/vocab/swahili/yes.png',
    'content/release-evidence/art/swahili/contact-sheet.png',
    'content/release-evidence/audio/narrator-en/manifest.json',
    'content/release-evidence/audio/swahili/target-manifest.json',
    'content/release-evidence/native-review/swahili/hash/receipt.json',
    'content/release-evidence/native-review/swahili/hash/review.xlsx',
    'patois_learn_database_1.xlsx',
    'runtime.js',
  ]);

  input.files.set('assets/images/vocab/swahili/yes.png', Buffer.from('changed-image'));
  const changed = buildReleaseCandidateDigest(input);
  assert.equal(changed.ready, true);
  assert.notEqual(changed.digest, first.digest);
});

test('candidate digest fails closed for a missing artifact or a workbook hash mismatch', () => {
  const missing = fixture();
  missing.files.delete('assets/audio/swahili/yes.mp3');
  const missingReport = buildReleaseCandidateDigest(missing);
  assert.equal(missingReport.ready, false);
  assert.equal(missingReport.digest, null);
  assert.match(missingReport.errors.join('\n'), /missing.*yes\.mp3/i);

  const stale = fixture();
  stale.sourceWorkbookSha256 = 'f'.repeat(64);
  const staleReport = buildReleaseCandidateDigest(stale);
  assert.equal(staleReport.ready, false);
  assert.match(staleReport.errors.join('\n'), /workbook.*SHA-256/i);
});

test('candidate digest binds voice, playback-policy, exercise, and progress runtime contracts', () => {
  for (const requiredPath of [
    'src/audio/courseVoicePlan.cjs',
    'src/audio/voiceRoleContract.cjs',
    'src/audio/lessonAudioPolicy.cjs',
    'src/lessonEngine/answerNormalization.js',
    'src/lessonEngine/courseProgressKey.cjs',
    'src/lessonEngine/lessonAudioAvailability.js',
    'src/lessonEngine/lessonStepTypes.js',
    'src/lessonEngine/topicProgress.cjs',
  ]) {
    assert.ok(
      COMMON_RUNTIME_SOURCE_PATHS.includes(requiredPath),
      `release candidate digest must bind ${requiredPath}`
    );
  }
});
