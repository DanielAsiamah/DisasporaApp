const crypto = require('node:crypto');

const { VOICE_ROLES } = require('./voiceRoleContract.cjs');

function freezeScripts(entries) {
  return Object.freeze(entries.map((entry) => Object.freeze(entry)));
}

const NARRATOR_SAMPLE_SCRIPTS = Object.freeze({
  'narrator-en': freezeScripts([
    { id: 'listen-and-choose', text: 'Listen and choose the correct meaning.' },
    { id: 'build-the-phrase', text: 'Build the phrase.' },
    { id: 'match-the-phrases', text: 'Match each phrase to its meaning.' },
  ]),
  'narrator-fr': freezeScripts([
    { id: 'listen-and-choose', text: 'Écoute et choisis la bonne réponse.' },
    { id: 'build-the-phrase', text: 'Construis la phrase.' },
    { id: 'match-the-phrases', text: 'Associe chaque phrase à sa signification.' },
  ]),
  'narrator-ar': freezeScripts([
    { id: 'listen-and-choose', text: 'استمع واختر المعنى الصحيح.' },
    { id: 'build-the-phrase', text: 'كوّن العبارة.' },
    { id: 'match-the-phrases', text: 'طابق كل عبارة مع معناها.' },
  ]),
});

function hashText(value) {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
}

function buildNarratorAuditionManifest(roleId) {
  const role = VOICE_ROLES[roleId];
  const scripts = NARRATOR_SAMPLE_SCRIPTS[roleId];
  if (!role || role.roleKind !== 'interface-narrator' || !scripts) {
    throw new Error(`${roleId || '(blank)'} is not a configured interface narrator.`);
  }
  const entries = scripts.map(({ id, text }) => Object.freeze({
    id,
    text,
    textHash: hashText(text),
    filename: `narrators/${role.locale}/${id}.mp3`,
    voiceRole: roleId,
    voiceEnvVar: role.voiceEnvVar,
    roleKind: role.roleKind,
    locale: role.locale,
    modelId: 'eleven_multilingual_v2',
    outputFormat: 'mp3_44100_128',
    requestId: null,
    characterCost: null,
    status: 'planned-native-review-required',
  }));
  return Object.freeze({
    schemaVersion: 1,
    roleId,
    roleKind: role.roleKind,
    locale: role.locale,
    voiceEnvVar: role.voiceEnvVar,
    displayName: role.displayName,
    status: role.status,
    modelId: 'eleven_multilingual_v2',
    outputFormat: 'mp3_44100_128',
    maxCredits: 250,
    estimatedCredits: entries.reduce((total, entry) => total + entry.text.length, 0),
    entries: Object.freeze(entries),
  });
}

function buildAllNarratorAuditionManifests() {
  return Object.freeze(Object.fromEntries(
    ['narrator-en', 'narrator-fr', 'narrator-ar'].map((roleId) => [roleId, buildNarratorAuditionManifest(roleId)])
  ));
}

module.exports = {
  NARRATOR_SAMPLE_SCRIPTS,
  buildAllNarratorAuditionManifests,
  buildNarratorAuditionManifest,
};
