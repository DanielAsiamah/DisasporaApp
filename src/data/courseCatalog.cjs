'use strict';

const { GENERATED_CURRICULUM } = require('./generatedCurriculum.cjs');

const UI_METADATA = Object.freeze({
  'jamaican-patois': Object.freeze({
    region: 'caribbean',
    flag: '\u{1F1EF}\u{1F1F2}',
    subtitle: 'Learn greetings, respect, and everyday Patois conversation.',
    category: 'Caribbean Creole',
  }),
  swahili: Object.freeze({
    region: 'africa',
    flag: '\u{1F1F0}\u{1F1EA}',
    subtitle: 'Learn useful Kiswahili for everyday connection.',
    category: 'East African Bantu',
  }),
  wolof: Object.freeze({
    region: 'africa',
    flag: '\u{1F1F8}\u{1F1F3}',
    subtitle: 'Pratiquez le wolof pour les conversations du quotidien.',
    category: 'West African Language',
  }),
  'haitian-creole': Object.freeze({
    region: 'caribbean',
    flag: '\u{1F1ED}\u{1F1F9}',
    subtitle: 'Apprenez le cr\u00e9ole ha\u00eftien pour la vie quotidienne.',
    category: 'Caribbean Creole',
  }),
  'sudanese-arabic': Object.freeze({
    region: 'africa',
    flag: '\u{1F1F8}\u{1F1E9}',
    subtitle: '\u062a\u0639\u0644\u0651\u0645 \u0627\u0644\u0639\u0627\u0645\u064a\u0629 \u0627\u0644\u0633\u0648\u062f\u0627\u0646\u064a\u0629 \u0644\u0644\u062d\u064a\u0627\u0629 \u0627\u0644\u064a\u0648\u0645\u064a\u0629.',
    category: 'Sudanese Arabic',
  }),
  nobiin: Object.freeze({
    region: 'africa',
    flag: '\u{1F1EA}\u{1F1EC}',
    subtitle: '\u0627\u0643\u062a\u0634\u0641 \u0644\u063a\u0629 \u0646\u0648\u0628\u064a\u0646 \u0648\u062a\u0631\u0627\u062b \u0627\u0644\u0646\u064a\u0644.',
    category: 'Nubian Language',
  }),
  igbo: Object.freeze({
    region: 'africa',
    flag: '\u{1F1F3}\u{1F1EC}',
    subtitle: 'Build everyday Igbo vocabulary and conversation.',
    category: 'West African Language',
  }),
  'belizean-kriol': Object.freeze({
    region: 'caribbean',
    flag: '\u{1F1E7}\u{1F1FF}',
    subtitle: 'Discover everyday Kriol from Belize.',
    category: 'Central American Kriol',
  }),
  aave: Object.freeze({
    region: 'diaspora',
    flag: '\u{1F1FA}\u{1F1F8}',
    subtitle: 'Explore African American English in cultural context.',
    category: 'African American English',
  }),
});

const ACTIVE_AVAILABILITY = new Set(['preview', 'published']);
const COURSE_CATALOG = Object.freeze(GENERATED_CURRICULUM.courses.map((sourceCourse) => {
  const available = ACTIVE_AVAILABILITY.has(sourceCourse.availability);
  return Object.freeze({
    ...sourceCourse,
    ...UI_METADATA[sourceCourse.id],
    label: sourceCourse.displayName,
    baseLanguage: sourceCourse.baseLanguage.toLowerCase(),
    available,
    published: available,
  });
}));

const COURSE_IDS = Object.freeze(COURSE_CATALOG.map((course) => course.id));
const AVAILABLE_COURSE_IDS = Object.freeze(
  COURSE_CATALOG.filter((course) => course.available && course.published).map((course) => course.id)
);
const COURSE_BY_ID = new Map(COURSE_CATALOG.map((course) => [course.id, course]));
const LEGACY_COURSE_ID_ALIASES = Object.freeze({
  patois: 'jamaican-patois',
  haitian: 'haitian-creole',
  sudanese: 'sudanese-arabic',
  nubian: 'nobiin',
  belize: 'belizean-kriol',
  belizean: 'belizean-kriol',
});

function normalizeCourseId(courseId) {
  if (typeof courseId !== 'string') return null;
  const normalized = LEGACY_COURSE_ID_ALIASES[courseId] || courseId;
  return COURSE_BY_ID.has(normalized) ? normalized : null;
}

function getCourseById(courseId) {
  const normalized = normalizeCourseId(courseId);
  return normalized ? COURSE_BY_ID.get(normalized) : null;
}

function getOnboardingCourses(baseLanguage) {
  const normalizedBaseLanguage = ['english', 'french', 'arabic'].includes(baseLanguage)
    ? baseLanguage
    : 'english';
  return COURSE_CATALOG.filter(
    (course) => course.onboarding && course.baseLanguage === normalizedBaseLanguage
  );
}

function getBaseLanguageForCourse(courseId) {
  return getCourseById(courseId)?.baseLanguage || 'english';
}

module.exports = {
  AVAILABLE_COURSE_IDS,
  COURSE_CATALOG,
  COURSE_IDS,
  getBaseLanguageForCourse,
  getCourseById,
  getOnboardingCourses,
  normalizeCourseId,
};
