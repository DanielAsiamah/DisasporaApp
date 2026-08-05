const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const {
  AUDITION_CONCEPT_IDS,
  hashText,
} = require('../../src/audio/patoisAudioManifest.cjs');
const { auditMp3Buffer } = require('./audit-mp3.cjs');

const HARD_CREDIT_LIMIT = 1000;
const COURSE_CONFIGS = Object.freeze({
  swahili: Object.freeze({
    voiceRole: 'target-swahili-yna',
    voiceEnvVar: 'ELEVENLABS_VOICE_ID_SWAHILI',
    modelId: 'eleven_multilingual_v2',
    outputFormat: 'mp3_44100_128',
  }),
});

function clean(value) {
  return String(value ?? '').trim();
}

function parseCharacterCost(value) {
  if (value === null || value === undefined || clean(value) === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function parseProductionAudioArgs(argv = []) {
  const options = {
    account: 'primary',
    approveSpend: false,
    confirmNativeReview: false,
    confirmVoiceApproval: false,
    courseId: '',
    force: false,
    generate: false,
    help: false,
    maxCredits: HARD_CREDIT_LIMIT,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--account') options.account = argv[++index];
    else if (argument === '--approve-spend') options.approveSpend = true;
    else if (argument === '--confirm-native-review') options.confirmNativeReview = true;
    else if (argument === '--confirm-voice-approval') options.confirmVoiceApproval = true;
    else if (argument === '--course') options.courseId = argv[++index];
    else if (argument === '--force') options.force = true;
    else if (argument === '--generate') options.generate = true;
    else if (argument === '--help') options.help = true;
    else if (argument === '--max-credits') options.maxCredits = Number(argv[++index]);
    else throw new Error(`Unknown argument: ${argument}`);
  }
  if (!COURSE_CONFIGS[options.courseId] && !options.help) {
    throw new Error(`--course must be one of: ${Object.keys(COURSE_CONFIGS).join(', ')}.`);
  }
  if (!['primary', 'secondary'].includes(options.account)) {
    throw new Error('--account must be either primary or secondary.');
  }
  if (
    !Number.isInteger(options.maxCredits)
    || options.maxCredits < 1
    || options.maxCredits > HARD_CREDIT_LIMIT
  ) {
    throw new Error('--max-credits must be between 1 and the hard 1,000-credit limit.');
  }
  return options;
}

function buildCourseProductionAudioPlan({
  courseId,
  vocabulary = [],
  voiceRole,
  voiceId,
  modelId,
  outputFormat,
} = {}) {
  const normalizedCourseId = clean(courseId);
  const config = COURSE_CONFIGS[normalizedCourseId];
  if (!config) throw new Error(`Production audio is not configured for ${normalizedCourseId || '(blank)'}.`);
  const normalizedRole = clean(voiceRole);
  const normalizedVoiceId = clean(voiceId);
  const normalizedModelId = clean(modelId);
  const normalizedOutputFormat = clean(outputFormat);
  if (normalizedRole !== config.voiceRole) {
    throw new Error(`${normalizedCourseId} production audio requires voice role ${config.voiceRole}.`);
  }
  if (normalizedModelId !== config.modelId) {
    throw new Error(`${normalizedCourseId} production audio requires model ${config.modelId}.`);
  }
  if (normalizedOutputFormat !== config.outputFormat) {
    throw new Error(`${normalizedCourseId} production audio requires output ${config.outputFormat}.`);
  }

  const conceptIds = vocabulary.map((row) => clean(row?.conceptId));
  if (
    vocabulary.length !== 39
    || conceptIds.some((conceptId) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(conceptId))
    || new Set(conceptIds).size !== 39
  ) {
    throw new Error(`${normalizedCourseId} production audio requires exactly 39 unique concepts.`);
  }
  const entries = vocabulary
    .map((row) => {
      const conceptId = clean(row.conceptId);
      const text = clean(row.localized);
      if (!text) throw new Error(`${normalizedCourseId}/${conceptId} has no localized text.`);
      return Object.freeze({
        conceptId,
        text,
        textHash: hashText(text),
        filename: `assets/audio/${normalizedCourseId}/${conceptId}.mp3`,
        voiceRole: normalizedRole,
        voiceId: normalizedVoiceId,
        modelId: normalizedModelId,
        outputFormat: normalizedOutputFormat,
        status: 'planned-native-and-voice-approval-required',
      });
    })
    .sort((left, right) => {
      const leftIndex = conceptIds.indexOf(left.conceptId);
      const rightIndex = conceptIds.indexOf(right.conceptId);
      return leftIndex - rightIndex;
    });
  return Object.freeze({
    schemaVersion: 1,
    courseId: normalizedCourseId,
    roleId: normalizedRole,
    voiceId: normalizedVoiceId,
    modelId: normalizedModelId,
    outputFormat: normalizedOutputFormat,
    estimatedCredits: entries.reduce((total, entry) => total + entry.text.length, 0),
    entries: Object.freeze(entries),
  });
}

function privateApiKey(environment, account) {
  return account === 'secondary'
    ? clean(environment?.ELEVENLABS_API_KEY_SECONDARY)
    : clean(environment?.ELEVENLABS_API_KEY);
}

function validateGenerationPreflight({
  options = {},
  vocabulary = [],
  plan,
  environment = {},
  approval,
  estimatedCredits,
} = {}) {
  const errors = [];
  if (!options.generate) errors.push('Paid generation requires --generate.');
  if (!options.approveSpend) errors.push('Explicit spend approval requires --approve-spend.');
  if (!options.confirmNativeReview) {
    errors.push('Explicit native-review confirmation requires --confirm-native-review.');
  }
  if (!options.confirmVoiceApproval) {
    errors.push('Explicit voice-approval confirmation requires --confirm-voice-approval.');
  }
  if (environment.ELEVENLABS_KEYS_ROTATED !== 'true') {
    errors.push('ElevenLabs keys must be rotated before production generation.');
  }
  const nativeReview = approval?.nativeReview;
  const targetAudio = approval?.targetAudio;
  if (
    approval?.courseId !== options.courseId
    || nativeReview?.status !== 'approved'
    || !clean(nativeReview?.receiptPath).startsWith('content/release-evidence/native-review/')
    || !/^[a-f0-9]{64}$/i.test(clean(nativeReview?.receiptSha256))
  ) {
    errors.push('Paid generation requires tracked, approved native-review evidence.');
  }
  if (
    targetAudio?.voiceApprovalStatus !== 'approved'
    || !clean(targetAudio?.voiceApprovedBy)
    || !clean(targetAudio?.voiceApprovedAt)
  ) {
    errors.push('Paid generation requires attributed target voice approval.');
  }
  if (
    !clean(targetAudio?.auditionManifestPath)
      .startsWith(`content/release-evidence/audio/${options.courseId}/`)
    || !/^[a-f0-9]{64}$/i.test(clean(targetAudio?.auditionManifestSha256))
  ) {
    errors.push('Paid generation requires an approved tracked three-clip audition manifest.');
  }

  const config = COURSE_CONFIGS[clean(options.courseId)];
  const approvedCount = vocabulary.filter((row) => clean(row?.reviewStatus).toLowerCase() === 'approved').length;
  const uniqueConceptCount = new Set(vocabulary.map((row) => clean(row?.conceptId)).filter(Boolean)).size;
  if (vocabulary.length !== 39 || uniqueConceptCount !== 39 || approvedCount !== 39) {
    errors.push(`Paid generation requires 39 approved native-review rows; found ${approvedCount}.`);
  }
  if (!config || plan?.courseId !== options.courseId) {
    errors.push('The production plan does not match the requested course.');
  } else {
    const configuredVoiceId = clean(environment[config.voiceEnvVar]);
    if (!configuredVoiceId || !clean(plan?.voiceId) || plan.voiceId !== configuredVoiceId) {
      errors.push(`Production generation requires the exact approved voice ID from ${config.voiceEnvVar}.`);
    }
    if (plan?.roleId !== config.voiceRole) {
      errors.push(`Production generation requires exact voice role ${config.voiceRole}.`);
    }
    if (plan?.modelId !== config.modelId) {
      errors.push(`Production generation requires exact model ${config.modelId}.`);
    }
    if (plan?.outputFormat !== config.outputFormat) {
      errors.push(`Production generation requires exact output ${config.outputFormat}.`);
    }
    if (
      targetAudio?.roleId !== plan?.roleId
      || targetAudio?.voiceId !== plan?.voiceId
      || targetAudio?.modelId !== plan?.modelId
      || targetAudio?.outputFormat !== plan?.outputFormat
    ) {
      errors.push('Production generation plan does not match the approved target voice provenance.');
    }
  }
  if (!privateApiKey(environment, options.account)) {
    const variable = options.account === 'secondary'
      ? 'ELEVENLABS_API_KEY_SECONDARY'
      : 'ELEVENLABS_API_KEY';
    errors.push(`${variable} is required in the private development environment.`);
  }
  if (
    !Number.isInteger(options.maxCredits)
    || options.maxCredits < 1
    || options.maxCredits > HARD_CREDIT_LIMIT
  ) {
    errors.push(`The production batch cap must be between 1 and ${HARD_CREDIT_LIMIT} credits.`);
  }
  if (!Number.isInteger(estimatedCredits) || estimatedCredits < 0) {
    errors.push('The production credit estimate must be a non-negative integer.');
  } else if (estimatedCredits > options.maxCredits) {
    errors.push(`The production batch estimate exceeds the ${options.maxCredits}-credit cap.`);
  }
  return errors;
}

function validateProductionApprovalArtifacts({
  approval,
  plan,
  readArtifact,
} = {}) {
  const errors = [];
  const courseId = clean(plan?.courseId);
  const nativeReview = approval?.nativeReview;
  const targetAudio = approval?.targetAudio;
  const sourceWorkbookSha256 = clean(approval?.sourceWorkbookSha256).toLowerCase();

  const read = (filename, label) => {
    if (typeof readArtifact !== 'function') {
      errors.push(`Paid generation cannot verify ${label}: no artifact reader was provided.`);
      return null;
    }
    try {
      const value = readArtifact(filename);
      if (!Buffer.isBuffer(value) || value.length === 0) {
        errors.push(`${label} is missing or empty.`);
        return null;
      }
      return value;
    } catch (error) {
      errors.push(`${label} could not be read: ${error.message}`);
      return null;
    }
  };
  const parseJson = (buffer, label) => {
    if (!buffer) return null;
    try {
      return JSON.parse(buffer.toString('utf8'));
    } catch (error) {
      errors.push(`${label} is not valid JSON: ${error.message}`);
      return null;
    }
  };
  const verifyArtifactHash = (buffer, expectedSha, label) => {
    if (buffer && sha256(buffer) !== clean(expectedSha).toLowerCase()) {
      errors.push(`${label} SHA-256 does not match the approval record.`);
      return false;
    }
    return Boolean(buffer);
  };

  if (!/^[a-f0-9]{64}$/.test(sourceWorkbookSha256)) {
    errors.push('Approval evidence requires the canonical source workbook SHA-256.');
  }
  const expectedReceiptPath = (
    `content/release-evidence/native-review/${courseId}/${sourceWorkbookSha256}/receipt.json`
  );
  if (clean(nativeReview?.receiptPath) !== expectedReceiptPath) {
    errors.push('Native-review receipt path does not match the approved course and workbook hash.');
  }
  const receiptBytes = read(clean(nativeReview?.receiptPath), 'Native-review receipt');
  verifyArtifactHash(receiptBytes, nativeReview?.receiptSha256, 'Native-review receipt');
  const receipt = parseJson(receiptBytes, 'Native-review receipt');
  if (receipt) {
    if (
      receipt.schemaVersion !== 1
      || receipt.courseId !== courseId
      || receipt.approvedRows !== 39
      || receipt.sourceWorkbookSha256After !== sourceWorkbookSha256
      || !clean(receipt.appliedAt)
      || !Array.isArray(receipt.reviewers)
      || receipt.reviewers.filter((reviewer) => clean(reviewer)).length < 1
    ) {
      errors.push('Native-review receipt does not prove 39 attributed approvals for this workbook.');
    }
    const reviewWorkbookPath = clean(receipt.reviewWorkbookPath);
    const expectedReviewDirectory = (
      `content/release-evidence/native-review/${courseId}/${sourceWorkbookSha256}/`
    );
    if (!reviewWorkbookPath.startsWith(expectedReviewDirectory)) {
      errors.push('Reviewed workbook path is outside the canonical native-review evidence directory.');
    } else {
      const reviewedWorkbookBytes = read(reviewWorkbookPath, 'Reviewed workbook');
      if (
        reviewedWorkbookBytes
        && sha256(reviewedWorkbookBytes) !== clean(receipt.reviewWorkbookSha256).toLowerCase()
      ) {
        errors.push('Reviewed workbook SHA-256 does not match the native-review receipt.');
      }
    }
  }

  const expectedAuditionManifestPath = (
    `content/release-evidence/audio/${courseId}/audition-manifest.json`
  );
  if (clean(targetAudio?.auditionManifestPath) !== expectedAuditionManifestPath) {
    errors.push('Target audition manifest path is not the canonical course evidence path.');
  }
  const auditionBytes = read(clean(targetAudio?.auditionManifestPath), 'Target audition manifest');
  verifyArtifactHash(
    auditionBytes,
    targetAudio?.auditionManifestSha256,
    'Target audition manifest'
  );
  const audition = parseJson(auditionBytes, 'Target audition manifest');
  if (audition) {
    if (
      audition.schemaVersion !== 1
      || audition.courseId !== courseId
      || audition.roleId !== plan?.roleId
      || audition.voiceId !== plan?.voiceId
      || audition.modelId !== plan?.modelId
      || audition.outputFormat !== plan?.outputFormat
      || audition.status !== 'approved-for-production'
      || clean(audition.approvedBy) !== clean(targetAudio?.voiceApprovedBy)
      || clean(audition.approvedAt) !== clean(targetAudio?.voiceApprovedAt)
    ) {
      errors.push('Target audition manifest does not match the attributed approved voice provenance.');
    }
    const entries = Array.isArray(audition.entries) ? audition.entries : [];
    const auditionConceptIds = entries.map((entry) => clean(entry?.conceptId));
    if (
      entries.length !== AUDITION_CONCEPT_IDS.length
      || new Set(auditionConceptIds).size !== AUDITION_CONCEPT_IDS.length
      || AUDITION_CONCEPT_IDS.some((conceptId) => !auditionConceptIds.includes(conceptId))
    ) {
      errors.push('Target audition manifest must contain the exact three canonical audition concepts.');
    }
    for (const conceptId of AUDITION_CONCEPT_IDS) {
      const planned = plan?.entries?.find((entry) => entry.conceptId === conceptId);
      const entry = entries.find((candidate) => clean(candidate?.conceptId) === conceptId);
      if (!planned || !entry) continue;
      const expectedAudioPath = (
        `content/release-evidence/audio/${courseId}/auditions/${conceptId}.mp3`
      );
      if (
        entry.text !== planned.text
        || entry.textHash !== planned.textHash
        || entry.filename !== expectedAudioPath
        || entry.voiceRole !== plan.roleId
        || entry.voiceId !== plan.voiceId
        || entry.modelId !== plan.modelId
        || entry.outputFormat !== plan.outputFormat
        || entry.status !== 'approved-for-production'
        || !clean(entry.requestId)
        || parseCharacterCost(entry.characterCost) === null
        || !/^[a-f0-9]{64}$/i.test(clean(entry.fileSha256))
      ) {
        errors.push(`Approved target audition provenance is incomplete or stale for ${conceptId}.`);
        continue;
      }
      const audioBytes = read(expectedAudioPath, `Target audition audio ${conceptId}`);
      if (audioBytes && sha256(audioBytes) !== clean(entry.fileSha256).toLowerCase()) {
        errors.push(`Target audition audio SHA-256 does not match for ${conceptId}.`);
        continue;
      }
      if (audioBytes) {
        const audioAudit = auditMp3Buffer(audioBytes, {
          label: `Target audition audio ${conceptId}`,
        });
        errors.push(...audioAudit.failures);
      }
    }
  }

  return errors;
}

function shouldReuseProductionClip({
  planned,
  existing,
  fileInfo,
  force = false,
} = {}) {
  if (force || !planned || !existing || !fileInfo?.exists) return false;
  if (!/^[a-f0-9]{64}$/i.test(clean(existing.fileSha256))) return false;
  if (clean(fileInfo.sha256) !== clean(existing.fileSha256)) return false;
  if (!['generated-awaiting-audio-review', 'approved-for-learning'].includes(existing.status)) return false;
  return [
    'conceptId',
    'text',
    'textHash',
    'filename',
    'voiceRole',
    'voiceId',
    'modelId',
    'outputFormat',
  ].every((field) => planned[field] === existing[field]);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function writeFileAtomic(filename, value) {
  const absolutePath = path.resolve(filename);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  const temporaryPath = path.join(
    path.dirname(absolutePath),
    `.${path.basename(absolutePath)}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`
  );
  try {
    fs.writeFileSync(temporaryPath, value);
    fs.renameSync(temporaryPath, absolutePath);
  } finally {
    if (fs.existsSync(temporaryPath)) fs.rmSync(temporaryPath, { force: true });
  }
}

async function runCourseProductionAudioBatch({
  plan,
  vocabulary = [],
  options = {},
  environment = {},
  approval,
  existingManifest,
  dependencies = {},
} = {}) {
  if (!options.generate) {
    return Object.freeze({
      mode: 'dry-run',
      plannedCount: plan?.entries?.length || 0,
      generatedCount: 0,
      reusedCount: 0,
      estimatedCredits: plan?.estimatedCredits || 0,
      networkRequests: 0,
    });
  }

  const existingByConcept = new Map(
    (existingManifest?.entries || []).map((entry) => [clean(entry.conceptId), entry])
  );
  const reusableEntries = new Map();
  const entriesToGenerate = [];
  for (const entry of plan?.entries || []) {
    const existing = existingByConcept.get(entry.conceptId);
    const fileInfo = dependencies.inspectFile(entry.filename);
    if (shouldReuseProductionClip({
      planned: entry,
      existing,
      fileInfo,
      force: options.force,
    })) {
      reusableEntries.set(entry.conceptId, existing);
    } else {
      entriesToGenerate.push(entry);
    }
  }
  const estimatedCredits = entriesToGenerate.reduce(
    (total, entry) => total + entry.text.length,
    0
  );
  const preflightErrors = validateGenerationPreflight({
    options,
    vocabulary,
    plan,
    environment,
    approval,
    estimatedCredits,
  });
  if (preflightErrors.length) throw new Error(preflightErrors.join(' '));
  const approvalArtifactErrors = validateProductionApprovalArtifacts({
    approval,
    plan,
    readArtifact: dependencies.readArtifact,
  });
  if (approvalArtifactErrors.length) {
    throw new Error(approvalArtifactErrors.join(' '));
  }

  let liveBalance = null;
  let networkRequests = 0;
  if (entriesToGenerate.length) {
    networkRequests += 1;
    const balance = await dependencies.getLiveBalance(
      privateApiKey(environment, options.account)
    );
    liveBalance = Number(balance?.liveBalance);
    if (!Number.isFinite(liveBalance) || liveBalance < estimatedCredits) {
      throw new Error('Live account balance is insufficient for this production batch.');
    }
  }

  const generatedEntries = new Map();
  let actualCharacterCost = 0;
  for (const entry of entriesToGenerate) {
    networkRequests += 1;
    const result = await dependencies.requestSpeech(entry, {
      apiKey: privateApiKey(environment, options.account),
    });
    if (!Buffer.isBuffer(result?.audio) || result.audio.length === 0) {
      throw new Error(`ElevenLabs returned no MP3 audio for ${entry.conceptId}.`);
    }
    const audioAudit = auditMp3Buffer(result.audio, {
      label: `ElevenLabs response for ${entry.conceptId}`,
    });
    if (audioAudit.failures.length) {
      throw new Error(`Audio integrity validation failed: ${audioAudit.failures.join(' ')}`);
    }
    if (!clean(result.requestId)) {
      throw new Error(`ElevenLabs returned no request ID for ${entry.conceptId}.`);
    }
    const characterCost = Number(result.characterCost);
    if (!Number.isInteger(characterCost) || characterCost < 0) {
      throw new Error(`ElevenLabs returned no valid character cost for ${entry.conceptId}.`);
    }
    actualCharacterCost += characterCost;
    if (actualCharacterCost > options.maxCredits) {
      throw new Error(`Reported character cost exceeded the ${options.maxCredits}-credit cap.`);
    }
    dependencies.writeAudioAtomic(entry.filename, result.audio);
    generatedEntries.set(entry.conceptId, Object.freeze({
      ...entry,
      requestId: clean(result.requestId),
      characterCost,
      fileSha256: sha256(result.audio),
      status: 'generated-awaiting-audio-review',
    }));
  }

  const entries = plan.entries.map((entry) => (
    generatedEntries.get(entry.conceptId) || reusableEntries.get(entry.conceptId)
  ));
  const manifest = Object.freeze({
    schemaVersion: 1,
    courseId: plan.courseId,
    roleId: plan.roleId,
    voiceId: plan.voiceId,
    modelId: plan.modelId,
    outputFormat: plan.outputFormat,
    status: 'generated-awaiting-audio-review',
    generatedAt: (dependencies.now || (() => new Date().toISOString()))(),
    liveBalanceBeforeBatch: liveBalance,
    estimatedCredits,
    maxCredits: options.maxCredits,
    entries: Object.freeze(entries),
  });
  dependencies.writeManifestAtomic(manifest);
  return Object.freeze({
    mode: 'generated',
    plannedCount: plan.entries.length,
    generatedCount: generatedEntries.size,
    reusedCount: reusableEntries.size,
    estimatedCredits,
    actualCharacterCost,
    networkRequests,
    manifest,
  });
}

module.exports = {
  COURSE_CONFIGS,
  HARD_CREDIT_LIMIT,
  buildCourseProductionAudioPlan,
  parseCharacterCost,
  parseProductionAudioArgs,
  runCourseProductionAudioBatch,
  shouldReuseProductionClip,
  validateGenerationPreflight,
  validateProductionApprovalArtifacts,
  writeFileAtomic,
};
