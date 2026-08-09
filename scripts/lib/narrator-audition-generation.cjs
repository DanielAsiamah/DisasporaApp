const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const { buildNarratorAuditionManifest } = require('../../src/audio/narratorAudioManifest.cjs');
const { VOICE_ROLES } = require('../../src/audio/voiceRoleContract.cjs');
const { auditMp3Buffer } = require('./audit-mp3.cjs');
const { assertSafePrivateElevenLabsKey } = require('./elevenlabs-key-safety.cjs');

const HARD_CREDIT_LIMIT = 250;
const ROLE_IDS = Object.freeze(['narrator-en', 'narrator-fr', 'narrator-ar']);

function clean(value) {
  return String(value ?? '').trim();
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function parseNarratorAuditionArgs(argv = []) {
  const options = {
    account: 'primary',
    approveSpend: false,
    force: false,
    generate: false,
    help: false,
    maxCredits: HARD_CREDIT_LIMIT,
    roleId: '',
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--account') options.account = argv[++index];
    else if (argument === '--approve-spend') options.approveSpend = true;
    else if (argument === '--force') options.force = true;
    else if (argument === '--generate') options.generate = true;
    else if (argument === '--help') options.help = true;
    else if (argument === '--max-credits') options.maxCredits = Number(argv[++index]);
    else if (argument === '--role') options.roleId = argv[++index];
    else throw new Error(`Unknown argument: ${argument}`);
  }
  if (!options.help && !ROLE_IDS.includes(options.roleId)) {
    throw new Error(`--role must be one of: ${ROLE_IDS.join(', ')}.`);
  }
  if (!['primary', 'secondary'].includes(options.account)) {
    throw new Error('--account must be either primary or secondary.');
  }
  if (
    !Number.isInteger(options.maxCredits)
    || options.maxCredits < 1
    || options.maxCredits > HARD_CREDIT_LIMIT
  ) {
    throw new Error(
      `--max-credits must be between 1 and the hard ${HARD_CREDIT_LIMIT}-credit limit.`
    );
  }
  return options;
}

function buildNarratorAuditionPlan({ roleId, voiceId = '' } = {}) {
  if (!ROLE_IDS.includes(roleId)) {
    throw new Error(`Narrator role must be one of: ${ROLE_IDS.join(', ')}.`);
  }
  const source = buildNarratorAuditionManifest(roleId);
  const normalizedVoiceId = clean(voiceId);
  const entries = source.entries.map((entry) => Object.freeze({
    ...entry,
    filename: `content/release-evidence/audio/${roleId}/${entry.id}.mp3`,
    voiceId: normalizedVoiceId,
    status: 'planned-voice-review-required',
  }));
  return Object.freeze({
    schemaVersion: 1,
    roleId,
    roleKind: source.roleKind,
    locale: source.locale,
    voiceEnvVar: source.voiceEnvVar,
    voiceId: normalizedVoiceId,
    modelId: source.modelId,
    outputFormat: source.outputFormat,
    estimatedCredits: entries.reduce((total, entry) => total + entry.text.length, 0),
    maxCredits: HARD_CREDIT_LIMIT,
    entries: Object.freeze(entries),
  });
}

function privateApiKey(environment, account) {
  return account === 'secondary'
    ? clean(environment?.ELEVENLABS_API_KEY_SECONDARY)
    : clean(environment?.ELEVENLABS_API_KEY);
}

function validateExactPlan(plan) {
  const errors = [];
  if (!ROLE_IDS.includes(plan?.roleId)) {
    errors.push('The narrator audition plan has an unsupported role.');
    return errors;
  }
  const source = buildNarratorAuditionManifest(plan.roleId);
  for (const [field, expected] of Object.entries({
    schemaVersion: 1,
    roleKind: source.roleKind,
    locale: source.locale,
    voiceEnvVar: source.voiceEnvVar,
    modelId: source.modelId,
    outputFormat: source.outputFormat,
  })) {
    if (plan[field] !== expected) {
      errors.push(`The narrator audition plan has incorrect top-level ${field}.`);
    }
  }
  if (plan.entries?.length !== 3) {
    errors.push('Narrator auditions require exactly three clips.');
    return errors;
  }
  const sourceById = new Map(source.entries.map((entry) => [entry.id, entry]));
  const plannedIds = plan.entries.map((entry) => clean(entry?.id));
  const expectedIds = source.entries.map((entry) => entry.id);
  if (
    new Set(plannedIds).size !== expectedIds.length
    || expectedIds.some((id) => !plannedIds.includes(id))
  ) {
    errors.push('Narrator auditions require the exact three canonical prompts with no duplicates.');
  }
  for (const entry of plan.entries) {
    const expected = sourceById.get(entry.id);
    if (!expected) {
      errors.push(`Narrator audition entry ${entry.id || '(blank)'} is not in the role manifest.`);
      continue;
    }
    for (const field of ['text', 'textHash', 'voiceRole', 'modelId', 'outputFormat']) {
      if (entry[field] !== expected[field]) {
        errors.push(`Narrator audition entry ${entry.id} has incorrect ${field}.`);
      }
    }
    if (entry.voiceId !== plan.voiceId) {
      errors.push(`Narrator audition entry ${entry.id} has an inconsistent voice ID.`);
    }
    if (
      entry.filename
      !== `content/release-evidence/audio/${plan.roleId}/${entry.id}.mp3`
    ) {
      errors.push(`Narrator audition entry ${entry.id} has an incorrect filename.`);
    }
  }
  return errors;
}

function validateNarratorGenerationPreflight({
  environment = {},
  estimatedCredits,
  options = {},
  plan,
} = {}) {
  const errors = validateExactPlan(plan);
  if (!options.generate) errors.push('Paid narrator generation requires --generate.');
  if (!options.approveSpend) {
    errors.push('Explicit spend approval requires --approve-spend.');
  }
  if (environment.ELEVENLABS_KEYS_ROTATED !== 'true') {
    errors.push('ElevenLabs keys must be rotated before narrator generation.');
  }
  const role = VOICE_ROLES[options.roleId];
  if (
    !role
    || role.roleKind !== 'interface-narrator'
    || plan?.roleId !== options.roleId
  ) {
    errors.push('The narrator audition plan does not match the requested role.');
  } else {
    const configuredVoiceId = clean(environment[role.voiceEnvVar]);
    if (!configuredVoiceId || configuredVoiceId !== clean(plan?.voiceId)) {
      errors.push(
        `Narrator generation requires the exact private role voice ID from ${role.voiceEnvVar}.`
      );
    }
    if (plan?.voiceEnvVar !== role.voiceEnvVar) {
      errors.push('The narrator audition plan has an incorrect private voice variable.');
    }
  }
  if (!privateApiKey(environment, options.account)) {
    errors.push(
      `${options.account === 'secondary' ? 'ELEVENLABS_API_KEY_SECONDARY' : 'ELEVENLABS_API_KEY'}`
      + ' is required in the private development environment.'
    );
  } else {
    try {
      assertSafePrivateElevenLabsKey(
        privateApiKey(environment, options.account),
        options.account === 'secondary' ? 'ELEVENLABS_API_KEY_SECONDARY' : 'ELEVENLABS_API_KEY'
      );
    } catch (error) {
      errors.push(error.message);
    }
  }
  if (
    !Number.isInteger(options.maxCredits)
    || options.maxCredits < 1
    || options.maxCredits > HARD_CREDIT_LIMIT
  ) {
    errors.push(
      `The narrator audition cap must be between 1 and ${HARD_CREDIT_LIMIT} credits.`
    );
  }
  if (!Number.isInteger(estimatedCredits) || estimatedCredits < 0) {
    errors.push('The narrator audition credit estimate must be a non-negative integer.');
  } else if (estimatedCredits > options.maxCredits) {
    errors.push(`The narrator audition estimate exceeds the ${options.maxCredits}-credit cap.`);
  }
  return errors;
}

function shouldReuseNarratorClip({
  existing,
  fileInfo,
  force = false,
  planned,
} = {}) {
  if (force || !planned || !existing || !fileInfo?.exists) return false;
  if ((fileInfo.integrityFailures || []).length) return false;
  if (!/^[a-f0-9]{64}$/i.test(clean(existing.fileSha256))) return false;
  if (clean(fileInfo.sha256) !== clean(existing.fileSha256)) return false;
  if (existing.status !== 'generated-awaiting-voice-review') return false;
  return [
    'id',
    'text',
    'textHash',
    'filename',
    'voiceRole',
    'voiceId',
    'modelId',
    'outputFormat',
  ].every((field) => existing[field] === planned[field]);
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

async function runNarratorAuditionBatch({
  environment = {},
  existingManifest,
  options = {},
  plan,
  dependencies = {},
} = {}) {
  if (!options.generate) {
    return {
      mode: 'dry-run',
      plannedCount: plan?.entries?.length || 0,
      generatedCount: 0,
      reusedCount: 0,
      estimatedCredits: plan?.estimatedCredits || 0,
      networkRequests: 0,
    };
  }

  const initialErrors = validateNarratorGenerationPreflight({
    environment,
    estimatedCredits: plan?.estimatedCredits,
    options,
    plan,
  });
  if (initialErrors.length) throw new Error(initialErrors.join(' '));

  const existingById = new Map(
    (existingManifest?.entries || []).map((entry) => [clean(entry.id), entry])
  );
  const reusableEntries = new Map();
  const entriesToGenerate = [];
  for (const entry of plan.entries) {
    const existing = existingById.get(entry.id);
    const fileInfo = dependencies.inspectFile(entry.filename);
    if (shouldReuseNarratorClip({
      existing,
      fileInfo,
      force: options.force,
      planned: entry,
    })) {
      reusableEntries.set(entry.id, existing);
    } else {
      entriesToGenerate.push(entry);
    }
  }

  const estimatedCredits = entriesToGenerate.reduce(
    (total, entry) => total + entry.text.length,
    0
  );
  const spendErrors = validateNarratorGenerationPreflight({
    environment,
    estimatedCredits,
    options,
    plan,
  });
  if (spendErrors.length) throw new Error(spendErrors.join(' '));

  let liveBalance = null;
  let networkRequests = 0;
  if (entriesToGenerate.length) {
    networkRequests += 1;
    const balance = await dependencies.getLiveBalance(
      privateApiKey(environment, options.account)
    );
    liveBalance = Number(balance?.liveBalance);
    if (!Number.isFinite(liveBalance) || liveBalance < estimatedCredits) {
      throw new Error('Live account balance is insufficient for this narrator audition.');
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
      throw new Error(`ElevenLabs returned no MP3 audio for ${entry.id}.`);
    }
    const audit = auditMp3Buffer(result.audio, {
      label: `ElevenLabs response for ${entry.id}`,
    });
    if (audit.failures.length) {
      throw new Error(`Audio integrity validation failed: ${audit.failures.join(' ')}`);
    }
    const requestId = clean(result.requestId);
    if (!requestId) {
      throw new Error(`ElevenLabs returned no request ID for ${entry.id}.`);
    }
    const characterCost = Number(result.characterCost);
    if (!Number.isInteger(characterCost) || characterCost < 0) {
      throw new Error(`ElevenLabs returned no valid character cost for ${entry.id}.`);
    }
    actualCharacterCost += characterCost;
    if (actualCharacterCost > options.maxCredits) {
      throw new Error(`Reported character cost exceeded the ${options.maxCredits}-credit cap.`);
    }
    dependencies.writeAudioAtomic(entry.filename, result.audio);
    generatedEntries.set(entry.id, Object.freeze({
      ...entry,
      requestId,
      characterCost,
      fileSha256: sha256(result.audio),
      status: 'generated-awaiting-voice-review',
    }));
  }

  const entries = plan.entries.map(
    (entry) => generatedEntries.get(entry.id) || reusableEntries.get(entry.id)
  );
  const manifest = Object.freeze({
    schemaVersion: 1,
    roleId: plan.roleId,
    roleKind: plan.roleKind,
    locale: plan.locale,
    voiceEnvVar: plan.voiceEnvVar,
    voiceId: plan.voiceId,
    modelId: plan.modelId,
    outputFormat: plan.outputFormat,
    status: 'generated-awaiting-voice-review',
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
  HARD_CREDIT_LIMIT,
  ROLE_IDS,
  buildNarratorAuditionPlan,
  parseNarratorAuditionArgs,
  runNarratorAuditionBatch,
  shouldReuseNarratorClip,
  validateNarratorGenerationPreflight,
  writeFileAtomic,
};
