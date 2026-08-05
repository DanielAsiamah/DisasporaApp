const fs = require('node:fs');
const path = require('node:path');

const { JAMAICAN_PATOIS_VOCABULARY } = require('../src/data/jamaicanPatoisVocabulary.cjs');
const { GENERATED_CURRICULUM } = require('../src/data/generatedCurriculum.cjs');
const {
  buildCourseAudioManifest,
  createCourseAuditionPlan,
  shouldGenerateClip,
  validateVocabularyForGeneration,
  validateSpendGate,
} = require('../src/audio/patoisAudioManifest.cjs');

const projectRoot = path.resolve(__dirname, '..');
const COURSE_CONFIGS = Object.freeze({
  'jamaican-patois': Object.freeze({
    vocabulary: JAMAICAN_PATOIS_VOCABULARY,
    defaultVoiceRole: null,
    plannedManifestFilename: 'patois-manifest.planned.json',
    expectedNames: Object.freeze({
      'target-patois-denzel': /Denzel/i,
      'target-patois-annakay': /Annakay/i,
    }),
  }),
  swahili: Object.freeze({
    vocabulary: GENERATED_CURRICULUM.courseVocabulary.filter((row) => row.courseId === 'swahili'),
    defaultVoiceRole: 'target-swahili-yna',
    plannedManifestFilename: 'swahili-manifest.planned.json',
    expectedNames: Object.freeze({ 'target-swahili-yna': /Yna Agalo/i }),
  }),
});

function loadPrivateEnvironment() {
  for (const filename of ['.env.local', '.env']) {
    const envPath = path.join(projectRoot, filename);
    if (!fs.existsSync(envPath)) continue;
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!match || process.env[match[1]] !== undefined) continue;
      process.env[match[1]] = match[2].trim().replace(/^(?:"(.*)"|'(.*)')$/, '$1$2');
    }
  }
}

