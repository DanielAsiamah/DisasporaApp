const { VOICE_ROLES } = require('./voiceRoleContract.cjs');

const NARRATOR_ROLE_BY_BASE_LANGUAGE = Object.freeze({
  English: 'narrator-en',
  French: 'narrator-fr',
  Arabic: 'narrator-ar',
});

const COURSE_TARGET_LANGUAGE_ROLES = Object.freeze({
  'jamaican-patois': 'target-patois-denzel',
  swahili: 'target-swahili-yna',
  wolof: null,
  'haitian-creole': null,
  'sudanese-arabic': null,
  nobiin: null,
  igbo: null,
  'belizean-kriol': null,
  aave: null,
});

function buildCourseVoicePlan(course) {
  if (!course || typeof course.id !== 'string' || typeof course.baseLanguage !== 'string') {
    throw new Error('A course with an ID and base language is required.');
  }
  if (!Object.hasOwn(COURSE_TARGET_LANGUAGE_ROLES, course.id)) {
    throw new Error(`No target-language voice plan exists for course ${course.id}.`);
  }

  const narratorRoleId = NARRATOR_ROLE_BY_BASE_LANGUAGE[course.baseLanguage];
  const narratorRole = VOICE_ROLES[narratorRoleId];
  if (!narratorRole || narratorRole.roleKind !== 'interface-narrator') {
    throw new Error(`No instructional narrator is configured for ${course.baseLanguage}.`);
  }

  const targetLanguageRoleId = COURSE_TARGET_LANGUAGE_ROLES[course.id];
  const targetLanguageRole = targetLanguageRoleId ? VOICE_ROLES[targetLanguageRoleId] : null;
  if (targetLanguageRoleId && (!targetLanguageRole || targetLanguageRole.roleKind !== 'target-language')) {
    throw new Error(`Invalid target-language voice role ${targetLanguageRoleId} for ${course.id}.`);
  }

  return Object.freeze({
    courseId: course.id,
    baseLanguage: course.baseLanguage,
    narratorRoleId,
    narratorStatus: narratorRole.status,
    narratorEnabled: narratorRole.enabled,
    targetLanguageRoleId,
    targetLanguageStatus: targetLanguageRole?.status || 'voice-candidate-required',
    targetLanguageEnabled: targetLanguageRole?.enabled || false,
  });
}

module.exports = {
  COURSE_TARGET_LANGUAGE_ROLES,
  NARRATOR_ROLE_BY_BASE_LANGUAGE,
  buildCourseVoicePlan,
};
