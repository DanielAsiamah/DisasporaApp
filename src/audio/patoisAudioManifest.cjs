const crypto = require('node:crypto');
const { VOICE_ROLES } = require('./voiceRoleContract.cjs');

const AUDITION_CONCEPT_IDS = Object.freeze([
  'good-afternoon',
  'thank-you',
  'where-are-you-from',
]);

const VOICE_CAST = Object.freeze({
  'target-patois-denzel': VOICE_ROLES['target-patois-denzel'],
  'target-patois-annakay': VOICE_ROLES['target-patois-annakay'],
});

function hashText(text) {
  return crypto.createHash('sha256').update(String(text), 'utf8').digest('hex');
}

function buildCourseAudioManifest({ courseId, vocabulary = [], defaultVoiceRole = null } = {}) {
  if (!courseId) throw new Error('courseId is required for an audio manifest.');
  const usedRoles = new Set();
  const entries = vocabulary.map((row) => {
    const voiceRole = row.voiceId || defaultVoiceRole;
    const cast = VOICE_ROLES[voiceRole];
    if (!cast || cast.roleKind !== 'target-language') {
      throw new Error(`Unknown target-language voice role for ${courseId}: ${voiceRole || '(blank)'}`);
    }
    usedRoles.add(voiceRole);
    return {
      conceptId: row.conceptId,
      text: row.localized,
      textHash: hashText(row.localized),
      filename: `${courseId}/${row.conceptId}.mp3`,
      voiceRole,
      voiceEnvVar: cast.voiceEnvVar,
      roleKind: cast.roleKind,
      locale: cast.locale,
      modelId: 'eleven_multilingual_v2',
      outputFormat: 'mp3_44100_128',
      requestId: null,
      characterCost: null,
      status: 'planned-native-review-required',
    };
  });
  return {
    schemaVersion: 1,
    courseId,
    modelId: 'eleven_multilingual_v2',
    outputFormat: 'mp3_44100_128',
    cast: Object.fromEntries([...usedRoles].map((roleId) => [roleId, VOICE_ROLES[roleId]])),
    entries,
  };
}

function buildPatoisAudioManifest(vocabulary = []) {
  return buildCourseAudioManifest({ courseId: 'jamaican-patois', vocabulary });
}

function createCourseAuditionPlan(manifest, conceptIds = AUDITION_CONCEPT_IDS) {
  const byConceptId = new Map((manifest?.entries || []).map((entry) => [entry.conceptId, entry]));
  const entries = conceptIds.map((conceptId) => byConceptId.get(conceptId)).filter(Boolean);
  return {
    courseId: manifest?.courseId || '',
    maxCredits: 250,
    estimatedCredits: entries.reduce((total, entry) => total + entry.text.length, 0),
    entries,
  };
}

function createAuditionPlan(manifest) {
  return createCourseAuditionPlan(manifest);
}

function validateSpendGate({ approved, estimatedCredits, liveBalance, maxCredits = 250 } = {}) {
  const errors = [];
  if (!approved) errors.push('Explicit spend approval is required.');
  if (!Number.isFinite(estimatedCredits) || estimatedCredits < 1) errors.push('Estimated credits must be a positive number.');
  if (Number.isFinite(estimatedCredits) && estimatedCredits > maxCredits) errors.push(`Estimated credits exceed the ${maxCredits}-credit cap.`);
  if (!Number.isFinite(liveBalance) || liveBalance < estimatedCredits) errors.push('Live account balance is insufficient for this batch.');
  return errors;
}

function validateVocabularyForGeneration(vocabulary = []) {
  const errors = [];
  const conceptIds = vocabulary.map((row) => String(row?.conceptId || '').trim()).filter(Boolean);
  const approvedRows = vocabulary.filter((row) => row?.reviewStatus === 'approved');
  if (vocabulary.length !== 39 || new Set(conceptIds).size !== 39) {
    errors.push('Paid generation requires exactly 39 unique vocabulary rows.');
  }
  if (approvedRows.length !== 39) {
    errors.push(`Paid generation requires 39 approved native-review rows; found ${approvedRows.length}.`);
  }
  return errors;
}

function shouldGenerateClip({ planned, existing, fileExists, force = false } = {}) {
  if (force || !fileExists || !planned || !existing) return true;
  return planned.textHash !== existing.textHash
    || planned.voiceRole !== existing.voiceRole
    || planned.voiceId !== existing.voiceId
    || planned.modelId !== existing.modelId
    || planned.outputFormat !== existing.outputFormat;
}

module.exports = {
  AUDITION_CONCEPT_IDS,
  VOICE_CAST,
  buildCourseAudioManifest,
  buildPatoisAudioManifest,
  createCourseAuditionPlan,
  createAuditionPlan,
  hashText,
  shouldGenerateClip,
  validateVocabularyForGeneration,
  validateSpendGate,
};
