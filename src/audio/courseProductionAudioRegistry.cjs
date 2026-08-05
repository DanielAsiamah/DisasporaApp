const EMPTY_PRODUCTION_AUDIO_REGISTRY = Object.freeze({});

function getCourseProductionAudioRegistry(courseId, registries = EMPTY_PRODUCTION_AUDIO_REGISTRY) {
  if (!courseId || !Object.prototype.hasOwnProperty.call(registries, courseId)) {
    return EMPTY_PRODUCTION_AUDIO_REGISTRY;
  }
  const registry = registries[courseId];
  return registry && typeof registry === 'object'
    ? registry
    : EMPTY_PRODUCTION_AUDIO_REGISTRY;
}

function hasApprovedCourseAudio(courseId, conceptId, registries = EMPTY_PRODUCTION_AUDIO_REGISTRY) {
  if (!conceptId) return false;
  const registry = getCourseProductionAudioRegistry(courseId, registries);
  return Object.prototype.hasOwnProperty.call(registry, conceptId) && Boolean(registry[conceptId]);
}

module.exports = {
  EMPTY_PRODUCTION_AUDIO_REGISTRY,
  getCourseProductionAudioRegistry,
  hasApprovedCourseAudio,
};
