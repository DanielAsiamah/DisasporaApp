const test = require('node:test');
const assert = require('node:assert/strict');

const { VOICE_ROLES } = require('../src/audio/voiceRoleContract.cjs');
const { JAMAICAN_PATOIS_VOCABULARY } = require('../src/data/jamaicanPatoisVocabulary.cjs');

test('English, French, and Arabic instruction each have a distinct narrator role', () => {
  for (const [roleId, locale] of [
    ['narrator-en', 'en'],
    ['narrator-fr', 'fr'],
    ['narrator-ar', 'ar'],
  ]) {
    assert.equal(VOICE_ROLES[roleId].roleKind, 'interface-narrator');
    assert.equal(VOICE_ROLES[roleId].locale, locale);
    assert.equal(VOICE_ROLES[roleId].enabled, false);
    assert.match(VOICE_ROLES[roleId].status, /audition|required|unassigned/);
  }
});

test('character dialogue and target-language vocabulary are separate roles', () => {
  assert.equal(VOICE_ROLES['kai-denzel'].roleKind, 'character-dialogue');
  assert.equal(VOICE_ROLES['amara-annakay'].roleKind, 'character-dialogue');
  assert.equal(VOICE_ROLES['target-patois-denzel'].roleKind, 'target-language');
  assert.equal(VOICE_ROLES['target-patois-annakay'].roleKind, 'target-language');
  assert.equal(VOICE_ROLES['target-patois-denzel'].locale, 'en-JM');
  assert.equal(VOICE_ROLES['target-patois-annakay'].locale, 'en-JM');
});

test('Swahili core vocabulary has its own disabled audition candidate role', () => {
  assert.deepEqual(VOICE_ROLES['target-swahili-yna'], {
    roleKind: 'target-language',
    character: null,
    locale: 'sw-KE',
    purpose: 'core-vocabulary',
    voiceEnvVar: 'ELEVENLABS_VOICE_ID_SWAHILI',
    displayName: 'Yna Agalo - Kenyan Lady (candidate)',
    enabled: false,
    status: 'voice-audition-required',
  });
});

test('Sol is explicitly silent until a suitable voice is approved', () => {
  assert.deepEqual(VOICE_ROLES['sol-silent'], {
    roleKind: 'silent-character',
    character: 'Sol',
    locale: null,
    purpose: 'character-dialogue',
    voiceEnvVar: null,
    displayName: 'Sol — intentionally silent',
    enabled: false,
    status: 'intentionally-silent-until-approved',
  });
});

test('all core Patois vocabulary rows use target-language roles rather than character-dialogue roles', () => {
  for (const row of JAMAICAN_PATOIS_VOCABULARY) {
    assert.equal(VOICE_ROLES[row.voiceId].roleKind, 'target-language');
  }
});