function parseArgs(argv) {
  const options = {
    generate: false,
    approved: false,
    force: false,
    maxCredits: 250,
    account: 'primary',
    courseId: 'jamaican-patois',
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--generate') options.generate = true;
    else if (argument === '--approve-spend') options.approved = true;
    else if (argument === '--force') options.force = true;
    else if (argument === '--max-credits') options.maxCredits = Number(argv[++index]);
    else if (argument === '--account') options.account = argv[++index];
    else if (argument === '--course') options.courseId = argv[++index];
    else if (argument === '--help') options.help = true;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  if (!Number.isFinite(options.maxCredits) || options.maxCredits < 1 || options.maxCredits > 250) {
    throw new Error('--max-credits must be between 1 and the hard 250-credit limit.');
  }
  if (!['primary', 'secondary'].includes(options.account)) {
    throw new Error('--account must be either primary or secondary.');
  }
  if (!COURSE_CONFIGS[options.courseId]) {
    throw new Error(`--course must be one of: ${Object.keys(COURSE_CONFIGS).join(', ')}.`);
  }
  return options;
}

function printHelp() {
  console.log(`Prepare or generate a three-phrase course voice audition.

Default behavior is a zero-credit dry run.

Usage:
  node scripts/generate-patois-audition.js
  node scripts/generate-patois-audition.js --course swahili --generate --approve-spend [--account primary|secondary] [--max-credits 250] [--force]

Paid generation is impossible without both --generate and --approve-spend.`);
}

function writeJson(filename, value) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function readJson(filename) {
  if (!fs.existsSync(filename)) return null;
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

async function requestJson(url, apiKey) {
  const response = await fetch(url, { headers: { 'xi-api-key': apiKey } });
  if (!response.ok) throw new Error(`ElevenLabs ${response.status}: ${(await response.text()).slice(0, 300)}`);
  return response.json();
}

async function resolveAndValidateCast(entries, apiKey, expectedNames) {
  const roles = [...new Set(entries.map(({ voiceRole, voiceEnvVar }) => `${voiceRole}|${voiceEnvVar}`))]
    .map((entry) => {
      const [voiceRole, voiceEnvVar] = entry.split('|');
      const voiceId = process.env[voiceEnvVar];
      if (!voiceId) throw new Error(`Missing ${voiceEnvVar}.`);
      return { voiceRole, voiceEnvVar, voiceId };
    });
  if (new Set(roles.map(({ voiceId }) => voiceId)).size !== roles.length) {
    throw new Error('Distinct target-language roles must not resolve to the same ElevenLabs voice ID.');
  }

  for (const role of roles) {
    const voice = await requestJson(`https://api.elevenlabs.io/v1/voices/${encodeURIComponent(role.voiceId)}`, apiKey);
    const expectedName = expectedNames[role.voiceRole];
    if (!expectedName || !expectedName.test(voice.name || '')) {
      throw new Error(`${role.voiceEnvVar} resolved to "${voice.name || 'unknown'}", not the configured ${role.voiceRole} candidate.`);
    }
    role.resolvedName = voice.name;
  }
  return roles;
}

async function getLiveBalance(apiKey) {
  const subscription = await requestJson('https://api.elevenlabs.io/v1/user/subscription', apiKey);
  const used = Number(subscription.character_count);
  const limit = Number(subscription.character_limit);
  if (!Number.isFinite(used) || !Number.isFinite(limit)) throw new Error('ElevenLabs did not return a usable live credit balance.');
  return { liveBalance: Math.max(0, limit - used), used, limit, tier: subscription.tier };
}

async function requestSpeech(entry, voiceId, apiKey) {
  const endpoint = new URL(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`);
  endpoint.searchParams.set('output_format', entry.outputFormat);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Accept: 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({ text: entry.text, model_id: entry.modelId }),
  });
  if (!response.ok) throw new Error(`ElevenLabs ${response.status} for ${entry.conceptId}: ${(await response.text()).slice(0, 300)}`);
  return {
    audio: Buffer.from(await response.arrayBuffer()),
    characterCost: Number(response.headers.get('character-cost')) || null,
    requestId: response.headers.get('request-id') || null,
  };
}

async function main() {
  loadPrivateEnvironment();
  const options = parseArgs(process.argv.slice(2));
  if (options.help) return printHelp();

  const config = COURSE_CONFIGS[options.courseId];
  const manifest = buildCourseAudioManifest({
    courseId: options.courseId,
    vocabulary: config.vocabulary,
    defaultVoiceRole: config.defaultVoiceRole,
  });
  const audition = createCourseAuditionPlan(manifest);
  const plannedManifestPath = path.join(projectRoot, 'outputs', 'audio', config.plannedManifestFilename);
  const auditionRoot = path.join(projectRoot, 'assets', 'audio', 'auditions', options.courseId);
  const generatedManifestPath = path.join(auditionRoot, 'manifest.json');
  writeJson(plannedManifestPath, manifest);

  console.log(`Planned manifest: ${path.relative(projectRoot, plannedManifestPath)}`);
  console.log(`Audition: ${audition.entries.length} phrases, estimated ${audition.estimatedCredits} credits, hard cap ${options.maxCredits}`);
  for (const entry of audition.entries) console.log(`[planned] ${entry.conceptId} (${entry.voiceRole}) -> ${entry.filename}`);

  if (!options.generate) {
    console.log('Dry run complete: no API balance request, TTS request, or credit spend occurred.');
    return;
  }

  if (!options.approved) {
    throw new Error('Pass --approve-spend after explicit user approval; generation stops before any ElevenLabs request.');
  }
  const vocabularyErrors = validateVocabularyForGeneration(config.vocabulary);
  if (vocabularyErrors.length) {
    throw new Error(vocabularyErrors.join(' '));
  }
  if (process.env.ELEVENLABS_KEYS_ROTATED !== 'true') {
    throw new Error('Rotate the exposed ElevenLabs keys, then set ELEVENLABS_KEYS_ROTATED=true in the private development environment.');
  }

  const apiKeyEnvVar = options.account === 'secondary' ? 'ELEVENLABS_API_KEY_SECONDARY' : 'ELEVENLABS_API_KEY';
  const apiKey = process.env[apiKeyEnvVar];
  if (!apiKey) throw new Error(`${apiKeyEnvVar} is missing from the private development environment.`);
  const cast = await resolveAndValidateCast(audition.entries, apiKey, config.expectedNames);
  const balance = await getLiveBalance(apiKey);
  const spendErrors = validateSpendGate({
    approved: options.approved,
    estimatedCredits: audition.estimatedCredits,
    liveBalance: balance.liveBalance,
    maxCredits: options.maxCredits,
  });
  if (spendErrors.length) throw new Error(spendErrors.join(' '));

  const existingManifest = readJson(generatedManifestPath);
  const existingByConcept = new Map((existingManifest?.entries || []).map((entry) => [entry.conceptId, entry]));
  const voiceIdByRole = new Map(cast.map(({ voiceId, voiceRole }) => [voiceRole, voiceId]));
  const generatedEntries = [];
  let generatedCount = 0;

  for (const entry of audition.entries) {
    const outputPath = path.join(auditionRoot, `${entry.conceptId}.mp3`);
    const existing = existingByConcept.get(entry.conceptId);
    const voiceId = voiceIdByRole.get(entry.voiceRole);
    const plannedEntry = { ...entry, voiceId };
    if (!shouldGenerateClip({ planned: plannedEntry, existing, fileExists: fs.existsSync(outputPath), force: options.force })) {
      generatedEntries.push(existing);
      console.log(`[reuse] ${entry.conceptId}`);
      continue;
    }
    const result = await requestSpeech(entry, voiceId, apiKey);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(`${outputPath}.tmp`, result.audio);
    fs.renameSync(`${outputPath}.tmp`, outputPath);
    generatedEntries.push({
      ...entry,
      voiceId,
      filename: path.posix.join('auditions', options.courseId, `${entry.conceptId}.mp3`),
      requestId: result.requestId,
      characterCost: result.characterCost,
      status: 'audition-generated-awaiting-approval',
    });
    generatedCount += 1;
    console.log(`[generated] ${entry.conceptId}`);
  }

  writeJson(generatedManifestPath, {
    schemaVersion: 1,
    courseId: options.courseId,
    generatedAt: new Date().toISOString(),
    liveBalanceBeforeBatch: balance.liveBalance,
    estimatedCredits: audition.estimatedCredits,
    maxCredits: options.maxCredits,
    cast: cast.map(({ voiceId, voiceRole, voiceEnvVar, resolvedName }) => ({ voiceId, voiceRole, voiceEnvVar, resolvedName })),
    entries: generatedEntries,
  });
  console.log(`Audition complete: ${generatedCount} new clip(s). Approval is still required before these can become lesson audio.`);
}

main().catch((error) => {
  console.error(`Course audition failed: ${error.message}`);
  process.exitCode = 1;
});
