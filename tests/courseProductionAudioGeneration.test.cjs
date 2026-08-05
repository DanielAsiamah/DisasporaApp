const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');
const {
  GENERATED_CURRICULUM,
} = require('../src/data/generatedCurriculum.cjs');
const {
  HARD_CREDIT_LIMIT,
  buildCourseProductionAudioPlan,
  parseCharacterCost,
  parseProductionAudioArgs,
  runCourseProductionAudioBatch,
  shouldReuseProductionClip,
  validateProductionApprovalArtifacts,
  validateGenerationPreflight,
  writeFileAtomic,
} = require('../scripts/lib/course-production-audio.cjs');
const {
  AUDITION_CONCEPT_IDS,
} = require('../src/audio/patoisAudioManifest.cjs');

const SWAHILI_ROLE = 'target-swahili-yna';
const SWAHILI_VOICE_ID = 'voice_swahili_approved_123';
const MODEL_ID = 'eleven_multilingual_v2';
const OUTPUT_FORMAT = 'mp3_44100_128';

function approvedGenerationEvidence() {
  return {
    courseId: 'swahili',
    sourceWorkbookSha256: GENERATED_CURRICULUM.meta.sourceSha256,
    nativeReview: {
      status: 'approved',
      receiptPath: `content/release-evidence/native-review/swahili/${GENERATED_CURRICULUM.meta.sourceSha256}/receipt.json`,
      receiptSha256: 'b'.repeat(64),
    },
    targetAudio: {
      roleId: SWAHILI_ROLE,
      voiceId: SWAHILI_VOICE_ID,
      modelId: MODEL_ID,
      outputFormat: OUTPUT_FORMAT,
      voiceApprovalStatus: 'approved',
      voiceApprovedBy: 'Qualified Swahili reviewer',
      voiceApprovedAt: '2026-07-27T12:00:00.000Z',
      auditionManifestPath: 'content/release-evidence/audio/swahili/audition-manifest.json',
      auditionManifestSha256: 'c'.repeat(64),
    },
  };
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function syntheticMp3(frameCount = 12) {
  const frame = Buffer.alloc(417);
  frame[0] = 0xff;
  frame[1] = 0xfb;
  frame[2] = 0x90;
  frame[3] = 0x00;
  return Buffer.concat(Array.from({ length: frameCount }, () => frame));
}

function approvedArtifactBundle(plan = buildPlan()) {
  const approval = approvedGenerationEvidence();
  const artifacts = new Map();
  const reviewWorkbookPath = approval.nativeReview.receiptPath.replace(/receipt\.json$/, 'review.xlsx');
  const reviewWorkbookBytes = Buffer.from('synthetic reviewed workbook');
  artifacts.set(reviewWorkbookPath, reviewWorkbookBytes);
  const receipt = {
    schemaVersion: 1,
    courseId: 'swahili',
    approvedRows: 39,
    appliedAt: '2026-07-27T11:00:00.000Z',
    sourceWorkbookSha256Before: 'd'.repeat(64),
    sourceWorkbookSha256After: approval.sourceWorkbookSha256,
    reviewWorkbookPath,
    reviewWorkbookSha256: sha256(reviewWorkbookBytes),
    reviewers: ['Qualified Swahili reviewer / 2026-07-27'],
  };
  const receiptBytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`);
  approval.nativeReview.receiptSha256 = sha256(receiptBytes);
  artifacts.set(approval.nativeReview.receiptPath, receiptBytes);

  const auditionEntries = AUDITION_CONCEPT_IDS.map((conceptId, index) => {
    const planned = plan.entries.find((entry) => entry.conceptId === conceptId);
    const filename = `content/release-evidence/audio/swahili/auditions/${conceptId}.mp3`;
    const audio = syntheticMp3(12 + index);
    artifacts.set(filename, audio);
    return {
      ...planned,
      filename,
      requestId: `audition-request-${conceptId}`,
      characterCost: planned.text.length,
      fileSha256: sha256(audio),
      status: 'approved-for-production',
    };
  });
  const auditionManifest = {
    schemaVersion: 1,
    courseId: 'swahili',
    roleId: plan.roleId,
    voiceId: plan.voiceId,
    modelId: plan.modelId,
    outputFormat: plan.outputFormat,
    status: 'approved-for-production',
    approvedBy: 'Qualified Swahili reviewer',
    approvedAt: '2026-07-27T12:00:00.000Z',
    entries: auditionEntries,
  };
  const auditionManifestBytes = Buffer.from(`${JSON.stringify(auditionManifest, null, 2)}\n`);
  approval.targetAudio.auditionManifestSha256 = sha256(auditionManifestBytes);
  artifacts.set(approval.targetAudio.auditionManifestPath, auditionManifestBytes);

  return {
    approval,
    artifacts,
    readArtifact(filename) {
      if (!artifacts.has(filename)) throw new Error(`Missing artifact: ${filename}`);
      return artifacts.get(filename);
    },
  };
}

function approvedSwahiliVocabulary() {
  return GENERATED_CURRICULUM.courseVocabulary
    .filter((row) => row.courseId === 'swahili')
    .map((row) => ({ ...row, reviewStatus: 'approved' }));
}

function buildPlan(vocabulary = approvedSwahiliVocabulary()) {
  return buildCourseProductionAudioPlan({
    courseId: 'swahili',
    vocabulary,
    voiceRole: SWAHILI_ROLE,
    voiceId: SWAHILI_VOICE_ID,
    modelId: MODEL_ID,
    outputFormat: OUTPUT_FORMAT,
  });
}

function generationOptions(overrides = {}) {
  return {
    courseId: 'swahili',
    generate: true,
    approveSpend: true,
    confirmNativeReview: true,
    confirmVoiceApproval: true,
    force: false,
    maxCredits: HARD_CREDIT_LIMIT,
    account: 'primary',
    ...overrides,
  };
}

function generationEnvironment(overrides = {}) {
  return {
    ELEVENLABS_KEYS_ROTATED: 'true',
    ELEVENLABS_API_KEY: 'private-development-key',
    ELEVENLABS_VOICE_ID_SWAHILI: SWAHILI_VOICE_ID,
    ...overrides,
  };
}

function existingManifestFor(plan) {
  return {
    schemaVersion: 1,
    courseId: plan.courseId,
    roleId: plan.roleId,
    voiceId: plan.voiceId,
    modelId: plan.modelId,
    outputFormat: plan.outputFormat,
    status: 'generated-awaiting-audio-review',
    entries: plan.entries.map((entry) => ({
      ...entry,
      requestId: `request-${entry.conceptId}`,
      characterCost: entry.text.length,
      fileSha256: 'a'.repeat(64),
      status: 'generated-awaiting-audio-review',
    })),
  };
}

test('production CLI defaults to a dry run and enforces the 1,000-credit hard ceiling', () => {
  assert.deepEqual(parseProductionAudioArgs(['--course', 'swahili']), {
    account: 'primary',
    approveSpend: false,
    confirmNativeReview: false,
    confirmVoiceApproval: false,
    courseId: 'swahili',
    force: false,
    generate: false,
    help: false,
    maxCredits: 1000,
  });
  assert.equal(HARD_CREDIT_LIMIT, 1000);
  assert.throws(
    () => parseProductionAudioArgs(['--course', 'swahili', '--max-credits', '1001']),
    /hard 1,000-credit limit/i
  );
});

test('missing ElevenLabs character-cost provenance never becomes a false zero-credit record', () => {
  assert.equal(parseCharacterCost(null), null);
  assert.equal(parseCharacterCost(''), null);
  assert.equal(parseCharacterCost('17'), 17);
  assert.equal(parseCharacterCost('not-a-number'), null);
});

test('the Swahili plan contains 39 canonical clips with exact voice provenance', () => {
  const plan = buildPlan();

  assert.equal(plan.entries.length, 39);
  assert.equal(new Set(plan.entries.map((entry) => entry.conceptId)).size, 39);
  assert.equal(plan.roleId, SWAHILI_ROLE);
  assert.equal(plan.voiceId, SWAHILI_VOICE_ID);
  assert.equal(plan.modelId, MODEL_ID);
  assert.equal(plan.outputFormat, OUTPUT_FORMAT);
  assert.equal(plan.entries[0].filename, 'assets/audio/swahili/yes.mp3');
  assert.match(plan.entries[0].textHash, /^[a-f0-9]{64}$/);
  assert.ok(plan.entries.every((entry) => entry.voiceRole === SWAHILI_ROLE));
  assert.ok(plan.entries.every((entry) => entry.voiceId === SWAHILI_VOICE_ID));
  assert.ok(plan.entries.every((entry) => entry.modelId === MODEL_ID));
  assert.ok(plan.entries.every((entry) => entry.outputFormat === OUTPUT_FORMAT));
});

test('paid preflight requires every human approval, rotated keys, and 39 approved rows', () => {
  const pendingVocabulary = approvedSwahiliVocabulary();
  pendingVocabulary[0] = { ...pendingVocabulary[0], reviewStatus: 'needs-native-review' };
  const errors = validateGenerationPreflight({
    options: generationOptions({
      approveSpend: false,
      confirmNativeReview: false,
      confirmVoiceApproval: false,
    }),
    vocabulary: pendingVocabulary,
    plan: buildPlan(pendingVocabulary),
    environment: generationEnvironment({
      ELEVENLABS_KEYS_ROTATED: 'false',
    }),
    approval: approvedGenerationEvidence(),
    estimatedCredits: 50,
  });

  assert.ok(errors.some((error) => /explicit spend approval/i.test(error)));
  assert.ok(errors.some((error) => /native-review confirmation/i.test(error)));
  assert.ok(errors.some((error) => /voice-approval confirmation/i.test(error)));
  assert.ok(errors.some((error) => /rotated/i.test(error)));
  assert.ok(errors.some((error) => /39 approved native-review rows; found 38/i.test(error)));
});

test('paid preflight requires tracked native-review and approved three-clip audition evidence', () => {
  const approval = approvedGenerationEvidence();
  approval.nativeReview.status = 'pending';
  approval.targetAudio.voiceApprovalStatus = 'pending';
  approval.targetAudio.auditionManifestPath = '';

  const errors = validateGenerationPreflight({
    options: generationOptions(),
    vocabulary: approvedSwahiliVocabulary(),
    plan: buildPlan(),
    environment: generationEnvironment(),
    approval,
    estimatedCredits: 50,
  });

  assert.ok(errors.some((error) => /native-review evidence/i.test(error)));
  assert.ok(errors.some((error) => /three-clip audition/i.test(error)));
  assert.ok(errors.some((error) => /voice approval/i.test(error)));
});

test('paid approval artifacts prove the native review and all three approved audition MP3s', () => {
  const plan = buildPlan();
  const bundle = approvedArtifactBundle(plan);

  assert.deepEqual(validateProductionApprovalArtifacts({
    approval: bundle.approval,
    plan,
    readArtifact: bundle.readArtifact,
  }), []);

  const auditionAudioPath = `content/release-evidence/audio/swahili/auditions/${AUDITION_CONCEPT_IDS[0]}.mp3`;
  bundle.artifacts.set(auditionAudioPath, Buffer.from('not an mp3'));
  assert.match(validateProductionApprovalArtifacts({
    approval: bundle.approval,
    plan,
    readArtifact: bundle.readArtifact,
  }).join('\n'), /audition audio|MP3|MPEG/i);
});

test('dry-run execution cannot call balance, TTS, or filesystem writers', async () => {
  const throwIfCalled = () => {
    throw new Error('a dry run crossed an external side-effect boundary');
  };
  const result = await runCourseProductionAudioBatch({
    plan: buildPlan(GENERATED_CURRICULUM.courseVocabulary.filter((row) => row.courseId === 'swahili')),
    vocabulary: GENERATED_CURRICULUM.courseVocabulary.filter((row) => row.courseId === 'swahili'),
    options: generationOptions({ generate: false }),
    environment: {},
    existingManifest: null,
    dependencies: {
      inspectFile: throwIfCalled,
      getLiveBalance: throwIfCalled,
      requestSpeech: throwIfCalled,
      writeAudioAtomic: throwIfCalled,
      writeManifestAtomic: throwIfCalled,
    },
  });

  assert.equal(result.mode, 'dry-run');
  assert.equal(result.generatedCount, 0);
  assert.equal(result.networkRequests, 0);
  assert.equal(result.plannedCount, 39);
});

test('missing generation approvals stop before the first network request', async () => {
  let networkRequests = 0;
  await assert.rejects(
    runCourseProductionAudioBatch({
      plan: buildPlan(),
      vocabulary: approvedSwahiliVocabulary(),
      options: generationOptions({ approveSpend: false }),
      environment: generationEnvironment(),
      approval: approvedGenerationEvidence(),
      existingManifest: null,
      dependencies: {
        inspectFile: () => ({ exists: false, sha256: null }),
        getLiveBalance: async () => {
          networkRequests += 1;
          return { liveBalance: 5000 };
        },
        requestSpeech: async () => {
          networkRequests += 1;
          return {};
        },
        writeAudioAtomic: () => {},
        writeManifestAtomic: () => {},
      },
    }),
    /explicit spend approval/i
  );
  assert.equal(networkRequests, 0);
});

test('missing or tampered approval artifacts stop before the first balance request', async () => {
  const plan = buildPlan();
  const bundle = approvedArtifactBundle(plan);
  bundle.artifacts.delete(bundle.approval.nativeReview.receiptPath);
  let networkRequests = 0;

  await assert.rejects(
    runCourseProductionAudioBatch({
      plan,
      vocabulary: approvedSwahiliVocabulary(),
      options: generationOptions(),
      environment: generationEnvironment(),
      approval: bundle.approval,
      existingManifest: null,
      dependencies: {
        readArtifact: bundle.readArtifact,
        inspectFile: () => ({ exists: false, sha256: null }),
        getLiveBalance: async () => {
          networkRequests += 1;
          return { liveBalance: 5000 };
        },
        requestSpeech: async () => {
          networkRequests += 1;
          return {};
        },
        writeAudioAtomic: () => {},
        writeManifestAtomic: () => {},
      },
    }),
    /native-review receipt/i
  );
  assert.equal(networkRequests, 0);
});

test('the live balance is checked before TTS and insufficient balance prevents every clip request', async () => {
  const events = [];
  const plan = buildPlan();
  const bundle = approvedArtifactBundle(plan);
  await assert.rejects(
    runCourseProductionAudioBatch({
      plan,
      vocabulary: approvedSwahiliVocabulary(),
      options: generationOptions(),
      environment: generationEnvironment(),
      approval: bundle.approval,
      existingManifest: null,
      dependencies: {
        readArtifact: bundle.readArtifact,
        inspectFile: () => ({ exists: false, sha256: null }),
        getLiveBalance: async () => {
          events.push('balance');
          return { liveBalance: 1 };
        },
        requestSpeech: async () => {
          events.push('tts');
          return {};
        },
        writeAudioAtomic: () => {},
        writeManifestAtomic: () => {},
      },
    }),
    /live account balance is insufficient/i
  );
  assert.deepEqual(events, ['balance']);
});

test('unchanged clips are reused and one stale clip is atomically replaced with review-pending provenance', async () => {
  const plan = buildPlan();
  const bundle = approvedArtifactBundle(plan);
  const existingManifest = existingManifestFor(plan);
  existingManifest.entries[0] = {
    ...existingManifest.entries[0],
    textHash: '0'.repeat(64),
  };
  const writtenAudio = [];
  let writtenManifest = null;
  const events = [];
  const newAudio = syntheticMp3();
  const expectedSha = crypto.createHash('sha256').update(newAudio).digest('hex');

  const result = await runCourseProductionAudioBatch({
    plan,
    vocabulary: approvedSwahiliVocabulary(),
    options: generationOptions(),
    environment: generationEnvironment(),
    approval: bundle.approval,
    existingManifest,
    dependencies: {
      readArtifact: bundle.readArtifact,
      inspectFile: () => ({ exists: true, sha256: 'a'.repeat(64) }),
      getLiveBalance: async () => {
        events.push('balance');
        return { liveBalance: 5000 };
      },
      requestSpeech: async (entry) => {
        events.push(`tts:${entry.conceptId}`);
        return {
          audio: newAudio,
          requestId: 'request-new-yes',
          characterCost: entry.text.length,
        };
      },
      writeAudioAtomic: (filename, audio) => {
        writtenAudio.push({ filename, audio });
      },
      writeManifestAtomic: (manifest) => {
        writtenManifest = manifest;
      },
      now: () => '2026-07-27T12:00:00.000Z',
    },
  });

  assert.equal(result.generatedCount, 1);
  assert.equal(result.reusedCount, 38);
  assert.deepEqual(events, ['balance', 'tts:yes']);
  assert.deepEqual(writtenAudio, [{
    filename: 'assets/audio/swahili/yes.mp3',
    audio: newAudio,
  }]);
  assert.equal(writtenManifest.status, 'generated-awaiting-audio-review');
  assert.equal(writtenManifest.entries.length, 39);
  assert.equal(writtenManifest.entries[0].requestId, 'request-new-yes');
  assert.equal(writtenManifest.entries[0].fileSha256, expectedSha);
  assert.equal(writtenManifest.entries[0].status, 'generated-awaiting-audio-review');
  assert.notEqual(writtenManifest.entries[0].status, 'approved-for-learning');
});

test('invalid ElevenLabs audio is rejected before any production file or manifest write', async () => {
  let writes = 0;
  const plan = buildPlan();
  const bundle = approvedArtifactBundle(plan);
  await assert.rejects(runCourseProductionAudioBatch({
    plan,
    vocabulary: approvedSwahiliVocabulary(),
    options: generationOptions(),
    environment: generationEnvironment(),
    approval: bundle.approval,
    existingManifest: null,
    dependencies: {
      readArtifact: bundle.readArtifact,
      inspectFile: () => ({ exists: false, sha256: null }),
      getLiveBalance: async () => ({ liveBalance: 5000 }),
      requestSpeech: async (entry) => ({
        audio: Buffer.from(`invalid-${entry.conceptId}`),
        requestId: `request-${entry.conceptId}`,
        characterCost: entry.text.length,
      }),
      writeAudioAtomic: () => { writes += 1; },
      writeManifestAtomic: () => { writes += 1; },
    },
  }), /MP3|MPEG|audio integrity/i);
  assert.equal(writes, 0);
});

test('reuse requires the same text, role, voice, model, output, file path, and physical file hash', () => {
  const planned = buildPlan().entries[0];
  const existing = {
    ...planned,
    requestId: 'request-yes',
    characterCost: planned.text.length,
    fileSha256: 'b'.repeat(64),
    status: 'generated-awaiting-audio-review',
  };

  assert.equal(shouldReuseProductionClip({
    planned,
    existing,
    fileInfo: { exists: true, sha256: 'b'.repeat(64) },
  }), true);
  assert.equal(shouldReuseProductionClip({
    planned,
    existing: { ...existing, voiceId: 'wrong-voice' },
    fileInfo: { exists: true, sha256: 'b'.repeat(64) },
  }), false);
  assert.equal(shouldReuseProductionClip({
    planned,
    existing,
    fileInfo: { exists: true, sha256: 'c'.repeat(64) },
  }), false);
  assert.equal(shouldReuseProductionClip({
    planned,
    existing,
    fileInfo: { exists: true, sha256: 'b'.repeat(64) },
    force: true,
  }), false);
});

test('atomic file writes leave only the complete final MP3', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'diaspora-audio-atomic-'));
  const outputPath = path.join(root, 'assets', 'audio', 'swahili', 'yes.mp3');
  try {
    writeFileAtomic(outputPath, Buffer.from('complete-mp3'));
    assert.equal(fs.readFileSync(outputPath, 'utf8'), 'complete-mp3');
    assert.deepEqual(
      fs.readdirSync(path.dirname(outputPath)).sort(),
      ['yes.mp3']
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('package commands keep approval flags out of both default and generation shortcuts', () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
  const dryRun = packageJson.scripts['audio:swahili-production:dry-run'];
  const generate = packageJson.scripts['audio:swahili-production:generate'];

  assert.match(dryRun, /generate-course-production-audio\.js --course swahili$/);
  assert.doesNotMatch(dryRun, /--generate|--approve-spend|--confirm-/);
  assert.match(generate, /--generate/);
  assert.doesNotMatch(generate, /--approve-spend|--confirm-native-review|--confirm-voice-approval/);
  assert.match(
    packageJson.scripts['test:rebuild-contracts'],
    /tests\/courseProductionAudioGeneration\.test\.cjs/
  );
});

test('the real default script remains offline even when a private API key is present', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'diaspora-audio-network-trap-'));
  const hookPath = path.join(root, 'deny-network.cjs');
  const markerPath = path.join(root, 'network-called.txt');
  fs.writeFileSync(
    hookPath,
    `const fs = require('node:fs');\n`
      + `global.fetch = async () => { fs.writeFileSync(${JSON.stringify(markerPath)}, 'called'); throw new Error('network forbidden'); };\n`,
    'utf8'
  );
  try {
    const result = spawnSync(
      process.execPath,
      ['scripts/generate-course-production-audio.js', '--course', 'swahili'],
      {
        cwd: projectRoot,
        encoding: 'utf8',
        env: {
          ...process.env,
          ELEVENLABS_API_KEY: 'must-not-be-used',
          NODE_OPTIONS: `--require=${hookPath}`,
        },
      }
    );
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /zero network requests and zero credits/i);
    assert.equal(fs.existsSync(markerPath), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
