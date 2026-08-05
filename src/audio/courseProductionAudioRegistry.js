import { PATOIS_PRODUCTION_AUDIO_REGISTRY } from './patoisProductionAudioRegistry';
import { SWAHILI_PRODUCTION_AUDIO_REGISTRY } from './swahiliProductionAudioRegistry';

const {
  getCourseProductionAudioRegistry: resolveCourseRegistry,
  hasApprovedCourseAudio: resolveCourseAudioAvailability,
} = require('./courseProductionAudioRegistry.cjs');

export const COURSE_PRODUCTION_AUDIO_REGISTRIES = Object.freeze({
  'jamaican-patois': PATOIS_PRODUCTION_AUDIO_REGISTRY,
  swahili: SWAHILI_PRODUCTION_AUDIO_REGISTRY,
});

export function getCourseProductionAudioRegistry(courseId) {
  return resolveCourseRegistry(courseId, COURSE_PRODUCTION_AUDIO_REGISTRIES);
}

export function hasApprovedCourseAudio(courseId, conceptId) {
  return resolveCourseAudioAvailability(
    courseId,
    conceptId,
    COURSE_PRODUCTION_AUDIO_REGISTRIES
  );
}
