const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { VOICE_ROLES } = require('../src/audio/voiceRoleContract.cjs');
const { buildNarratorAuditionManifest } = require('../src/audio/narratorAudioManifest.cjs');
const {
  HARD_CREDIT_LIMIT,
  buildNarratorAuditionPlan,
  parseNarratorAuditionArgs,
  runNarratorAuditionBatch,
  shouldReuseNarratorClip,
  validateNarratorGenerationPreflight,
  writeFileAtomic,
} = require('../scripts/lib/narrator-audition-generation.cjs');

const projectRoot = path.resolve(__dirname, '..');
const ROLE_IDS = ['narrator-en', 'narrator-fr', 'narrator-ar'];

function validMp3Buffer(seed = 0) {
  const frameLength = 417;
  const frameCount = 5;
  const buffer = Buffer.alloc(frameLength * frameCount, seed);
  for (let frame = 0; frame < frameCount; frame += 1) {
    const offset = frame * frameLength;
    buffer[offset] = 0xff;
    buffer[offset + 1] = 0xfb;
    buffer[offset + 2] = 0x90;
    buffer[offset + 3] = 0x00;
  }
  return buffer;
}

function generationFixture(roleId = 'narrator-en') {
  const role = VOICE_ROLES[roleId];
  const voiceId = `private-${roleId}-voice`;
  const plan = buildNarratorAuditionPlan({ roleId, voiceId });
  const options = {
    account: 'primary',
    approveSpend: true,
    force: false,
    generate: true,
    maxCredits: HARD_CREDIT_LIMIT,
    roleId,
  };
  const environment = {
    ELEVENLABS_API_KEY: 'private-test-key',
    ELEVENLABS_KEYS_ROTATED: 'true',
    [role.voiceEnvVar]: voiceId,
  };
  return { environment, options, plan, role, voiceId };
}

test('each narrator role produces an exact three-clip audition plan from the approved manifest contract', () => {
  for (const roleId of ROLE_IDS) {
    const source = buildNarratorAuditionManifest(roleId);
    const voiceId = `voice-${roleId}`;
    const plan = buildNarratorAuditionPlan({ roleId, voiceId });

    assert.equal(plan.roleId, roleId);
    assert.equal(plan.voiceId, voiceId);
    assert.equal(plan.entries.length, 3);
    assert.ok(plan.estimatedCredits > 0 && plan.estimatedCredits <= 250);
    assert.deepEqual(
      plan.entries.map(({ id, text, textHash, voiceRole, voiceId: entryVoiceId, modelId, outputFormat }) => ({
        id,
        text,
        textHash,
        voiceRole,
        voiceId: entryVoiceId,
        modelId,
        outputFormat,
      })),
      source.entries.map(({ id, text, textHash, voiceRole, modelId, outputFormat }) => ({
        id,
        text,
        textHash,
        voiceRole,
        voiceId,
        modelId,
        outputFormat,
      }))
    );
    for (const entry of plan.entries) {
      assert.equal(
        entry.filename,
        `content/release-evidence/audio/${roleId}/${entry.id}.mp3`
      );
    }
  }
});

test('argument parsing defaults to an offline dry run and enforces the 250-credit ceiling', () => {
  assert.deepEqual(parseNarratorAuditionArgs(['--role', 'narrator-fr']), {
    account: 'primary',
    approveSpend: false,
    force: false,
    generate: false,
    help: false,
    maxCredits: 250,
    roleId: 'narrator-fr',
  });
  assert.throws(
    () => parseNarratorAuditionArgs(['--role', 'narrator-en', '--max-credits', '251']),
    /hard 250-credit limit/i
  );
  assert.throws(
    () => parseNarratorAuditionArgs(['--role', 'target-swahili-yna']),
    /narrator-en, narrator-fr, narrator-ar/
  );
});

test('paid narrator validation rejects duplicate prompts and inconsistent top-level provenance', () => {
  const { environment, options, plan } = generationFixture('narrator-en');
  const duplicatePlan = {
    ...plan,
    modelId: 'wrong-top-level-model',
    entries: [plan.entries[0], plan.entries[0], plan.entries[2]],
  };
  const errors = validateNarratorGenerationPreflight({
    environment,
    estimatedCredits: duplicatePlan.estimatedCredits,
    options,
    plan: duplicatePlan,
  });

  assert.match(errors.join('\n'), /exact three canonical|duplicate|missing/i);
  assert.match(errors.join('\n'), /top-level model/i);
});

