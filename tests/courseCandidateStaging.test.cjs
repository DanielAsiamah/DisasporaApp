const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  buildCourseCandidateStagingPlan,
  serializeCourseProductionAudioRegistry,
  validateTargetAudioFiles,
} = require('../scripts/lib/course-candidate-staging.cjs');
const { hashText } = require('../src/audio/patoisAudioManifest.cjs');

const root = path.resolve(__dirname, '..');

function fixture() {
  const courseId = 'swahili';
  const targetVoiceId = 'voice-swahili-approved';
  const targetModelId = 'eleven-multilingual-v2';
  const targetOutputFormat = 'mp3_44100_128';
  const conceptIds = Array.from({ length: 39 }, (_, index) => `concept-${String(index + 1).padStart(2, '0')}`);
  const data = {
    courses: [{
      course_id: courseId,
      base_language: 'English',
      display_name: 'Swahili',
      writing_system: 'Latin',
      onboarding: true,
      availability: 'backlog',
    }],
    course_vocabulary: conceptIds.map((conceptId) => ({
      course_id: courseId,
      concept_id: conceptId,
      localized_form: `word-${conceptId}`,
      pronunciation: `pronunciation-${conceptId}`,
      script_aid: '',
      image_path: `assets/images/vocab/${courseId}/${conceptId}.png`,
      audio_path: '',
      voice_cast: '',
      review_status: 'approved',
      publication_state: 'unavailable',
    })),
    chapters: [{
      course_id: courseId,
      chapter_id: `${courseId}-greetings`,
      title: 'Greetings & basic conversations',
      hero_asset: `assets/images/chapters/${courseId}-greetings.png`,
      topic_count: 9,
      word_count: 39,
      publication_state: 'unavailable',
    }],
    topics: Array.from({ length: 9 }, (_, index) => ({
      course_id: courseId,
      topic_id: `topic-${index + 1}`,
      topic_order: index + 1,
    })),
    lesson_steps: Array.from({ length: 64 }, (_, index) => ({
      course_id: courseId,
      topic_id: `topic-${(index % 9) + 1}`,
      step_id: `${courseId}-step-${index + 1}`,
      concept_id: conceptIds[index % conceptIds.length],
      voice_cast: '',
      publication_state: 'unavailable',
    })),
  };
  const targetManifest = {
    schemaVersion: 1,
    courseId,
    roleId: 'target-swahili-yna',
    voiceId: targetVoiceId,
    modelId: targetModelId,
    outputFormat: targetOutputFormat,
    entries: conceptIds.map((conceptId) => {
      const localized = `word-${conceptId}`;
      return {
      conceptId,
      text: localized,
      textHash: hashText(localized),
      filename: `assets/audio/${courseId}/${conceptId}.mp3`,
      fileSha256: crypto.createHash('sha256').update(`audio-${conceptId}`).digest('hex'),
      voiceId: targetVoiceId,
      voiceRole: 'target-swahili-yna',
      modelId: targetModelId,
      outputFormat: targetOutputFormat,
      requestId: `request-${conceptId}`,
      characterCost: localized.length,
      status: 'approved-for-learning',
      };
    }),
  };
  return {
    courseId,
    conceptIds,
    data,
    targetManifest,
    targetVoiceId,
    targetModelId,
    targetOutputFormat,
  };
}

test('staging produces one internally consistent published-but-unverified candidate', () => {
  const input = fixture();
  const plan = buildCourseCandidateStagingPlan({
    ...input,
    targetRoleId: 'target-swahili-yna',
    hasVerifiedRelease: false,
  });

  assert.equal(plan.ready, true, plan.errors.join('\n'));
  assert.equal(plan.data.courses[0].availability, 'published');
  assert.equal(plan.data.course_vocabulary.length, 39);
  assert.ok(plan.data.course_vocabulary.every((row) => (
    row.review_status === 'approved'
    && row.publication_state === 'published'
    && row.voice_cast === 'target-swahili-yna'
    && row.audio_path === `assets/audio/swahili/${row.concept_id}.mp3`
  )));
  assert.ok(plan.data.chapters.every((row) => row.publication_state === 'published'));
  assert.ok(plan.data.lesson_steps.every((row) => (
    row.publication_state === 'published' && row.voice_cast === 'target-swahili-yna'
  )));
  assert.equal(plan.summary.vocabulary, 39);
  assert.equal(plan.summary.topics, 9);
  assert.equal(plan.summary.lessonSteps, 64);
});

