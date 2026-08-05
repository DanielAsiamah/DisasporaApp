import { JAMAICAN_PATOIS_IMAGE_REGISTRY } from './jamaicanPatoisImageRegistry';
import { SWAHILI_IMAGE_REGISTRY } from './swahiliImageRegistry';
import { WOLOF_IMAGE_REGISTRY } from './wolofImageRegistry';
import { HAITIAN_CREOLE_IMAGE_REGISTRY } from './haitianCreoleImageRegistry';
import { SUDANESE_ARABIC_IMAGE_REGISTRY } from './sudaneseArabicImageRegistry';
import { NOBIIN_IMAGE_REGISTRY } from './nobiinImageRegistry';

const COURSE_IMAGE_REGISTRIES = Object.freeze({
  'jamaican-patois': JAMAICAN_PATOIS_IMAGE_REGISTRY,
  swahili: SWAHILI_IMAGE_REGISTRY,
  wolof: WOLOF_IMAGE_REGISTRY,
  'haitian-creole': HAITIAN_CREOLE_IMAGE_REGISTRY,
  'sudanese-arabic': SUDANESE_ARABIC_IMAGE_REGISTRY,
  nobiin: NOBIIN_IMAGE_REGISTRY,
});

export function getCourseImageRegistry(courseId) {
  return COURSE_IMAGE_REGISTRIES[courseId] || Object.freeze({});
}