test('a dry run performs no environment, network, audio, or manifest operation', async () => {
  const plan = buildNarratorAuditionPlan({ roleId: 'narrator-ar' });
  const calls = [];
  const result = await runNarratorAuditionBatch({
    plan,
    options: {
      account: 'primary',
      approveSpend: false,
      force: false,
      generate: false,
      maxCredits: 250,
      roleId: 'narrator-ar',
    },
    dependencies: new Proxy({}, {
      get(_target, property) {
        return () => calls.push(String(property));
      },
    }),
  });

  assert.deepEqual(result, {
    mode: 'dry-run',
    plannedCount: 3,
    generatedCount: 0,
    reusedCount: 0,
    estimatedCredits: plan.estimatedCredits,
    networkRequests: 0,
  });
  assert.deepEqual(calls, []);
});

test('paid generation fails closed before network when approval, rotated keys, or the exact private role voice is missing', async () => {
  const { environment, options, plan, role } = generationFixture('narrator-fr');
  const invalidEnvironment = {
    ...environment,
    ELEVENLABS_KEYS_ROTATED: 'false',
    [role.voiceEnvVar]: 'different-voice',
  };
  const errors = validateNarratorGenerationPreflight({
    environment: invalidEnvironment,
    estimatedCredits: plan.estimatedCredits,
    options: { ...options, approveSpend: false },
    plan,
  });
  assert.match(errors.join(' '), /--approve-spend/);
  assert.match(errors.join(' '), /rotated/i);
  assert.match(errors.join(' '), new RegExp(role.voiceEnvVar));

  const calls = [];
  await assert.rejects(
    runNarratorAuditionBatch({
      environment: invalidEnvironment,
      options: { ...options, approveSpend: false },
      plan,
      dependencies: {
        inspectFile() {
          return { exists: false, sha256: null, integrityFailures: [] };
        },
        async getLiveBalance() {
          calls.push('balance');
          return { liveBalance: 999 };
        },
        async requestSpeech() {
          calls.push('speech');
          return {};
        },
      },
    }),
    /approve-spend[\s\S]*rotated/i
  );
  assert.deepEqual(calls, []);
});

test('paid narrator generation rejects previously shared keys even when the rotation flag says true', () => {
  const { options, plan, role, voiceId } = generationFixture('narrator-en');
  const errors = validateNarratorGenerationPreflight({
    environment: {
      ELEVENLABS_API_KEY: '6e855395d81d737092a8e513e99080672afcbb199426b3e9f1180cd5983ab6d9',
      ELEVENLABS_KEYS_ROTATED: 'true',
      [role.voiceEnvVar]: voiceId,
    },
    estimatedCredits: plan.estimatedCredits,
    options,
    plan,
  });

  assert.match(errors.join(' '), /previously exposed|rotate/i);
});

test('generation checks live balance before TTS and writes exact provenance with structural MP3 validation', async () => {
  const { environment, options, plan } = generationFixture('narrator-en');
  const order = [];
  const audioWrites = [];
  let writtenManifest = null;
  const result = await runNarratorAuditionBatch({
    environment,
    options,
    plan,
    dependencies: {
      inspectFile() {
        return { exists: false, sha256: null, integrityFailures: [] };
      },
      async getLiveBalance() {
        order.push('balance');
        return { liveBalance: 1000 };
      },
      async requestSpeech(entry) {
        order.push(`speech:${entry.id}`);
        return {
          audio: validMp3Buffer(entry.id.length),
          characterCost: entry.text.length,
          requestId: `request-${entry.id}`,
        };
      },
      writeAudioAtomic(filename, audio) {
        order.push(`write:${path.basename(filename)}`);
        audioWrites.push({ audio, filename });
      },
      writeManifestAtomic(manifest) {
        order.push('manifest');
        writtenManifest = manifest;
      },
      now() {
        return '2026-07-27T12:00:00.000Z';
      },
    },
  });

  assert.equal(order[0], 'balance');
  assert.equal(result.generatedCount, 3);
  assert.equal(result.reusedCount, 0);
  assert.equal(audioWrites.length, 3);
  assert.equal(writtenManifest.status, 'generated-awaiting-voice-review');
  assert.equal(writtenManifest.entries.length, 3);
  for (const [index, entry] of writtenManifest.entries.entries()) {
    const planned = plan.entries[index];
    assert.deepEqual(
      {
        id: entry.id,
        text: entry.text,
        textHash: entry.textHash,
        voiceRole: entry.voiceRole,
        voiceId: entry.voiceId,
        modelId: entry.modelId,
        outputFormat: entry.outputFormat,
      },
      {
        id: planned.id,
        text: planned.text,
        textHash: planned.textHash,
        voiceRole: planned.voiceRole,
        voiceId: planned.voiceId,
        modelId: planned.modelId,
        outputFormat: planned.outputFormat,
      }
    );
    assert.equal(entry.status, 'generated-awaiting-voice-review');
    assert.match(entry.requestId, /^request-/);
    assert.equal(entry.characterCost, entry.text.length);
    assert.match(entry.fileSha256, /^[a-f0-9]{64}$/);
  }
});

