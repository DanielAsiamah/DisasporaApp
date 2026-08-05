const crypto = require('node:crypto');

const COMMON_RUNTIME_SOURCE_PATHS = Object.freeze([
  'App.js',
  'app.json',
  'package-lock.json',
  'package.json',
  'src/audio/courseProductionAudioRegistry.cjs',
  'src/audio/courseProductionAudioRegistry.js',
  'src/audio/courseVoicePlan.cjs',
  'src/audio/lessonAudioPolicy.cjs',
  'src/audio/lessonAudioController.cjs',
  'src/audio/lessonAudioEventGate.cjs',
  'src/audio/useControlledLessonAudio.js',
  'src/audio/voiceRoleContract.cjs',
  'src/components/mvp/PatoisLessonModal.js',
  'src/data/courseAccessPolicy.cjs',
  'src/data/courseCatalog.cjs',
  'src/data/courseImageRegistry.js',
  'src/data/coursePresentationContract.cjs',
  'src/data/coursePresentationRegistry.js',
  'src/data/generatedCurriculum.cjs',
  'src/hooks/useReducedMotion.js',
  'src/lessonEngine/answerNormalization.js',
  'src/lessonEngine/courseProgressKey.cjs',
  'src/lessonEngine/lessonAudioAvailability.js',
  'src/lessonEngine/lessonStepTypes.js',
  'src/lessonEngine/patoisLessonSession.cjs',
  'src/lessonEngine/patoisLessonSteps.cjs',
  'src/lessonEngine/topicProgress.cjs',
  'src/screens/MvpHomeScreen.js',
  'src/theme.js',
  'assets/sounds/wrong.mp3',
]);

const COURSE_RUNTIME_SOURCE_PATHS = Object.freeze({
  'jamaican-patois': Object.freeze([
    'src/audio/patoisProductionAudioRegistry.js',
    'src/data/jamaicanPatoisImageRegistry.js',
  ]),
  swahili: Object.freeze([
    'src/audio/swahiliProductionAudioRegistry.js',
    'src/data/swahiliImageRegistry.js',
  ]),
});

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function normalizeArtifactPath(value) {
  const normalized = String(value || '').trim().replace(/\\/g, '/').replace(/^\.\//, '');
  if (!normalized || normalized.startsWith('/') || /^[a-z]:\//i.test(normalized)) return null;
  const segments = normalized.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) return null;
  return normalized;
}

function buildReleaseCandidateDigest(options = {}) {
  const errors = [];
  const artifactBuffers = new Map();
  const courseId = String(options.courseId || '').trim();
  const curriculum = options.curriculum || {};
  const approval = options.approval || {};
  const presentation = options.presentation || {};
  const readFile = options.readFile || (() => null);
  const sourceWorkbookSha256 = String(options.sourceWorkbookSha256 || '').trim().toLowerCase();
  const explicitRuntimePaths = Array.isArray(options.runtimeSourcePaths)
    ? options.runtimeSourcePaths
    : null;
  const courseRuntimePaths = COURSE_RUNTIME_SOURCE_PATHS[courseId];
  const runtimeSourcePaths = explicitRuntimePaths || (
    courseRuntimePaths ? [...COMMON_RUNTIME_SOURCE_PATHS, ...courseRuntimePaths] : []
  );
  if (!explicitRuntimePaths && !courseRuntimePaths) {
    errors.push(`No release runtime source contract exists for ${courseId || '(blank)'}.`);
  }

  function addArtifact(value, label) {
    const artifactPath = normalizeArtifactPath(value);
    if (!artifactPath) {
      errors.push(`${label} has an invalid artifact path.`);
      return null;
    }
    if (artifactBuffers.has(artifactPath)) return artifactPath;
    const bytes = readFile(artifactPath);
    if (!bytes) {
      errors.push(`${label} is missing: ${artifactPath}.`);
      return null;
    }
    artifactBuffers.set(artifactPath, Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes));
    return artifactPath;
  }

  function addJsonArtifact(value, label) {
    const artifactPath = addArtifact(value, label);
    if (!artifactPath) return null;
    try {
      return JSON.parse(artifactBuffers.get(artifactPath).toString('utf8'));
    } catch (error) {
      errors.push(`${label} is not valid JSON: ${error.message}`);
      return null;
    }
  }

  for (const runtimePath of runtimeSourcePaths) addArtifact(runtimePath, 'Release runtime source');
  const workbookPath = addArtifact('patois_learn_database_1.xlsx', 'Canonical workbook');
  if (
    workbookPath
    && (!/^[a-f0-9]{64}$/.test(sourceWorkbookSha256)
      || sha256(artifactBuffers.get(workbookPath)) !== sourceWorkbookSha256)
  ) {
    errors.push('Canonical workbook SHA-256 does not match the candidate source hash.');
  }

  addArtifact(presentation.heroAsset, 'Course chapter hero');
  for (const row of (curriculum.courseVocabulary || []).filter((entry) => entry.courseId === courseId)) {
    addArtifact(row.image, `Vocabulary image ${row.conceptId || '(blank)'}`);
  }

  const receipt = addJsonArtifact(approval.nativeReview?.receiptPath, 'Native-review receipt');
  if (receipt?.reviewWorkbookPath) {
    addArtifact(receipt.reviewWorkbookPath, 'Native-review workbook');
  } else if (receipt) {
    errors.push('Native-review receipt does not reference its reviewed workbook.');
  }
  addArtifact(approval.artReview?.contactSheetPath, 'Artwork contact sheet');

  for (const [stage, label] of [
    [approval.targetAudio, 'Target-language audio manifest'],
    [approval.narratorAudio, 'Narrator audio manifest'],
  ]) {
    const manifest = addJsonArtifact(stage?.manifestPath, label);
    for (const entry of manifest?.entries || []) {
      addArtifact(entry.filename, `${label} file`);
    }
  }

  const artifacts = [...artifactBuffers.entries()]
    .map(([artifactPath, bytes]) => Object.freeze({ path: artifactPath, sha256: sha256(bytes) }))
    .sort((left, right) => left.path.localeCompare(right.path));
  if (errors.length) {
    return Object.freeze({
      ready: false,
      digest: null,
      errors: Object.freeze(errors),
      artifacts: Object.freeze(artifacts),
    });
  }
  const digestPayload = JSON.stringify({
    schemaVersion: 1,
    courseId,
    sourceWorkbookSha256,
    artifacts,
  });
  return Object.freeze({
    ready: true,
    digest: sha256(Buffer.from(digestPayload, 'utf8')),
    errors: Object.freeze([]),
    artifacts: Object.freeze(artifacts),
  });
}

module.exports = {
  COMMON_RUNTIME_SOURCE_PATHS,
  COURSE_RUNTIME_SOURCE_PATHS,
  buildReleaseCandidateDigest,
};
