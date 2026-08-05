const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const { GENERATED_CURRICULUM } = require('../src/data/generatedCurriculum.cjs');
const { buildCourseReleaseReport } = require('../scripts/lib/course-release-gate.cjs');
const { buildCourseContentSha256 } = require('../scripts/lib/course-content-fingerprint.cjs');
const { hashText } = require('../src/audio/patoisAudioManifest.cjs');
const { NARRATOR_SAMPLE_SCRIPTS } = require('../src/audio/narratorAudioManifest.cjs');
const projectRoot = path.resolve(__dirname, '..');

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function approvedFixture() {
  const courseId = 'swahili';
  const sourceWorkbookSha256 = GENERATED_CURRICULUM.meta.sourceSha256;
  const curriculum = {
    ...GENERATED_CURRICULUM,
    courseVocabulary: GENERATED_CURRICULUM.courseVocabulary.map((row) => (
      row.courseId === courseId ? { ...row, reviewStatus: 'approved' } : row
    )),
  };
  curriculum.meta = {
    ...curriculum.meta,
    courseContentSha256: {
      ...curriculum.meta.courseContentSha256,
      [courseId]: buildCourseContentSha256(curriculum, courseId),
    },
  };
  const course = curriculum.courses.find((row) => row.id === courseId);
  const vocabulary = curriculum.courseVocabulary.filter((row) => row.courseId === courseId);
  const files = new Map();
  const directories = new Map();

  const imageDirectory = `assets/images/vocab/${courseId}`;
  const imageNames = [];
  for (const row of vocabulary) {
    const filename = `${row.conceptId}.png`;
    imageNames.push(filename);
    files.set(`${imageDirectory}/${filename}`, Buffer.from(`transparent-png-${row.conceptId}`));
  }
  directories.set(imageDirectory, imageNames);
  const chapter = curriculum.chapters.find((row) => row.courseId === courseId);
  files.set(chapter.heroAsset, Buffer.from('approved-chapter-hero'));

  const contactSheetPath = `content/release-evidence/art/${courseId}/contact-sheet.png`;
  const contactSheet = Buffer.from('contact-sheet');
  files.set(contactSheetPath, contactSheet);

  const reviewWorkbookPath = `content/release-evidence/native-review/${courseId}/${sourceWorkbookSha256}/review.xlsx`;
  const reviewWorkbook = Buffer.from('approved-review-workbook');
  files.set(reviewWorkbookPath, reviewWorkbook);
  const receiptPath = `content/release-evidence/native-review/${courseId}/${sourceWorkbookSha256}/receipt.json`;
  const receipt = Buffer.from(JSON.stringify({
    schemaVersion: 1,
    courseId,
    approvedRows: 39,
    sourceWorkbookSha256After: sourceWorkbookSha256,
    reviewWorkbookPath,
    reviewWorkbookSha256: sha256(reviewWorkbook),
    reviewers: ['Qualified reviewer — 2026-07-21'],
  }));
  files.set(receiptPath, receipt);

  const targetEntries = vocabulary.map((row) => {
    const filename = `assets/audio/${courseId}/${row.conceptId}.mp3`;
    const audio = Buffer.from(`target-audio-${row.conceptId}`);
    files.set(filename, audio);
    return {
      conceptId: row.conceptId,
      text: row.localized,
      textHash: hashText(row.localized),
      filename,
      fileSha256: sha256(audio),
      voiceId: 'voice-swahili-approved',
      voiceRole: 'target-swahili-yna',
      modelId: 'eleven-multilingual-v2',
      outputFormat: 'mp3_44100_128',
      requestId: `target-request-${row.conceptId}`,
      characterCost: row.localized.length,
      status: 'approved-for-learning',
    };
  });
  const targetManifestPath = `content/release-evidence/audio/${courseId}/target-manifest.json`;
  const targetManifest = Buffer.from(JSON.stringify({
    schemaVersion: 1,
    courseId,
    roleId: 'target-swahili-yna',
    voiceId: 'voice-swahili-approved',
    modelId: 'eleven-multilingual-v2',
    outputFormat: 'mp3_44100_128',
    entries: targetEntries,
  }));
  files.set(targetManifestPath, targetManifest);

  const narratorEntries = NARRATOR_SAMPLE_SCRIPTS['narrator-en'].map(({ id, text }) => {
    const filename = `assets/audio/narrators/en/${id}.mp3`;
    const audio = Buffer.from(`narrator-audio-${id}`);
    files.set(filename, audio);
    return {
      id,
      text,
      textHash: hashText(text),
      filename,
      fileSha256: sha256(audio),
      voiceId: 'voice-english-narrator-approved',
      voiceRole: 'narrator-en',
      modelId: 'eleven-multilingual-v2',
      outputFormat: 'mp3_44100_128',
      requestId: `narrator-request-${id}`,
      characterCost: text.length,
      status: 'approved-for-learning',
    };
  });
  const narratorManifestPath = 'content/release-evidence/audio/narrator-en/manifest.json';
  const narratorManifest = Buffer.from(JSON.stringify({
    schemaVersion: 1,
    roleId: 'narrator-en',
    voiceId: 'voice-english-narrator-approved',
    modelId: 'eleven-multilingual-v2',
    outputFormat: 'mp3_44100_128',
    entries: narratorEntries,
  }));
  files.set(narratorManifestPath, narratorManifest);

  const approval = {
    schemaVersion: 1,
    courseId,
    sourceWorkbookSha256,
    candidateDigest: 'candidate-v1',
    nativeReview: {
      status: 'approved',
      candidateDigest: 'candidate-v1',
      receiptPath,
      receiptSha256: sha256(receipt),
    },
    artReview: {
      status: 'approved',
      candidateDigest: 'candidate-v1',
      approvedBy: 'Daniel',
      approvedAt: '2026-07-21T12:00:00Z',
      contactSheetPath,
      contactSheetSha256: sha256(contactSheet),
    },
    targetAudio: {
      status: 'approved',
      candidateDigest: 'candidate-v1',
      roleId: 'target-swahili-yna',
      voiceId: 'voice-swahili-approved',
      modelId: 'eleven-multilingual-v2',
      outputFormat: 'mp3_44100_128',
      voiceApprovedBy: 'Qualified Swahili reviewer',
      voiceApprovedAt: '2026-07-21T12:02:00Z',
      manifestPath: targetManifestPath,
      manifestSha256: sha256(targetManifest),
    },
    narratorAudio: {
      status: 'approved',
      candidateDigest: 'candidate-v1',
      roleId: 'narrator-en',
      voiceId: 'voice-english-narrator-approved',
      modelId: 'eleven-multilingual-v2',
      outputFormat: 'mp3_44100_128',
      voiceApprovedBy: 'Daniel',
      voiceApprovedAt: '2026-07-21T12:04:00Z',
      manifestPath: narratorManifestPath,
      manifestSha256: sha256(narratorManifest),
    },
    automatedChecks: {
      status: 'passed',
      candidateDigest: 'candidate-v1',
      sourceWorkbookSha256,
      commands: [
        'npm run test:onboarding',
        'npm run test:verification',
        'npm run test:rebuild-contracts',
        'npm run content:validate',
        'npm run images:audit -- --course swahili',
        'npx expo export --platform ios',
      ],
      recordedAt: '2026-07-21T12:10:00Z',
    },
    phoneTest: {
      status: 'approved',
      candidateDigest: 'candidate-v1',
      sourceWorkbookSha256,
      platform: 'ios',
      expoSdk: '54',
      deviceKind: 'physical',
      client: 'expo-go',
      completedTopicIds: curriculum.topics
        .filter((row) => row.courseId === courseId)
        .map((row) => row.id),
      audioPlaybackVerified: true,
      restartPersistenceVerified: true,
      authHandoffVerified: true,
      testedBy: 'Daniel',
      testedAt: '2026-07-21T12:20:00Z',
    },
    publicationApproval: {
      status: 'approved',
      candidateDigest: 'candidate-v1',
      sourceWorkbookSha256,
      approvedBy: 'Daniel',
      approvedAt: '2026-07-21T12:30:00Z',
    },
  };

  return {
    approval,
    course,
    courseId,
    curriculum,
    files,
    directories,
    sourceWorkbookSha256,
    buildReleaseCandidateDigest: () => Object.freeze({
      ready: true,
      digest: 'candidate-v1',
      errors: Object.freeze([]),
      artifacts: Object.freeze([]),
    }),
    buildCourseVoicePlan: () => Object.freeze({
      courseId,
      baseLanguage: 'English',
      narratorRoleId: 'narrator-en',
      narratorStatus: 'approved-for-learning',
      narratorEnabled: true,
      targetLanguageRoleId: 'target-swahili-yna',
      targetLanguageStatus: 'approved-for-learning',
      targetLanguageEnabled: true,
    }),
    readFile: (relativePath) => files.get(relativePath) || null,
    listFiles: (relativePath) => directories.get(relativePath) || [],
    validateImage: () => [],
    validateAudio: () => [],
  };
}

