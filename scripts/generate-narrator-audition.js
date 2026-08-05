const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const { VOICE_ROLES } = require('../src/audio/voiceRoleContract.cjs');
const { auditMp3Buffer } = require('./lib/audit-mp3.cjs');
const {
  buildNarratorAuditionPlan,
  parseNarratorAuditionArgs,
  runNarratorAuditionBatch,
  writeFileAtomic,
} = require('./lib/narrator-audition-generation.cjs');

const projectRoot = path.resolve(__dirname, '..');

function loadPrivateEnvironment() {
  for (const filename of ['.env.local', '.env']) {
    const envPath = path.join(projectRoot, filename);
    if (!fs.existsSync(envPath)) continue;
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!match || process.env[match[1]] !== undefined) continue;
      process.env[match[1]] = match[2]
        .trim()
        .replace(/^(?:"(.*)"|'(.*)')$/, '$1$2');
    }
  }
}

function printHelp() {
  console.log(`Plan or generate one three-clip interface-narrator audition.

Default behavior is an offline, zero-credit dry run with no file writes.

Dry run:
  node scripts/generate-narrator-audition.js --role narrator-en
  node scripts/generate-narrator-audition.js --role narrator-fr
  node scripts/generate-narrator-audition.js --role narrator-ar

Paid generation (only after explicit approval):
  node scripts/generate-narrator-audition.js --role narrator-en --generate --approve-spend [--account primary|secondary] [--max-credits 250] [--force]

Generated clips and their manifest always remain generated-awaiting-voice-review.`);
}

function readJson(filename) {
  if (!fs.existsSync(filename)) return null;
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function inspectFile(filename) {
  const absolutePath = path.resolve(projectRoot, filename);
  if (!fs.existsSync(absolutePath)) {
    return { exists: false, integrityFailures: [], sha256: null };
  }
  const audio = fs.readFileSync(absolutePath);
  const audit = auditMp3Buffer(audio, {
    label: path.relative(projectRoot, absolutePath),
  });
  return {
    exists: true,
    integrityFailures: [...audit.failures],
    sha256: crypto.createHash('sha256').update(audio).digest('hex'),
  };
}

async function requestJson(url, apiKey) {
  const response = await fetch(url, {
    headers: { 'xi-api-key': apiKey },
  });
  if (!response.ok) {
    throw new Error(
      `ElevenLabs ${response.status}: ${(await response.text()).slice(0, 300)}`
    );
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

function parseCharacterCost(value) {
  if (value === null || value === undefined || String(value).trim() === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
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
      `ElevenLabs ${response.status} for ${entry.id}: ${(await response.text()).slice(0, 300)}`
    );
  }
  return {
    audio: Buffer.from(await response.arrayBuffer()),
    characterCost: parseCharacterCost(response.headers.get('character-cost')),
    requestId: response.headers.get('request-id')
      || response.headers.get('x-request-id'),
  };
}

async function main() {
  const options = parseNarratorAuditionArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  if (options.generate) loadPrivateEnvironment();
  const role = VOICE_ROLES[options.roleId];
  const plan = buildNarratorAuditionPlan({
    roleId: options.roleId,
    voiceId: options.generate ? process.env[role.voiceEnvVar] : '',
  });
  console.log(
    `Narrator plan: ${plan.roleId}, ${plan.entries.length} clips, `
    + `estimated ${plan.estimatedCredits} credits, hard cap ${options.maxCredits}.`
  );

  if (!options.generate) {
    const result = await runNarratorAuditionBatch({ options, plan });
    console.log(
      `Dry run complete: ${result.plannedCount} planned clips; `
      + 'zero environment access, zero network requests, zero credits, and zero file writes.'
    );
    return;
  }

  const manifestPath = path.join(
    projectRoot,
    'content',
    'release-evidence',
    'audio',
    options.roleId,
    'audition-manifest.json'
  );
  const result = await runNarratorAuditionBatch({
    environment: process.env,
    existingManifest: readJson(manifestPath),
    options,
    plan,
    dependencies: {
      inspectFile,
      getLiveBalance,
      requestSpeech,
      writeAudioAtomic(filename, audio) {
        writeFileAtomic(path.join(projectRoot, filename), audio);
      },
      writeManifestAtomic(manifest) {
        writeFileAtomic(
          manifestPath,
          `${JSON.stringify(manifest, null, 2)}\n`
        );
      },
    },
  });
  console.log(
    `Narrator audition complete: ${result.generatedCount} generated, `
    + `${result.reusedCount} reused, ${result.actualCharacterCost} reported credits.`
  );
  console.log(
    `Manifest: ${path.relative(projectRoot, manifestPath)} `
    + '(generated-awaiting-voice-review; never auto-approved).'
  );
}

main().catch((error) => {
  console.error(`Narrator audition failed: ${error.message}`);
  process.exitCode = 1;
});
