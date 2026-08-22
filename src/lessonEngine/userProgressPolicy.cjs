const USER_PROGRESS_FIELDS = Object.freeze([
  'streak',
  'hearts',
  'nextHeartAt',
  'heartsUpdatedAt',
  'gems',
  'currentCourse',
  'currentLesson',
  'purchasedItems',
  'onboardingCompleted',
  'baseLanguage',
  'baseLanguageLevels',
  'selectedStartUnit',
  'recommendedStartUnit',
  'lastActiveAt',
  'preferredName',
  'guideRegion',
  'motivation',
  'dailyGoalMinutes',
  'proficiencyLevel',
  'reminderEnabled',
  'reminderTime',
  'soundEffectsEnabled',
  'emailVerified',
]);

const USER_PROGRESS_FIELD_SET = new Set(USER_PROGRESS_FIELDS);

function filterUserProgressFields(fields = {}) {
  return Object.fromEntries(
    Object.entries(fields).filter(([key]) => USER_PROGRESS_FIELD_SET.has(key))
  );
}

module.exports = {
  USER_PROGRESS_FIELDS,
  filterUserProgressFields,
};