test('a course is releasable only when all content, art, audio, verification, and approval evidence agrees', () => {
  const fixture = approvedFixture();
  const report = buildCourseReleaseReport(fixture);

  assert.equal(report.ready, true, report.errors.join('\n'));
  assert.equal(report.courseId, 'swahili');
  assert.equal(report.computedCandidateDigest, 'candidate-v1');
  assert.deepEqual(report.summary, {
    vocabulary: 39,
    topics: 9,
    lessonSteps: 64,
    images: 39,
    targetAudio: 39,
    narratorAudio: 3,
  });
});

test('release rejects incomplete verification evidence and a generic single-course image audit', () => {
  const fixture = approvedFixture();
  fixture.approval.automatedChecks.commands = fixture.approval.automatedChecks.commands
    .filter((command) => (
      command !== 'npm run test:verification'
      && command !== 'npm run images:audit -- --course swahili'
    ));
  fixture.approval.automatedChecks.commands.push('npm run images:audit');

  const report = buildCourseReleaseReport(fixture);

  assert.equal(report.ready, false);
  assert.match(report.errors.join('\n'), /npm run test:verification/i);
  assert.match(report.errors.join('\n'), /images:audit -- --course swahili/i);
});

test('release rejects stale generated curriculum and duplicate normalized localized answers', () => {
  const fixture = approvedFixture();
  fixture.curriculum.meta = {
    ...fixture.curriculum.meta,
    sourceSha256: 'f'.repeat(64),
  };
  const rows = fixture.curriculum.courseVocabulary.filter(
    (row) => row.courseId === fixture.courseId
  );
  rows[1].localized = rows[0].localized;

  const report = buildCourseReleaseReport(fixture);
  const errors = report.errors.join('\n');

  assert.equal(report.ready, false);
  assert.match(errors, /generated curriculum.*workbook/i);
  assert.match(errors, /duplicate normalized localized answer/i);
});

