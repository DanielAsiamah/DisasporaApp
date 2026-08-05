'use strict';

const {
  getCourseById,
  getOnboardingCourses,
} = require('../data/courseCatalog.cjs');

const ONBOARDING_STEPS = [
  'welcome',
  'baseLanguage',
  'course',
  'motivation',
  'goal',
  'level',
  'ready',
];

const BASE_LANGUAGES = [
  { id: 'english', label: 'English', flag: '🇺🇸' },
  { id: 'french', label: 'French', flag: '🇫🇷' },
  { id: 'arabic', label: 'Arabic', flag: '🇸🇦' },
];

const COURSES_BY_BASE_LANGUAGE = Object.freeze({
  english: Object.freeze(getOnboardingCourses('english')),
  french: Object.freeze(getOnboardingCourses('french')),
  arabic: Object.freeze(getOnboardingCourses('arabic')),
});

const MOTIVATIONS = [
  { id: 'heritage', label: 'Heritage', detail: 'Reconnect with my roots' },
  { id: 'family', label: 'Family', detail: 'Connect with family' },
  { id: 'travel', label: 'Travel', detail: 'Speak confidently while travelling' },
  { id: 'community', label: 'Community', detail: 'Feel closer to my community' },
];

const DAILY_GOALS = [
  { id: '5', minutes: 5, label: '5 minutes' },
  { id: '10', minutes: 10, label: '10 minutes' },
  { id: '15', minutes: 15, label: '15 minutes' },
  { id: '20', minutes: 20, label: '20 minutes' },
];

const STARTING_LEVELS = [
  { id: 'new', label: 'New learner', unit: 1 },
  { id: 'some', label: 'Know a few words', unit: 1 },
  { id: 'conversational', label: 'Conversational', unit: 2 },
];

const INITIAL_ONBOARDING_DRAFT = {
  preferredName: '',
  baseLanguage: 'english',
  currentCourse: 'jamaican-patois',
  guideRegion: 'caribbean',
  motivation: 'heritage',
  dailyGoalMinutes: 10,
  proficiencyLevel: 'some',
  recommendedStartUnit: 1,
  reminderEnabled: true,
  reminderTime: '19:00',
};

const BASE_LANGUAGE_IDS = new Set(BASE_LANGUAGES.map(({ id }) => id));
const MOTIVATION_IDS = new Set(MOTIVATIONS.map(({ id }) => id));
const DAILY_GOAL_MINUTES = new Set(DAILY_GOALS.map(({ minutes }) => minutes));
const STARTING_LEVEL_IDS = new Set(STARTING_LEVELS.map(({ id }) => id));
const START_UNIT_IDS = new Set(STARTING_LEVELS.map(({ unit }) => unit));

function sanitizeOnboardingStepIndex(value) {
  return Number.isInteger(value) && value >= 0 && value < ONBOARDING_STEPS.length
    ? value
    : 0;
}

function getCoursesForBaseLanguage(baseLanguage) {
  return COURSES_BY_BASE_LANGUAGE[baseLanguage] || COURSES_BY_BASE_LANGUAGE.english;
}

function getCourse(baseLanguage, courseId) {
  const course = getCourseById(courseId);
  return course && getCoursesForBaseLanguage(baseLanguage).some(({ id }) => id === course.id)
    ? course
    : null;
}

function selectBaseLanguage(draft, baseLanguage) {
  const safeDraft = draft && typeof draft === 'object' ? draft : {};
  const safeBaseLanguage = BASE_LANGUAGE_IDS.has(baseLanguage) ? baseLanguage : 'english';
  const courses = getCoursesForBaseLanguage(safeBaseLanguage);
  const course = getCourse(safeBaseLanguage, safeDraft.currentCourse) || courses[0];

  return {
    ...safeDraft,
    baseLanguage: safeBaseLanguage,
    currentCourse: course.id,
    guideRegion: course.region,
  };
}

