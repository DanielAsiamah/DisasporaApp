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

function buildPatoisAudioManifest(vocabulary = []) {
  return {
    schemaVersion: 1,
    courseId: 'jamaican-patois',
    modelId: 'eleven_multilingual_v2',
    outputFormat: 'mp3_44100_128',
    cast: VOICE_CAST,
    entries: vocabulary.map((row) => {
      const cast = VOICE_CAST[row.voiceId];
      if (!cast) throw new Error(`Unknown Patois voice role: ${row.voiceId}`);
      return {
        conceptId: row.conceptId,
        text: row.localized,
        textHash: hashText(row.localized),
        filename: `jamaican-patois/${row.conceptId}.mp3`,
        voiceRole: row.voiceId,
        voiceEnvVar: cast.voiceEnvVar,
        roleKind: cast.roleKind,
        locale: cast.locale,
        modelId: 'eleven_multilingual_v2',
        outputFormat: 'mp3_44100_128',
        requestId: null,
        characterCost: null,
        status: 'planned-native-review-required',
      };
    }),
  };
}

function createAuditionPlan(manifest) {
  const byConceptId = new Map((manifest?.entries || []).map((entry) => [entry.conceptId, entry]));
  const entries = AUDITION_CONCEPT_IDS.map((conceptId) => byConceptId.get(conceptId)).filter(Boolean);
  return {
    courseId: manifest?.courseId || 'jamaican-patois',
    maxCredits: 250,
    estimatedCredits: entries.reduce((total, entry) => total + entry.text.length, 0),
    entries,
  };
}

function validateSpendGate({ approved, estimatedCredits, liveBalance, maxCredits = 250 } = {}) {
  const errors = [];
  if (!approved) errors.push('Explicit spend approval is required.');
  if (!Number.isFinite(estimatedCredits) || estimatedCredits < 1) errors.push('Estimated credits must be a positive number.');
  if (Number.isFinite(estimatedCredits) && estimatedCredits > maxCredits) errors.push(`Estimated credits exceed the ${maxCredits}-credit cap.`);
  if (!Number.isFinite(liveBalance) || liveBalance < estimatedCredits) errors.push('Live account balance is insufficient for this batch.');
  return errors;
}

function shouldGenerateClip({ planned, existing, fileExists, force = false } = {}) {
  if (force || !fileExists || !planned || !existing) return true;
  return planned.textHash !== existing.textHash
    || planned.voiceRole !== existing.voiceRole
    || planned.modelId !== existing.modelId;
}

module.exports = {
  AUDITION_CONCEPT_IDS,
  VOICE_CAST,
  buildPatoisAudioManifest,
  createAuditionPlan,
  hashText,
  shouldGenerateClip,
  validateSpendGate,
};
