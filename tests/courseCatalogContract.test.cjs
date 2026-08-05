const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  AVAILABLE_COURSE_IDS,
  COURSE_CATALOG,
  COURSE_IDS,
  getCourseById,
  getOnboardingCourses,
  normalizeCourseId,
} = require('../src/data/courseCatalog.cjs');
const { VERIFIED_COURSE_RELEASES } = require('../src/data/verifiedCourseReleases.cjs');
const { hasVerifiedCourseRelease } = require('../src/data/verifiedCourseReleases.cjs');
const { GENERATED_CURRICULUM } = require('../src/data/generatedCurriculum.cjs');
const { deriveCourseReleaseState } = require('../src/data/courseAccessPolicy.cjs');

const EXPECTED_COURSE_IDS = [
  'jamaican-patois',
  'swahili',
  'wolof',
  'haitian-creole',
  'sudanese-arabic',
  'nobiin',
  'igbo',
  'belizean-kriol',
  'aave',
];

test('catalog exposes the nine canonical courses in release order', () => {
  assert.deepEqual(COURSE_IDS, EXPECTED_COURSE_IDS);
  assert.deepEqual(COURSE_CATALOG.map((course) => course.id), EXPECTED_COURSE_IDS);
  assert.deepEqual(COURSE_CATALOG.map((course) => course.displayName), [
    'Jamaican Patois',
    'Swahili',
    'Wolof',
    'Haitian Creole',
    'Sudanese Arabic',
    'Nobiin',
    'Igbo',
    'Belizean Kriol',
    'AAVE',
  ]);
});

test('onboarding contains only the six MVP courses grouped by base language', () => {
  assert.deepEqual(
    getOnboardingCourses('english').map((course) => course.id),
    ['jamaican-patois', 'swahili']
  );
  assert.deepEqual(
    getOnboardingCourses('french').map((course) => course.id),
    ['wolof', 'haitian-creole']
  );
  assert.deepEqual(
    getOnboardingCourses('arabic').map((course) => course.id),
    ['sudanese-arabic', 'nobiin']
  );
  assert.deepEqual(
    getOnboardingCourses('unknown').map((course) => course.id),
    ['jamaican-patois', 'swahili']
  );
});

test('catalog availability is derived from workbook state plus an exact verified release', () => {
  const expectedStates = Object.fromEntries(GENERATED_CURRICULUM.courses.map((course) => [
    course.id,
    deriveCourseReleaseState(course, {
      hasVerifiedRelease: hasVerifiedCourseRelease(
        course.id,
        GENERATED_CURRICULUM.meta.courseContentSha256[course.id]
      ),
    }),
  ]));
  for (const course of COURSE_CATALOG) {
    assert.equal(course.available, expectedStates[course.id].available);
    assert.equal(course.published, expectedStates[course.id].published);
  }
  assert.deepEqual(
    AVAILABLE_COURSE_IDS,
    COURSE_CATALOG.filter((course) => course.available).map((course) => course.id)
  );
  for (const [courseId, record] of Object.entries(VERIFIED_COURSE_RELEASES)) {
    assert.equal(
      record.courseContentSha256,
      GENERATED_CURRICULUM.meta.courseContentSha256[courseId]
    );
  }
});

test('catalog verifies the current per-course content fingerprint instead of registry-key presence', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'data', 'courseCatalog.cjs'),
    'utf8'
  );

  assert.match(
    source,
    /hasVerifiedCourseRelease\(\s*sourceCourse\.id,\s*GENERATED_CURRICULUM\.meta\.courseContentSha256\?\.\[sourceCourse\.id\]\s*\)/s
  );
});

test('legacy profile IDs normalize to canonical IDs without accepting removed courses', () => {
  assert.equal(normalizeCourseId('patois'), 'jamaican-patois');
  assert.equal(normalizeCourseId('haitian'), 'haitian-creole');
  assert.equal(normalizeCourseId('sudanese'), 'sudanese-arabic');
  assert.equal(normalizeCourseId('nubian'), 'nobiin');
  assert.equal(normalizeCourseId('belize'), 'belizean-kriol');
  assert.equal(normalizeCourseId('belizean'), 'belizean-kriol');
  assert.equal(normalizeCourseId('nouchi'), null);
  assert.equal(normalizeCourseId('stale-course'), null);
  assert.equal(getCourseById('patois').id, 'jamaican-patois');
});

test('active app and selection screens no longer import the legacy generated catalog', () => {
  for (const relativePath of [
    'App.js',
    'src/screens/CourseSelectScreen.js',
    'src/screens/AccountChoiceScreen.js',
    'src/onboarding/onboardingModel.js',
  ]) {
    const source = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
    assert.doesNotMatch(source, /generatedCourses/);
  }
});

test('guided onboarding exposes unavailable course choices as disabled controls', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'src/screens/GuidedOnboardingScreen.js'),
    'utf8'
  );

  assert.match(source, /const disabled = item\.available === false/);
  assert.match(source, /accessibilityState=\{\{ checked: active, disabled \}\}/);
  assert.match(source, /disabled=\{disabled\}/);
});
