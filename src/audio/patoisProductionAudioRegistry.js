// Approved production phrases are added here with static require() calls only
// after the three-clip audition and native-language review have passed.
export const PATOIS_PRODUCTION_AUDIO_REGISTRY = Object.freeze({});

export const LESSON_SFX_REGISTRY = Object.freeze({
  incorrect: require('../../assets/sounds/wrong.mp3'),
});

export function hasApprovedPatoisAudio(conceptId) {
  return Boolean(PATOIS_PRODUCTION_AUDIO_REGISTRY[conceptId]);
}

export function resolveApprovedPatoisAudio(conceptId) {
  return PATOIS_PRODUCTION_AUDIO_REGISTRY[conceptId] || null;
}