test('target audio manifest requires exact concept-set equality', () => {
  const fixture = approvedFixture();
  const manifest = JSON.parse(fixture.files.get(fixture.approval.targetAudio.manifestPath));
  const removedConceptId = manifest.entries.at(-1).conceptId;
  manifest.entries[manifest.entries.length - 1] = {
    ...manifest.entries.at(-1),
    conceptId: 'unknown-concept',
  };
  const buffer = Buffer.from(JSON.stringify(manifest));
  fixture.files.set(fixture.approval.targetAudio.manifestPath, buffer);
  fixture.approval.targetAudio.manifestSha256 = sha256(buffer);

  const report = buildCourseReleaseReport(fixture);
  const errors = report.errors.join('\n');

  assert.equal(report.ready, false);
  assert.match(errors, new RegExp(`missing.*${removedConceptId}`, 'i'));
  assert.match(errors, /unknown.*unknown-concept/i);
});

test('release rejects hash-matched files that fail MP3 integrity validation', () => {
  const fixture = approvedFixture();
  fixture.validateAudio = () => ['no decodable MPEG frames'];

  const report = buildCourseReleaseReport(fixture);

  assert.equal(report.ready, false);
  assert.match(report.errors.join('\n'), /audio file failed MP3 validation.*decodable/i);
});