function sanitizeDraft(source, allowCompletion = false) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return {};

  const sanitized = {};

  if (typeof source.preferredName === 'string') sanitized.preferredName = source.preferredName;
  if (BASE_LANGUAGE_IDS.has(source.baseLanguage)) sanitized.baseLanguage = source.baseLanguage;
  if (typeof source.currentCourse === 'string') sanitized.currentCourse = source.currentCourse;
  if (MOTIVATION_IDS.has(source.motivation)) sanitized.motivation = source.motivation;
  if (DAILY_GOAL_MINUTES.has(source.dailyGoalMinutes)) {
    sanitized.dailyGoalMinutes = source.dailyGoalMinutes;
  }
  if (STARTING_LEVEL_IDS.has(source.proficiencyLevel)) {
    sanitized.proficiencyLevel = source.proficiencyLevel;
  }
  if (START_UNIT_IDS.has(source.recommendedStartUnit)) {
    sanitized.recommendedStartUnit = source.recommendedStartUnit;
  }
  if (typeof source.reminderEnabled === 'boolean') {
    sanitized.reminderEnabled = source.reminderEnabled;
  }
  if (source.reminderTime === '19:00') sanitized.reminderTime = source.reminderTime;
  if (allowCompletion && typeof source.onboardingCompleted === 'boolean') {
    sanitized.onboardingCompleted = source.onboardingCompleted;
  }
  if (START_UNIT_IDS.has(source.selectedStartUnit)) {
    sanitized.selectedStartUnit = source.selectedStartUnit;
  }

  return sanitized;
}

function hydrateOnboardingDraft(localDraft, profileDraft) {
  const mergedDraft = {
    ...INITIAL_ONBOARDING_DRAFT,
    ...sanitizeDraft(localDraft),
    ...sanitizeDraft(profileDraft, true),
  };

  return selectBaseLanguage(mergedDraft, mergedDraft.baseLanguage);
}

function restoreOnboardingProgress(localDraft, profileDraft) {
  return {
    draft: hydrateOnboardingDraft(localDraft, profileDraft),
    stepIndex: sanitizeOnboardingStepIndex(localDraft?.onboardingStepIndex),
  };
}

function completeOnboarding(draft) {
  const completeDraft = hydrateOnboardingDraft(draft);
  const preferredName = completeDraft.preferredName.trim();
  const selectedLevel = STARTING_LEVELS.find(
    (level) => level.id === completeDraft.proficiencyLevel
  );

  if (preferredName.length < 2) {
    throw new Error('Preferred name must be at least 2 characters.');
  }
  if (!canContinueOnboarding('course', completeDraft)) {
    throw new Error('Select an available course before completing onboarding.');
  }
  if (!canCompleteOnboarding(completeDraft)) {
    throw new Error('Complete every onboarding step before saving your path.');
  }

  return {
    ...completeDraft,
    preferredName,
    recommendedStartUnit: selectedLevel.unit,
    onboardingCompleted: true,
    selectedStartUnit: selectedLevel.unit,
  };
}

function canContinueOnboarding(step, draft) {
  const safeDraft = draft && typeof draft === 'object' ? draft : {};

  if (step === 'welcome') {
    return typeof safeDraft.preferredName === 'string'
      && safeDraft.preferredName.trim().length >= 2;
  }
  if (step === 'baseLanguage') return BASE_LANGUAGE_IDS.has(safeDraft.baseLanguage);
  if (step === 'course') {
    const course = getCourse(safeDraft.baseLanguage, safeDraft.currentCourse);
    return Boolean(course?.available);
  }
  if (step === 'motivation') return MOTIVATION_IDS.has(safeDraft.motivation);
  if (step === 'goal') return DAILY_GOAL_MINUTES.has(safeDraft.dailyGoalMinutes);
  if (step === 'level') return STARTING_LEVEL_IDS.has(safeDraft.proficiencyLevel);
  if (step === 'ready') return safeDraft.reminderTime === '19:00';

  return false;
}

function canCompleteOnboarding(draft) {
  return ONBOARDING_STEPS.every((step) => canContinueOnboarding(step, draft));
}

function needsOnboarding(profile) {
  return profile?.onboardingCompleted !== true;
}

module.exports = {
  ONBOARDING_STEPS,
  INITIAL_ONBOARDING_DRAFT,
  BASE_LANGUAGES,
  COURSES_BY_BASE_LANGUAGE,
  MOTIVATIONS,
  DAILY_GOALS,
  STARTING_LEVELS,
  getCoursesForBaseLanguage,
  selectBaseLanguage,
  sanitizeOnboardingStepIndex,
  hydrateOnboardingDraft,
  restoreOnboardingProgress,
  completeOnboarding,
  canCompleteOnboarding,
  canContinueOnboarding,
  needsOnboarding,
};
