const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const { buildCourseVoicePlan } = require('../../src/audio/courseVoicePlan.cjs');
const { NARRATOR_SAMPLE_SCRIPTS } = require('../../src/audio/narratorAudioManifest.cjs');
const { hashText } = require('../../src/audio/patoisAudioManifest.cjs');
const { getCoursePresentationMetadata } = require('../../src/data/coursePresentationContract.cjs');
const { auditPngBuffer, EXPECTED_VOCAB_SIZE } = require('./audit-vocab-images.cjs');
const { buildReleaseCandidateDigest } = require('./release-candidate-digest.cjs');
const { buildCourseContentSha256 } = require('./course-content-fingerprint.cjs');
const { auditMp3Buffer } = require('./audit-mp3.cjs');

const REQUIRED_AUTOMATED_CHECKS = Object.freeze([
  'npm run test:onboarding',
  'npm run test:verification',
  'npm run test:rebuild-contracts',
  'npm run content:validate',
  'npx expo export --platform ios',
]);

function requiredAutomatedChecksForCourse(courseId) {
  return Object.freeze([
    ...REQUIRED_AUTOMATED_CHECKS,
    `npm run images:audit -- --course ${courseId}`,
  ]);
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function normalizedPath(value) {
  return String(value ?? '').trim().replace(/\\/g, '/').replace(/^\.\//, '');
}

function normalizeLocalizedAnswer(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFKC')
    .toLocaleLowerCase('und')
    .replace(/[\p{P}\p{S}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isTrackedReleaseEvidencePath(value) {
  return normalizedPath(value).startsWith('content/release-evidence/');
}

function defaultFileAdapters(projectRoot) {
  const root = path.resolve(projectRoot);
  const resolveSafe = (relativePath) => {
    const absolutePath = path.resolve(root, normalizedPath(relativePath));
    if (absolutePath !== root && !absolutePath.startsWith(`${root}${path.sep}`)) return null;
    return absolutePath;
  };
  return {
    readFile(relativePath) {
      const absolutePath = resolveSafe(relativePath);
      return absolutePath && fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile()
        ? fs.readFileSync(absolutePath)
        : null;
    },
    listFiles(relativePath) {
      const absolutePath = resolveSafe(relativePath);
      return absolutePath && fs.existsSync(absolutePath) && fs.statSync(absolutePath).isDirectory()
        ? fs.readdirSync(absolutePath).filter((name) => fs.statSync(path.join(absolutePath, name)).isFile())
        : [];
    },
  };
}

function parseJsonArtifact({ readFile, relativePath, expectedSha256, label, errors }) {
  const artifactPath = normalizedPath(relativePath);
  if (!isTrackedReleaseEvidencePath(artifactPath)) {
    errors.push(`${label} must be stored as tracked release evidence.`);
    return null;
  }
  const buffer = readFile(artifactPath);
  if (!buffer) {
    errors.push(`${label} is missing: ${relativePath || '(blank)'}.`);
    return null;
  }
  if (!expectedSha256 || sha256(buffer) !== expectedSha256) {
    errors.push(`${label} SHA-256 does not match its approval record.`);
    return null;
  }
  try {
    return JSON.parse(buffer.toString('utf8'));
  } catch (error) {
    errors.push(`${label} is not valid JSON: ${error.message}`);
    return null;
  }
}

function requireApproval(stage, label, errors) {
  if (!stage || stage.status !== 'approved') {
    errors.push(`${label} must be explicitly approved.`);
    return false;
  }
  return true;
}

function validateAudioFile(entry, expectedPath, readFile, validateAudio, errors, label) {
  const filename = normalizedPath(entry?.filename);
  if (filename !== expectedPath) errors.push(`${label} uses ${filename || '(blank)'}; expected ${expectedPath}.`);
  const audio = readFile(filename);
  if (!audio) errors.push(`${label} file is missing: ${filename || '(blank)'}.`);
  else {
    if (!entry.fileSha256 || sha256(audio) !== entry.fileSha256) {
      errors.push(`${label} file SHA-256 does not match its manifest.`);
    }
    for (const failure of validateAudio(audio, filename) || []) {
      errors.push(`${label} audio file failed MP3 validation: ${failure.message || failure}.`);
    }
  }
}

function validateAudioProvenance(entry, expected, errors, label) {
  let valid = true;
  function reject(message) {
    valid = false;
    errors.push(`${label} ${message}`);
  }
  if (!entry || typeof entry !== 'object') {
    reject('has no manifest entry.');
    return false;
  }
  if (!entry.voiceId || entry.voiceId !== expected.voiceId) reject('does not use the exact approved voice ID.');
  if (!entry.voiceRole || entry.voiceRole !== expected.voiceRole) reject('uses the wrong voice role.');
  if (!String(entry.modelId || '').trim()) reject('has no model ID.');
  else if (expected.modelId && entry.modelId !== expected.modelId) {
    reject('does not use the exact approved model ID.');
  }
  if (!String(entry.outputFormat || '').trim()) reject('has no output format.');
  else if (expected.outputFormat && entry.outputFormat !== expected.outputFormat) {
    reject('does not use the exact approved output format.');
  }
  if (!String(entry.requestId || '').trim()) reject('has no request ID.');
  if (!Number.isInteger(entry.characterCost) || entry.characterCost < 0) reject('has no valid character cost.');
  if (!String(entry.text || '').trim()) reject('has no source text.');
  else if (entry.text !== expected.text || entry.textHash !== hashText(expected.text)) {
    reject('is stale for the approved wording.');
  }
  return valid;
}

function buildCourseReleaseReport(options = {}) {
  const errors = [];
  const courseId = String(options.courseId || '').trim();
  const curriculum = options.curriculum || {};
  const projectRoot = options.projectRoot || process.cwd();
  const adapters = defaultFileAdapters(projectRoot);
  const readFile = options.readFile || adapters.readFile;
  const listFiles = options.listFiles || adapters.listFiles;
  const validateImage = options.validateImage || ((buffer, label) => auditPngBuffer(buffer, {
    label,
    expectedWidth: EXPECTED_VOCAB_SIZE,
    expectedHeight: EXPECTED_VOCAB_SIZE,
  }).failures);
  const validateAudio = options.validateAudio || (
    (buffer, label) => auditMp3Buffer(buffer, { label }).failures
  );
  const sourceWorkbookSha256 = String(options.sourceWorkbookSha256 || '');
  const approval = options.approval;
  const course = (curriculum.courses || []).find((row) => row.id === courseId);

  if (!course) {
    return Object.freeze({ ready: false, courseId, errors: Object.freeze([`Unknown course ${courseId || '(blank)'}.`]), summary: Object.freeze({}) });
  }

  const vocabulary = (curriculum.courseVocabulary || []).filter((row) => row.courseId === courseId);
  const topics = (curriculum.topics || []).filter((row) => row.courseId === courseId);
  const chapters = (curriculum.chapters || []).filter((row) => row.courseId === courseId);
  const lessonSteps = (curriculum.lessonSteps || []).filter((row) => row.courseId === courseId);
  const uniqueConcepts = new Set(vocabulary.map((row) => row.conceptId));
  if (String(curriculum.meta?.sourceSha256 || '').toLowerCase() !== sourceWorkbookSha256.toLowerCase()) {
    errors.push('Generated curriculum source hash does not match the canonical workbook.');
  }
  const approvedVocabulary = vocabulary.filter((row) => row.reviewStatus === 'approved');
  const courseContentSha256 = buildCourseContentSha256(curriculum, courseId);
  if (curriculum.meta?.courseContentSha256?.[courseId] !== courseContentSha256) {
    errors.push('Generated curriculum course content fingerprint is missing or stale.');
  }
  if (vocabulary.length !== 39 || uniqueConcepts.size !== 39) errors.push(`${courseId} requires exactly 39 unique vocabulary rows.`);
  const normalizedLocalizedAnswers = vocabulary
    .map((row) => normalizeLocalizedAnswer(row.localized))
    .filter(Boolean);
  const duplicateLocalizedAnswers = [...new Set(
    normalizedLocalizedAnswers.filter(
      (answer, index) => normalizedLocalizedAnswers.indexOf(answer) !== index
    )
  )];
  for (const duplicate of duplicateLocalizedAnswers) {
    errors.push(`${courseId} contains duplicate normalized localized answer "${duplicate}".`);
  }
  if (approvedVocabulary.length !== 39) errors.push(`${courseId} requires 39 approved vocabulary rows; found ${approvedVocabulary.length}.`);
  if (topics.length !== 9 || new Set(topics.map((row) => row.id)).size !== 9) errors.push(`${courseId} requires exactly nine unique topics.`);
  if (chapters.length !== 1 || chapters[0]?.topicCount !== 9 || chapters[0]?.wordCount !== 39) {
    errors.push(`${courseId} requires one 9-topic, 39-word chapter.`);
  }
  const presentationResolver = options.getCoursePresentationMetadata || getCoursePresentationMetadata;
  const presentation = presentationResolver(courseId);
  if (!presentation?.flag || !presentation?.heroAsset) {
    errors.push(`${courseId} requires an explicit runtime presentation with a flag and chapter hero.`);
  } else {
    if (normalizedPath(presentation.heroAsset) !== normalizedPath(chapters[0]?.heroAsset)) {
      errors.push(`${courseId} runtime chapter hero does not match the workbook chapter.`);
    }
    if (!readFile(normalizedPath(presentation.heroAsset))) {
      errors.push(`${courseId} runtime chapter hero file is missing: ${presentation.heroAsset}.`);
    }
  }
  const topicIdsWithSteps = new Set(lessonSteps.map((row) => row.topicId));
  for (const topic of topics) if (!topicIdsWithSteps.has(topic.id)) errors.push(`${courseId}/${topic.id} has no workbook-backed lesson steps.`);
  const primaryConcepts = new Set(lessonSteps.filter((row) => row.primary && row.conceptId).map((row) => row.conceptId));
  if (primaryConcepts.size !== 39) errors.push(`${courseId} lesson steps must teach all 39 concepts as primary exercises.`);

  const imageDirectory = `assets/images/vocab/${courseId}`;
  const expectedImageNames = vocabulary.map((row) => `${row.conceptId}.png`).sort();
  const actualImageNames = listFiles(imageDirectory).filter((name) => name.toLowerCase().endsWith('.png')).sort();
  if (JSON.stringify(actualImageNames) !== JSON.stringify(expectedImageNames)) {
    errors.push(`${courseId} must contain exactly 39 canonical vocabulary images with no extras.`);
  }
  const imageHashes = new Set();
  let existingImages = 0;
  for (const row of vocabulary) {
    const expectedPath = `${imageDirectory}/${row.conceptId}.png`;
    if (normalizedPath(row.image) !== expectedPath) errors.push(`${courseId}/${row.conceptId} uses a non-canonical image path.`);
    const image = readFile(expectedPath);
    if (!image) {
      errors.push(`Vocabulary image is missing: ${expectedPath}.`);
      continue;
    }
    existingImages += 1;
    imageHashes.add(sha256(image));
    for (const failure of validateImage(image, expectedPath) || []) {
      errors.push(`Vocabulary image failed transparency audit: ${failure.message || failure}.`);
    }
  }
  if (imageHashes.size !== 39) errors.push(`${courseId} requires 39 unique vocabulary illustrations; found ${imageHashes.size}.`);

  if (!approval || typeof approval !== 'object') {
    errors.push(`${courseId} has no release approval record.`);
  } else {
    if (approval.schemaVersion !== 1) errors.push('Release approval record must use schemaVersion 1.');
    if (approval.courseId !== courseId) errors.push('Release approval record courseId does not match the course.');
    if (approval.sourceWorkbookSha256 !== sourceWorkbookSha256) errors.push('Release approval record is stale for the current workbook.');
  }
  const voicePlanBuilder = options.buildCourseVoicePlan || buildCourseVoicePlan;
  const voicePlan = voicePlanBuilder(course);

  if (requireApproval(approval?.nativeReview, 'Native-language review', errors)) {
    const receipt = parseJsonArtifact({
      readFile,
      relativePath: approval.nativeReview.receiptPath,
      expectedSha256: approval.nativeReview.receiptSha256,
      label: 'Native-review receipt',
      errors,
    });
    if (receipt) {
      if (receipt.courseId !== courseId || receipt.approvedRows !== 39) errors.push('Native-review receipt does not approve all 39 course rows.');
      if (receipt.sourceWorkbookSha256After !== sourceWorkbookSha256) errors.push('Native-review receipt is stale for the current workbook.');
      if (!Array.isArray(receipt.reviewers) || !receipt.reviewers.length) errors.push('Native-review receipt has no reviewer attribution.');
      if (!isTrackedReleaseEvidencePath(receipt.reviewWorkbookPath)) {
        errors.push('Native-review workbook must be stored as tracked release evidence.');
      }
      const reviewedWorkbook = isTrackedReleaseEvidencePath(receipt.reviewWorkbookPath)
        ? readFile(normalizedPath(receipt.reviewWorkbookPath))
        : null;
      if (!reviewedWorkbook || sha256(reviewedWorkbook) !== receipt.reviewWorkbookSha256) {
        errors.push('Native-review workbook is missing or does not match its receipt.');
      }
    }
  }

  if (requireApproval(approval?.artReview, 'Cultural artwork/contact-sheet review', errors)) {
    if (!approval.artReview.approvedBy || !approval.artReview.approvedAt) errors.push('Artwork review requires approver attribution and date.');
    if (!isTrackedReleaseEvidencePath(approval.artReview.contactSheetPath)) {
      errors.push('Contact sheet must be stored as tracked release evidence.');
    }
    const contactSheet = isTrackedReleaseEvidencePath(approval.artReview.contactSheetPath)
      ? readFile(normalizedPath(approval.artReview.contactSheetPath))
      : null;
    if (!contactSheet || sha256(contactSheet) !== approval.artReview.contactSheetSha256) {
      errors.push('Contact sheet is missing or does not match the artwork approval record.');
    }
  }

  let approvedTargetAudio = 0;
  if (requireApproval(approval?.targetAudio, 'Target-language audio', errors)) {
    if (!voicePlan.targetLanguageRoleId) errors.push(`${courseId} has no approved target-language role candidate.`);
    if (!voicePlan.targetLanguageEnabled || voicePlan.targetLanguageStatus !== 'approved-for-learning') {
      errors.push('Target-language voice role must be enabled and approved for learning.');
    }
    if (approval.targetAudio.roleId !== voicePlan.targetLanguageRoleId) {
      errors.push(`Target audio must use ${voicePlan.targetLanguageRoleId || 'an assigned target-language role'}.`);
    }
    if (!String(approval.targetAudio.voiceId || '').trim()) errors.push('Target audio requires an exact approved voice ID.');
    if (!String(approval.targetAudio.modelId || '').trim()) errors.push('Target audio requires an exact approved model ID.');
    if (!String(approval.targetAudio.outputFormat || '').trim()) errors.push('Target audio requires an exact approved output format.');
    if (!approval.targetAudio.voiceApprovedBy || !approval.targetAudio.voiceApprovedAt) {
      errors.push('Target audio voice approval requires reviewer attribution and date.');
    }
    const manifest = parseJsonArtifact({
      readFile,
      relativePath: approval.targetAudio.manifestPath,
      expectedSha256: approval.targetAudio.manifestSha256,
      label: 'Target-language audio manifest',
      errors,
    });
    const entries = manifest?.entries || [];
    if (manifest && (manifest.courseId !== courseId || manifest.roleId !== voicePlan.targetLanguageRoleId)) {
      errors.push('Target-language audio manifest course or role does not match the course voice plan.');
    }
    if (manifest && manifest.voiceId !== approval.targetAudio.voiceId) {
      errors.push('Target-language audio manifest does not use the exact approved voice ID.');
    }
    if (manifest && manifest.modelId !== approval.targetAudio.modelId) {
      errors.push('Target-language audio manifest does not use the exact approved model ID.');
    }
    if (manifest && manifest.outputFormat !== approval.targetAudio.outputFormat) {
      errors.push('Target-language audio manifest does not use the exact approved output format.');
    }
    if (entries.length !== 39 || new Set(entries.map((entry) => entry.conceptId)).size !== 39) {
      errors.push(`${courseId} requires exactly 39 target audio entries.`);
    }
    const expectedConceptIds = new Set(vocabulary.map((row) => row.conceptId));
    const manifestConceptIds = new Set(entries.map((entry) => entry.conceptId).filter(Boolean));
    const missingConceptIds = [...expectedConceptIds].filter((conceptId) => !manifestConceptIds.has(conceptId));
    const unknownConceptIds = [...manifestConceptIds].filter((conceptId) => !expectedConceptIds.has(conceptId));
    if (missingConceptIds.length) {
      errors.push(`Target audio manifest is missing concepts: ${missingConceptIds.join(', ')}.`);
    }
    if (unknownConceptIds.length) {
      errors.push(`Target audio manifest contains unknown concepts: ${unknownConceptIds.join(', ')}.`);
    }
    const entriesByConcept = new Map(entries.map((entry) => [entry.conceptId, entry]));
    for (const row of vocabulary) {
      const entry = entriesByConcept.get(row.conceptId);
      if (!entry) continue;
      if (entry.status !== 'approved-for-learning') errors.push(`Target audio ${row.conceptId} is not approved for learning.`);
      validateAudioProvenance(entry, {
        text: row.localized,
        voiceId: approval.targetAudio.voiceId,
        voiceRole: voicePlan.targetLanguageRoleId,
        modelId: approval.targetAudio.modelId,
        outputFormat: approval.targetAudio.outputFormat,
      }, errors, `Target audio ${row.conceptId}`);
      validateAudioFile(
        entry,
        `assets/audio/${courseId}/${row.conceptId}.mp3`,
        readFile,
        validateAudio,
        errors,
        `Target audio ${row.conceptId}`
      );
      approvedTargetAudio += 1;
    }
  }

  let approvedNarratorAudio = 0;
  if (requireApproval(approval?.narratorAudio, 'Base-language narrator audio', errors)) {
    if (!voicePlan.narratorEnabled || voicePlan.narratorStatus !== 'approved-for-learning') {
      errors.push('Narrator voice role must be enabled and approved for learning.');
    }
    if (approval.narratorAudio.roleId !== voicePlan.narratorRoleId) errors.push(`Narrator audio must use ${voicePlan.narratorRoleId}.`);
    if (!String(approval.narratorAudio.voiceId || '').trim()) errors.push('Narrator audio requires an exact approved voice ID.');
    if (!String(approval.narratorAudio.modelId || '').trim()) errors.push('Narrator audio requires an exact approved model ID.');
    if (!String(approval.narratorAudio.outputFormat || '').trim()) errors.push('Narrator audio requires an exact approved output format.');
    if (!approval.narratorAudio.voiceApprovedBy || !approval.narratorAudio.voiceApprovedAt) {
      errors.push('Narrator voice approval requires reviewer attribution and date.');
    }
    if (
      approval.narratorAudio.voiceId
      && approval.narratorAudio.voiceId === approval?.targetAudio?.voiceId
    ) {
      errors.push('Target-language and narrator audio require distinct voice IDs.');
    }
    const manifest = parseJsonArtifact({
      readFile,
      relativePath: approval.narratorAudio.manifestPath,
      expectedSha256: approval.narratorAudio.manifestSha256,
      label: 'Narrator audio manifest',
      errors,
    });
    const entries = manifest?.entries || [];
    if (manifest && manifest.roleId !== voicePlan.narratorRoleId) errors.push('Narrator audio manifest role does not match the course voice plan.');
    if (manifest && manifest.voiceId !== approval.narratorAudio.voiceId) {
      errors.push('Narrator audio manifest does not use the exact approved voice ID.');
    }
    if (manifest && manifest.modelId !== approval.narratorAudio.modelId) {
      errors.push('Narrator audio manifest does not use the exact approved model ID.');
    }
    if (manifest && manifest.outputFormat !== approval.narratorAudio.outputFormat) {
      errors.push('Narrator audio manifest does not use the exact approved output format.');
    }
    if (entries.length !== 3 || new Set(entries.map((entry) => entry.id)).size !== 3) errors.push('Narrator audio manifest must contain exactly three approved audition prompts.');
    const expectedNarratorEntries = new Map(
      (NARRATOR_SAMPLE_SCRIPTS[voicePlan.narratorRoleId] || []).map((entry) => [entry.id, entry])
    );
    for (const entry of entries) {
      if (entry.status !== 'approved-for-learning') errors.push(`Narrator audio ${entry.id} is not approved for learning.`);
      const expected = expectedNarratorEntries.get(entry.id);
      if (!expected) errors.push(`Narrator audio ${entry.id || '(blank)'} is not an approved audition prompt.`);
      else validateAudioProvenance(entry, {
        text: expected.text,
        voiceId: approval.narratorAudio.voiceId,
        voiceRole: voicePlan.narratorRoleId,
        modelId: approval.narratorAudio.modelId,
        outputFormat: approval.narratorAudio.outputFormat,
      }, errors, `Narrator audio ${entry.id}`);
      validateAudioFile(
        entry,
        `assets/audio/narrators/${voicePlan.baseLanguage === 'French' ? 'fr' : voicePlan.baseLanguage === 'Arabic' ? 'ar' : 'en'}/${entry.id}.mp3`,
        readFile,
        validateAudio,
        errors,
        `Narrator audio ${entry.id}`
      );
      approvedNarratorAudio += 1;
    }
  }

  const automated = approval?.automatedChecks;
  if (!automated || automated.status !== 'passed') errors.push('Automated release checks must be recorded as passed.');
  else {
    if (automated.sourceWorkbookSha256 !== sourceWorkbookSha256) errors.push('Automated release checks are stale for the current workbook.');
    for (const command of requiredAutomatedChecksForCourse(courseId)) {
      if (!automated.commands?.includes(command)) errors.push(`Automated release evidence is missing: ${command}.`);
    }
    if (!automated.recordedAt) errors.push('Automated release checks require a recordedAt timestamp.');
  }

  const phone = approval?.phoneTest;
  if (!phone || phone.status !== 'approved') errors.push('Physical iPhone test must be explicitly approved.');
  else {
    if (phone.sourceWorkbookSha256 !== sourceWorkbookSha256) errors.push('Phone test approval is stale for the current workbook.');
    if (String(phone.platform).toLowerCase() !== 'ios' || String(phone.expoSdk) !== '54') errors.push('Phone test must use iOS with Expo SDK 54.');
    if (
      String(phone.deviceKind).toLowerCase() !== 'physical'
      || String(phone.client).toLowerCase() !== 'expo-go'
    ) {
      errors.push('Phone test must use a physical iPhone with Expo Go.');
    }
    const expectedTopicIds = new Set(topics.map((topic) => topic.id));
    const completedTopicIds = new Set(
      Array.isArray(phone.completedTopicIds) ? phone.completedTopicIds : []
    );
    if (
      completedTopicIds.size !== expectedTopicIds.size
      || [...expectedTopicIds].some((topicId) => !completedTopicIds.has(topicId))
    ) {
      errors.push('Phone test must complete all nine course topics.');
    }
    if (phone.audioPlaybackVerified !== true) {
      errors.push('Phone test must verify the controlled audio playback rules.');
    }
    if (phone.restartPersistenceVerified !== true) {
      errors.push('Phone test must verify restart and progress persistence.');
    }
    if (phone.authHandoffVerified !== true) {
      errors.push('Phone test must verify the auth handoff.');
    }
    if (!phone.testedBy || !phone.testedAt) errors.push('Phone test approval requires tester attribution and date.');
  }

  const publication = approval?.publicationApproval;
  if (!publication || publication.status !== 'approved') errors.push('Course publication requires explicit user approval.');
  else {
    if (publication.sourceWorkbookSha256 !== sourceWorkbookSha256) errors.push('Publication approval is stale for the current workbook.');
    if (!publication.approvedBy || !publication.approvedAt) errors.push('Publication approval requires approver attribution and date.');
  }

  const artifactStagesApproved = [
    approval?.nativeReview,
    approval?.artReview,
    approval?.targetAudio,
    approval?.narratorAudio,
  ].every((stage) => stage?.status === 'approved');
  let computedCandidateDigest = null;
  if (artifactStagesApproved) {
    const candidateBuilder = options.buildReleaseCandidateDigest || buildReleaseCandidateDigest;
    const candidate = candidateBuilder({
      courseId,
      curriculum,
      sourceWorkbookSha256,
      approval,
      presentation,
      readFile,
    });
    for (const candidateError of candidate.errors || []) {
      errors.push(`Release candidate: ${candidateError}`);
    }
    if (candidate.ready) {
      computedCandidateDigest = candidate.digest;
      if (approval.candidateDigest !== candidate.digest) {
        errors.push('Release approval record candidate digest does not match the computed release candidate.');
      }
      for (const [stage, label] of [
        [approval.nativeReview, 'Native-language review'],
        [approval.artReview, 'Artwork review'],
        [approval.targetAudio, 'Target-language audio'],
        [approval.narratorAudio, 'Narrator audio'],
        [approval.automatedChecks, 'Automated release checks'],
        [approval.phoneTest, 'Phone test'],
        [approval.publicationApproval, 'Publication approval'],
      ]) {
        if (stage?.candidateDigest !== candidate.digest) {
          errors.push(`${label} candidate digest does not match the computed release candidate.`);
        }
      }
    }
  }

  const summary = Object.freeze({
    vocabulary: vocabulary.length,
    topics: topics.length,
    lessonSteps: lessonSteps.length,
    images: existingImages,
    targetAudio: approvedTargetAudio,
    narratorAudio: approvedNarratorAudio,
  });
  return Object.freeze({
    ready: errors.length === 0,
    courseId,
    courseContentSha256,
    computedCandidateDigest,
    errors: Object.freeze(errors),
    summary,
  });
}

module.exports = {
  REQUIRED_AUTOMATED_CHECKS,
  buildCourseReleaseReport,
  requiredAutomatedChecksForCourse,
};
