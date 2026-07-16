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

test('only Jamaican Patois is currently available and published', () => {
  assert.deepEqual(AVAILABLE_COURSE_IDS, ['jamaican-patois']);
  assert.deepEqual(
    COURSE_CATALOG.filter((course) => course.available).map((course) => course.id),
    ['jamaican-patois']
  );
  assert.deepEqual(
    COURSE_CATALOG.filter((course) => course.published).map((course) => course.id),
    ['jamaican-patois']
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
