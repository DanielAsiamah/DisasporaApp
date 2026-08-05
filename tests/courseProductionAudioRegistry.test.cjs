const assert = require('node:assert/strict');
const test = require('node:test');

const {
  EMPTY_PRODUCTION_AUDIO_REGISTRY,
  getCourseProductionAudioRegistry,
  hasApprovedCourseAudio,
} = require('../src/audio/courseProductionAudioRegistry.cjs');

const PATIOS_AUDIO = Object.freeze({
  yes: 101,
});

const registries = Object.freeze({
  'jamaican-patois': PATIOS_AUDIO,
});

test('resolves only the explicitly registered course audio without cross-course fallback', () => {
  assert.equal(
    getCourseProductionAudioRegistry('jamaican-patois', registries),
    PATIOS_AUDIO
  );
  assert.equal(
    getCourseProductionAudioRegistry('swahili', registries),
    EMPTY_PRODUCTION_AUDIO_REGISTRY
  );
  assert.equal(
    getCourseProductionAudioRegistry('toString', registries),
    EMPTY_PRODUCTION_AUDIO_REGISTRY
  );
});

test('reports approved audio from the selected course registry only', () => {
  assert.equal(hasApprovedCourseAudio('jamaican-patois', 'yes', registries), true);
  assert.equal(hasApprovedCourseAudio('jamaican-patois', 'no', registries), false);
  assert.equal(hasApprovedCourseAudio('swahili', 'yes', registries), false);
  assert.equal(hasApprovedCourseAudio(null, 'yes', registries), false);
});

test('the shared empty registry is immutable and reused for unavailable courses', () => {
  assert.equal(Object.isFrozen(EMPTY_PRODUCTION_AUDIO_REGISTRY), true);
  assert.equal(
    getCourseProductionAudioRegistry('swahili', registries),
    getCourseProductionAudioRegistry('wolof', registries)
  );
});
