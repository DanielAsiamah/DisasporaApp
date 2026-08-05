import { JAMAICAN_PATOIS_IMAGE_REGISTRY } from './jamaicanPatoisImageRegistry';
import { SWAHILI_IMAGE_REGISTRY } from './swahiliImageRegistry';
import { WOLOF_IMAGE_REGISTRY } from './wolofImageRegistry';

const COURSE_IMAGE_REGISTRIES = Object.freeze({
  'jamaican-patois': JAMAICAN_PATOIS_IMAGE_REGISTRY,
  swahili: SWAHILI_IMAGE_REGISTRY,
  wolof: WOLOF_IMAGE_REGISTRY,
});

export function getCourseImageRegistry(courseId) {
  return COURSE_IMAGE_REGISTRIES[courseId] || Object.freeze({});
}
