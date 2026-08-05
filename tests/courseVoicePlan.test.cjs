const test = require('node:test');
const assert = require('node:assert/strict');

const { GENERATED_CURRICULUM } = require('../src/data/generatedCurriculum.cjs');
const { VOICE_ROLES } = require('../src/audio/voiceRoleContract.cjs');
const {
  COURSE_TARGET_LANGUAGE_ROLES,
  NARRATOR_ROLE_BY_BASE_LANGUAGE,
  buildCourseVoicePlan,
} = require('../src/audio/courseVoicePlan.cjs');

test('every catalog course resolves to its base-language narrator independently of target speech', () => {
  const expectedNarrators = {
    English: 'narrator-en',
    French: 'narrator-fr',
    Arabic: 'narrator-ar',
  };

  assert.deepEqual(NARRATOR_ROLE_BY_BASE_LANGUAGE, expectedNarrators);
  for (const course of GENERATED_CURRICULUM.courses) {
    const plan = buildCourseVoicePlan(course);
    assert.equal(plan.courseId, course.id);
    assert.equal(plan.baseLanguage, course.baseLanguage);
    assert.equal(plan.narratorRoleId, expectedNarrators[course.baseLanguage]);
    assert.equal(VOICE_ROLES[plan.narratorRoleId].roleKind, 'interface-narrator');
  }
});

test('Swahili uses an English narrator and a distinct disabled Swahili target candidate', () => {
  const course = GENERATED_CURRICULUM.courses.find(({ id }) => id === 'swahili');
  const plan = buildCourseVoicePlan(course);

  assert.equal(plan.narratorRoleId, 'narrator-en');
  assert.equal(plan.targetLanguageRoleId, 'target-swahili-yna');
  assert.notEqual(plan.narratorRoleId, plan.targetLanguageRoleId);
  assert.equal(plan.targetLanguageStatus, 'voice-audition-required');
  assert.equal(plan.targetLanguageEnabled, false);
});

test('future courses retain the correct narrator while target speech stays explicitly unassigned', () => {
  const wolof = buildCourseVoicePlan(GENERATED_CURRICULUM.courses.find(({ id }) => id === 'wolof'));
  const sudaneseArabic = buildCourseVoicePlan(
    GENERATED_CURRICULUM.courses.find(({ id }) => id === 'sudanese-arabic')
  );

  assert.equal(wolof.narratorRoleId, 'narrator-fr');
  assert.equal(wolof.targetLanguageRoleId, null);
  assert.equal(wolof.targetLanguageStatus, 'voice-candidate-required');
  assert.equal(sudaneseArabic.narratorRoleId, 'narrator-ar');
  assert.equal(sudaneseArabic.targetLanguageRoleId, null);
  assert.equal(sudaneseArabic.targetLanguageStatus, 'voice-candidate-required');
  assert.equal(COURSE_TARGET_LANGUAGE_ROLES['sudanese-arabic'], null);
});

test('voice plans reject unknown courses or unsupported base languages', () => {
  assert.throws(() => buildCourseVoicePlan(null), /course/i);
  assert.throws(
    () => buildCourseVoicePlan({ id: 'unknown', baseLanguage: 'English' }),
    /target-language voice plan/i
  );
  assert.throws(
    () => buildCourseVoicePlan({ id: 'swahili', baseLanguage: 'German' }),
    /narrator/i
  );
});