test('invalid MP3 bytes are rejected before an audio or manifest write', async () => {
  const { environment, options, plan } = generationFixture('narrator-ar');
  let writeCount = 0;
  await assert.rejects(
    runNarratorAuditionBatch({
      environment,
      options,
      plan,
      dependencies: {
        inspectFile() {
          return { exists: false, sha256: null, integrityFailures: [] };
        },
        async getLiveBalance() {
          return { liveBalance: 1000 };
        },
        async requestSpeech() {
          return {
            audio: Buffer.from('not an mp3'),
            characterCost: 10,
            requestId: 'request-invalid',
          };
        },
        writeAudioAtomic() {
          writeCount += 1;
        },
        writeManifestAtomic() {
          writeCount += 1;
        },
      },
    }),
    /audio integrity validation failed/i
  );
  assert.equal(writeCount, 0);
});

test('unchanged exact clips are reused unless force is requested', async () => {
  const { environment, options, plan } = generationFixture('narrator-fr');
  const existingEntries = plan.entries.map((entry, index) => ({
    ...entry,
    characterCost: entry.text.length,
    fileSha256: `${index + 1}`.repeat(64),
    requestId: `existing-${entry.id}`,
    status: 'generated-awaiting-voice-review',
  }));
  for (const [index, entry] of plan.entries.entries()) {
    assert.equal(shouldReuseNarratorClip({
      existing: existingEntries[index],
      fileInfo: {
        exists: true,
        integrityFailures: [],
        sha256: existingEntries[index].fileSha256,
      },
      planned: entry,
    }), true);
    assert.equal(shouldReuseNarratorClip({
      existing: existingEntries[index],
      fileInfo: {
        exists: true,
        integrityFailures: [],
        sha256: existingEntries[index].fileSha256,
      },
      force: true,
      planned: entry,
    }), false);
  }

  const calls = [];
  const result = await runNarratorAuditionBatch({
    environment,
    existingManifest: { entries: existingEntries },
    options,
    plan,
    dependencies: {
      inspectFile(filename) {
        const existing = existingEntries.find((entry) => entry.filename === filename);
        return {
          exists: true,
          integrityFailures: [],
          sha256: existing.fileSha256,
        };
      },
      async getLiveBalance() {
        calls.push('balance');
        return { liveBalance: 1000 };
      },
      async requestSpeech() {
        calls.push('speech');
        return {};
      },
      writeAudioAtomic() {
        calls.push('audio');
      },
      writeManifestAtomic() {
        calls.push('manifest');
      },
    },
  });
  assert.equal(result.generatedCount, 0);
  assert.equal(result.reusedCount, 3);
  assert.deepEqual(calls, ['manifest']);
});

test('atomic writes leave a complete destination and no temporary sibling', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'diaspora-narrator-'));
  try {
    const destination = path.join(directory, 'clip.mp3');
    const audio = validMp3Buffer(7);
    writeFileAtomic(destination, audio);
    assert.deepEqual(fs.readFileSync(destination), audio);
    assert.deepEqual(fs.readdirSync(directory), ['clip.mp3']);
  } finally {
    fs.rmSync(directory, { force: true, recursive: true });
  }
});

test('package shortcuts remain dry by default and cannot approve their own spend', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
  for (const roleId of ROLE_IDS) {
    const suffix = roleId.replace('narrator-', '');
    assert.equal(
      pkg.scripts[`audio:narrator-${suffix}-audition:dry-run`],
      `node scripts/generate-narrator-audition.js --role ${roleId}`
    );
    assert.match(
      pkg.scripts[`audio:narrator-${suffix}-audition:generate`],
      new RegExp(`--role ${roleId}.*--generate`)
    );
    assert.doesNotMatch(
      pkg.scripts[`audio:narrator-${suffix}-audition:generate`],
      /--approve-spend/
    );
  }
  assert.match(
    pkg.scripts['test:rebuild-contracts'],
    /narratorAuditionGeneration\.test\.cjs/
  );
});