test('staging fails closed for unreviewed wording, incomplete audio, or an existing verified release', () => {
  const unreviewed = fixture();
  unreviewed.data.course_vocabulary[0].review_status = 'needs-native-review';
  const unreviewedPlan = buildCourseCandidateStagingPlan({
    ...unreviewed,
    targetRoleId: 'target-swahili-yna',
    hasVerifiedRelease: false,
  });
  assert.equal(unreviewedPlan.ready, false);
  assert.match(unreviewedPlan.errors.join('\n'), /39 approved vocabulary rows/i);

  const incomplete = fixture();
  incomplete.targetManifest.entries.pop();
  const incompletePlan = buildCourseCandidateStagingPlan({
    ...incomplete,
    targetRoleId: 'target-swahili-yna',
    hasVerifiedRelease: false,
  });
  assert.equal(incompletePlan.ready, false);
  assert.match(incompletePlan.errors.join('\n'), /39 target audio entries/i);

  const released = fixture();
  const releasedPlan = buildCourseCandidateStagingPlan({
    ...released,
    targetRoleId: 'target-swahili-yna',
    hasVerifiedRelease: true,
  });
  assert.equal(releasedPlan.ready, false);
  assert.match(releasedPlan.errors.join('\n'), /already has a verified release/i);
});

test('staging rejects stale text and incomplete or unapproved audio provenance', () => {
  const input = fixture();
  input.targetManifest.entries[0].text = 'stale wording';
  input.targetManifest.entries[1].voiceId = 'different-voice';
  input.targetManifest.entries[2].modelId = 'different-model';
  input.targetManifest.entries[3].outputFormat = 'different-format';
  delete input.targetManifest.entries[4].requestId;
  delete input.targetManifest.entries[5].fileSha256;
  input.targetManifest.entries[6].characterCost = -1;

  const plan = buildCourseCandidateStagingPlan({
    ...input,
    targetRoleId: 'target-swahili-yna',
    hasVerifiedRelease: false,
  });
  const errors = plan.errors.join('\n');

  assert.equal(plan.ready, false);
  assert.match(errors, /stale.*approved wording/i);
  assert.match(errors, /exact approved voice ID/i);
  assert.match(errors, /approved model ID/i);
  assert.match(errors, /approved output format/i);
  assert.match(errors, /request ID/i);
  assert.match(errors, /file SHA-256/i);
  assert.match(errors, /character cost/i);
});

test('static production-audio registry serialization is deterministic and course-scoped', () => {
  const { courseId, targetManifest } = fixture();
  const source = serializeCourseProductionAudioRegistry({
    courseId,
    exportName: 'SWAHILI_PRODUCTION_AUDIO_REGISTRY',
    entries: targetManifest.entries,
  });

  assert.equal((source.match(/require\(/g) || []).length, 39);
  assert.match(source, /assets\/audio\/swahili\/concept-01\.mp3/);
  assert.match(source, /SWAHILI_PRODUCTION_AUDIO_REGISTRY/);
  assert.doesNotMatch(source, /jamaican-patois/);
  assert.equal(source, serializeCourseProductionAudioRegistry({
    courseId,
    exportName: 'SWAHILI_PRODUCTION_AUDIO_REGISTRY',
    entries: [...targetManifest.entries].reverse(),
  }));
});

test('target audio file validation rejects missing and hash-mismatched bytes', () => {
  const bytes = Buffer.from('approved audio bytes');
  const digest = require('node:crypto').createHash('sha256').update(bytes).digest('hex');
  const entries = [{
    conceptId: 'yes',
    filename: 'assets/audio/swahili/yes.mp3',
    fileSha256: digest,
  }];
  const audioRoot = path.join(root, 'assets', 'audio', 'swahili');

  assert.deepEqual(validateTargetAudioFiles(entries, {
    projectRoot: root,
    existsSync: () => true,
    readFileSync: (filePath) => {
      assert.equal(filePath, path.join(audioRoot, 'yes.mp3'));
      return bytes;
    },
    validateAudio: () => [],
  }), []);

  assert.match(validateTargetAudioFiles(entries, {
    projectRoot: root,
    existsSync: () => false,
    readFileSync: () => {
      throw new Error('must not read a missing file');
    },
  }).join('\n'), /missing/i);

  assert.match(validateTargetAudioFiles(entries, {
    projectRoot: root,
    existsSync: () => true,
    readFileSync: () => Buffer.from('different bytes'),
  }).join('\n'), /SHA-256/i);
});

test('candidate staging command is check-only unless both explicit mutation flags are supplied', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const source = fs.readFileSync(path.join(root, 'scripts', 'stage-course-candidate.js'), 'utf8');

  assert.equal(
    pkg.scripts['release:swahili:stage-check'],
    'node scripts/stage-course-candidate.js --course swahili --target-manifest content/release-evidence/audio/swahili/target-manifest.json --approval content/release-approvals/swahili.json'
  );
  assert.doesNotMatch(pkg.scripts['release:swahili:stage-check'], /--apply|--confirm-release-candidate/);
  assert.match(source, /--apply/);
  assert.match(source, /--confirm-release-candidate/);
  assert.match(source, /validateContent/);
  assert.match(source, /buildCourseCandidateStagingPlan/);
  assert.match(source, /targetAudio\.voiceId/);
  assert.match(source, /targetAudio\.manifestSha256/);
});