test('phone approval must prove a complete physical Expo Go journey and persistence checks', () => {
  const fixture = approvedFixture();
  fixture.approval.phoneTest.deviceKind = 'simulator';
  fixture.approval.phoneTest.client = 'development-build';
  fixture.approval.phoneTest.completedTopicIds.pop();
  fixture.approval.phoneTest.audioPlaybackVerified = false;
  fixture.approval.phoneTest.restartPersistenceVerified = false;
  fixture.approval.phoneTest.authHandoffVerified = false;

  const report = buildCourseReleaseReport(fixture);
  const errors = report.errors.join('\n');

  assert.equal(report.ready, false);
  assert.match(errors, /physical iPhone.*Expo Go/i);
  assert.match(errors, /all nine.*topics/i);
  assert.match(errors, /audio playback/i);
  assert.match(errors, /restart.*progress/i);
  assert.match(errors, /auth handoff/i);
});

test('the current unreviewed Swahili course is correctly rejected without fabricated approvals', () => {
  const report = buildCourseReleaseReport({
    courseId: 'swahili',
    curriculum: GENERATED_CURRICULUM,
    sourceWorkbookSha256: GENERATED_CURRICULUM.meta.sourceSha256,
    approval: null,
    readFile: () => null,
    listFiles: () => [],
    validateImage: () => [],
  });

  assert.equal(report.ready, false);
  assert.match(report.errors.join('\n'), /39 approved vocabulary rows/i);
  assert.match(report.errors.join('\n'), /release approval record/i);
  assert.match(report.errors.join('\n'), /39 canonical vocabulary images/i);
});

test('stale phone approval, incomplete audio, duplicate artwork, or a wrong narrator fail closed', () => {
  const fixture = approvedFixture();
  fixture.approval.phoneTest.sourceWorkbookSha256 = 'stale';
  fixture.approval.narratorAudio.roleId = 'narrator-fr';
  const imageRows = fixture.curriculum.courseVocabulary.filter((row) => row.courseId === fixture.courseId);
  fixture.files.set(imageRows[1].image, fixture.files.get(imageRows[0].image));
  const targetManifest = JSON.parse(fixture.files.get(fixture.approval.targetAudio.manifestPath));
  targetManifest.entries.pop();
  const targetBuffer = Buffer.from(JSON.stringify(targetManifest));
  fixture.files.set(fixture.approval.targetAudio.manifestPath, targetBuffer);
  fixture.approval.targetAudio.manifestSha256 = sha256(targetBuffer);

  const report = buildCourseReleaseReport(fixture);

  assert.equal(report.ready, false);
  assert.match(report.errors.join('\n'), /phone test.*stale/i);
  assert.match(report.errors.join('\n'), /narrator.*narrator-en/i);
  assert.match(report.errors.join('\n'), /39 unique vocabulary illustrations/i);
  assert.match(report.errors.join('\n'), /39 target audio entries/i);
});

