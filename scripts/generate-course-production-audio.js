const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const { GENERATED_CURRICULUM } = require('../src/data/generatedCurriculum.cjs');
const {
  COURSE_CONFIGS,
  buildCourseProductionAudioPlan,
  parseCharacterCost,
  parseProductionAudioArgs,
  runCourseProductionAudioBatch,
  writeFileAtomic,
} = require('./lib/course-production-audio.cjs');

const projectRoot = path.resolve(__dirname, '..');

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

function printHelp() {
  console.log(`Plan or generate a complete 39-clip course production-audio batch.

Default behavior is an offline, zero-credit dry run.

Dry run:
  node scripts/generate-course-production-audio.js --course swahili

Paid generation (only after all human approvals):
  node scripts/generate-course-production-audio.js --course swahili --generate --approve-spend --confirm-native-review --confirm-voice-approval [--account primary|secondary] [--max-credits 1000] [--force]

The tracked manifest remains generated-awaiting-audio-review until a separate audio review approves it.`);
}

function readJson(filename) {
  if (!fs.existsSync(filename)) return null;
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function inspectFile(filename) {
  const absolutePath = path.resolve(projectRoot, filename);
  if (!fs.existsSync(absolutePath)) return { exists: false, sha256: null };
  return {
    exists: true,
    sha256: crypto.createHash('sha256').update(fs.readFileSync(absolutePath)).digest('hex'),
  };
}

function readReleaseEvidenceArtifact(filename) {
  const normalized = String(filename || '').replace(/\\/g, '/');
  if (!normalized.startsWith('content/release-evidence/') || path.isAbsolute(normalized)) {
    throw new Error(`Refusing to read non-evidence artifact: ${normalized || '(blank)'}.`);
  }
  const absolutePath = path.resolve(projectRoot, ...normalized.split('/'));
  const evidenceRoot = path.resolve(projectRoot, 'content', 'release-evidence');
  if (
    absolutePath !== evidenceRoot
    && !absolutePath.startsWith(`${evidenceRoot}${path.sep}`)
  ) {
    throw new Error(`Refusing to read artifact outside release evidence: ${normalized}.`);
  }
  return fs.readFileSync(absolutePath);
}

async function requestJson(url, apiKey) {
  const response = await fetch(url, {
    headers: { 'xi-api-key': apiKey },
  });
  if (!response.ok) {
    throw new Error(`ElevenLabs ${response.status}: ${(await response.text()).slice(0, 300)}`);
  }
  return response.json();
}

async function getLiveBalance(apiKey) {
  const subscription = await requestJson(
    'https://api.elevenlabs.io/v1/user/subscription',
    apiKey
  );
  const used = Number(subscription.character_count);
  const limit = Number(subscription.character_limit);
  if (!Number.isFinite(used) || !Number.isFinite(limit)) {
    throw new Error('ElevenLabs did not return a usable live credit balance.');
  }
  return {
    liveBalance: Math.max(0, limit - used),
    used,
    limit,
    tier: subscription.tier,
  };
}

async function requestSpeech(entry, { apiKey }) {
  const endpoint = new URL(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(entry.voiceId)}`
  );
  endpoint.searchParams.set('output_format', entry.outputFormat);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Accept: 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      text: entry.text,
      model_id: entry.modelId,
    }),
  });
  if (!response.ok) {
    throw new Error(
      `ElevenLabs ${response.status} for ${entry.conceptId}: ${(await response.text()).slice(0, 300)}`
    );
  }
  return {
    audio: Buffer.from(await response.arrayBuffer()),
    requestId: response.headers.get('request-id') || response.headers.get('x-request-id'),
    characterCost: parseCharacterCost(response.headers.get('character-cost')),
  };
}

async function main() {
  const options = parseProductionAudioArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  if (options.generate) loadPrivateEnvironment();

  const config = COURSE_CONFIGS[options.courseId];
  const vocabulary = GENERATED_CURRICULUM.courseVocabulary.filter(
    (row) => row.courseId === options.courseId
  );
  const plan = buildCourseProductionAudioPlan({
    courseId: options.courseId,
    vocabulary,
    voiceRole: config.voiceRole,
    voiceId: options.generate ? process.env[config.voiceEnvVar] : '',
    modelId: config.modelId,
    outputFormat: config.outputFormat,
  });
  const manifestPath = path.join(
    projectRoot,
    'content',
    'release-evidence',
    'audio',
    options.courseId,
    'target-manifest.json'
  );
  const approvalPath = path.join(
    projectRoot,
    'content',
    'release-approvals',
    `${options.courseId}.json`
  );

  console.log(
    `Production plan: ${plan.entries.length} clips, estimated ${plan.estimatedCredits} credits, hard cap ${options.maxCredits}.`
  );
  if (!options.generate) {
    console.log('Dry run complete: zero network requests and zero credits; no files were written.');
    return;
  }
  if (!fs.existsSync(approvalPath)) {
    throw new Error(`Release approval record is missing: ${path.relative(projectRoot, approvalPath)}.`);
  }
  const approval = readJson(approvalPath);

  const result = await runCourseProductionAudioBatch({
    plan,
    vocabulary,
    options,
    environment: process.env,
    approval,
    existingManifest: readJson(manifestPath),
    dependencies: {
      readArtifact: readReleaseEvidenceArtifact,
      inspectFile,
      getLiveBalance,
      requestSpeech,
      writeAudioAtomic(filename, audio) {
        writeFileAtomic(path.join(projectRoot, filename), audio);
      },
      writeManifestAtomic(manifest) {
        writeFileAtomic(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
      },
    },
  });
  console.log(
    `Production batch complete: ${result.generatedCount} generated, ${result.reusedCount} reused, ${result.actualCharacterCost} reported credits.`
  );
  console.log(
    `Manifest: ${path.relative(projectRoot, manifestPath)} (${result.manifest.status}; separate audio review required).`
  );
}

main().catch((error) => {
  console.error(`Course production audio failed: ${error.message}`);
  process.exitCode = 1;
});