test('release fails closed on disabled roles, incomplete audio provenance, or one voice used for both roles', () => {
  const fixture = approvedFixture();
  fixture.buildCourseVoicePlan = () => Object.freeze({
    courseId: fixture.courseId,
    baseLanguage: 'English',
    narratorRoleId: 'narrator-en',
    narratorStatus: 'voice-audition-required',
    narratorEnabled: false,
    targetLanguageRoleId: 'target-swahili-yna',
    targetLanguageStatus: 'voice-audition-required',
    targetLanguageEnabled: false,
  });
  fixture.approval.narratorAudio.voiceId = fixture.approval.targetAudio.voiceId;

  const targetManifest = JSON.parse(fixture.files.get(fixture.approval.targetAudio.manifestPath));
  delete targetManifest.entries[0].requestId;
  delete targetManifest.entries[1].modelId;
  delete targetManifest.entries[2].outputFormat;
  delete targetManifest.entries[3].characterCost;
  targetManifest.entries[4].modelId = 'different-model';
  targetManifest.entries[5].outputFormat = 'different-format';
  const targetBuffer = Buffer.from(JSON.stringify(targetManifest));
  fixture.files.set(fixture.approval.targetAudio.manifestPath, targetBuffer);
  fixture.approval.targetAudio.manifestSha256 = sha256(targetBuffer);

  const narratorManifest = JSON.parse(fixture.files.get(fixture.approval.narratorAudio.manifestPath));
  narratorManifest.voiceId = fixture.approval.targetAudio.voiceId;
  narratorManifest.entries[0].voiceId = fixture.approval.targetAudio.voiceId;
  const narratorBuffer = Buffer.from(JSON.stringify(narratorManifest));
  fixture.files.set(fixture.approval.narratorAudio.manifestPath, narratorBuffer);
  fixture.approval.narratorAudio.manifestSha256 = sha256(narratorBuffer);

  const report = buildCourseReleaseReport(fixture);
  const errors = report.errors.join('\n');

  assert.equal(report.ready, false);
  assert.match(errors, /target-language voice role.*enabled.*approved/i);
  assert.match(errors, /narrator voice role.*enabled.*approved/i);
  assert.match(errors, /request ID/i);
  assert.match(errors, /model ID/i);
  assert.match(errors, /output format/i);
  assert.match(errors, /character cost/i);
  assert.match(errors, /distinct voice IDs/i);
});

test('release fails closed when a course has no exact runtime flag and chapter hero mapping', () => {
  const fixture = approvedFixture();
  fixture.getCoursePresentationMetadata = () => null;

  const report = buildCourseReleaseReport(fixture);

  assert.equal(report.ready, false);
  assert.match(report.errors.join('\n'), /runtime presentation.*flag.*chapter hero/i);
});

test('human review receipts, contact sheets, and audio manifests must be tracked release evidence', () => {
  const fixture = approvedFixture();
  const oldContactSheetPath = fixture.approval.artReview.contactSheetPath;
  const ignoredContactSheetPath = 'outputs/contact-sheets/swahili-contact-sheet.png';
  fixture.files.set(ignoredContactSheetPath, fixture.files.get(oldContactSheetPath));
  fixture.approval.artReview.contactSheetPath = ignoredContactSheetPath;

  const report = buildCourseReleaseReport(fixture);

  assert.equal(report.ready, false);
  assert.match(report.errors.join('\n'), /contact sheet.*tracked release evidence/i);
});

test('every approval stage must reference the exact same computed release candidate', () => {
  const fixture = approvedFixture();
  fixture.approval.phoneTest.candidateDigest = 'different-candidate';

  const report = buildCourseReleaseReport(fixture);

  assert.equal(report.ready, false);
  assert.match(report.errors.join('\n'), /phone test.*candidate digest/i);
});

test('the Swahili release command is check-only and cannot enable or publish a course', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
  const source = fs.readFileSync(path.join(projectRoot, 'scripts', 'check-course-release.js'), 'utf8');

  assert.equal(
    pkg.scripts['release:swahili:check'],
    'node scripts/check-course-release.js --course swahili --approval content/release-approvals/swahili.json'
  );
  assert.doesNotMatch(source, /writeFile|renameSync|availability\s*=|publication_state\s*=/);
  assert.match(source, /buildCourseReleaseReport/);
  assert.match(source, /not-ready/);
});
