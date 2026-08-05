const assert = require('node:assert/strict');
const test = require('node:test');

let onboarding = {};
try {
  onboarding = require('../src/onboarding/onboardingModel');
} catch (error) {
  if (error.code !== 'MODULE_NOT_FOUND') throw error;
}

test('uses the exact approved seven-screen order', () => {
  assert.deepEqual(onboarding.ONBOARDING_STEPS, [
    'welcome',
    'baseLanguage',
    'course',
    'motivation',
    'goal',
    'level',
    'ready',
  ]);
});

test('filters the six MVP courses by base language in the approved order', () => {
  assert.deepEqual(
    onboarding.getCoursesForBaseLanguage('english').map((course) => course.id),
    ['jamaican-patois', 'swahili']
  );
  assert.deepEqual(
    onboarding.getCoursesForBaseLanguage('french').map((course) => course.id),
    ['wolof', 'haitian-creole']
  );
  assert.deepEqual(
    onboarding.getCoursesForBaseLanguage('arabic').map((course) => course.id),
    ['sudanese-arabic', 'nobiin']
  );
  assert.deepEqual(
    onboarding.getCoursesForBaseLanguage('unknown').map((course) => course.id),
    ['jamaican-patois', 'swahili']
  );
});

test('shows upcoming MVP courses without allowing an unavailable path to continue', () => {
  assert.deepEqual(
    onboarding.getCoursesForBaseLanguage('french').map((course) => course.available),
    [false, false]
  );
  assert.equal(
    onboarding.canContinueOnboarding('course', {
      ...onboarding.INITIAL_ONBOARDING_DRAFT,
      baseLanguage: 'french',
      currentCourse: 'wolof',
    }),
    false
  );
  assert.equal(
    onboarding.canContinueOnboarding('course', onboarding.INITIAL_ONBOARDING_DRAFT),
    true
  );
});

test('changing the base language cannot retain an incompatible course', () => {
  const frenchDraft = onboarding.selectBaseLanguage(
    { ...onboarding.INITIAL_ONBOARDING_DRAFT, currentCourse: 'jamaican-patois' },
    'french'
  );

  assert.equal(frenchDraft.baseLanguage, 'french');
  assert.equal(frenchDraft.currentCourse, 'wolof');
  assert.equal(frenchDraft.guideRegion, 'africa');
});

test('hydrates only known fields and gives the signed-in profile precedence', () => {
  const hydrated = onboarding.hydrateOnboardingDraft(
    {
      preferredName: 'Local learner',
      baseLanguage: 'english',
      currentCourse: 'swahili',
      unexpectedField: 'discard me',
    },
    {
      preferredName: 'Cloud learner',
      baseLanguage: 'french',
      currentCourse: 'haitian-creole',
    }
  );

  assert.equal(hydrated.preferredName, 'Cloud learner');
  assert.equal(hydrated.baseLanguage, 'french');
  assert.equal(hydrated.currentCourse, 'haitian-creole');
  assert.equal(Object.hasOwn(hydrated, 'unexpectedField'), false);
});

test('trusts onboarding completion only when it comes from the signed-in profile', () => {
  const hydratedLocalDraft = onboarding.hydrateOnboardingDraft({
    preferredName: 'Local learner',
    onboardingCompleted: true,
  });
  const hydratedProfile = onboarding.hydrateOnboardingDraft(
    { onboardingCompleted: true },
    { preferredName: 'Cloud learner', onboardingCompleted: true }
  );

  assert.equal(Object.hasOwn(hydratedLocalDraft, 'onboardingCompleted'), false);
  assert.equal(onboarding.needsOnboarding(hydratedLocalDraft), true);
  assert.equal(hydratedProfile.onboardingCompleted, true);
  assert.equal(onboarding.needsOnboarding(hydratedProfile), false);
});

test('sanitizes the locally saved onboarding step to the seven-screen range', () => {
  assert.equal(onboarding.sanitizeOnboardingStepIndex(0), 0);
  assert.equal(onboarding.sanitizeOnboardingStepIndex(4), 4);
  assert.equal(onboarding.sanitizeOnboardingStepIndex(6), 6);

  for (const unsafeStep of [-1, 7, 2.5, '4', null, undefined]) {
    assert.equal(onboarding.sanitizeOnboardingStepIndex(unsafeStep), 0);
  }
});

test('restores the last local step without letting profile data inject navigation state', () => {
  const restored = onboarding.restoreOnboardingProgress(
    {
      preferredName: 'Local learner',
      onboardingCompleted: true,
      onboardingStepIndex: 4,
    },
    {
      preferredName: 'Cloud learner',
      onboardingCompleted: false,
      onboardingStepIndex: 6,
    }
  );

  assert.equal(restored.stepIndex, 4);
  assert.equal(restored.draft.preferredName, 'Cloud learner');
  assert.equal(restored.draft.onboardingCompleted, false);
  assert.equal(Object.hasOwn(restored.draft, 'onboardingStepIndex'), false);
});

test('falls back to the welcome screen when the saved local step is invalid', () => {
  const restored = onboarding.restoreOnboardingProgress(
    { preferredName: 'Maya', onboardingStepIndex: 99 },
    { onboardingStepIndex: 5 }
  );

  assert.equal(restored.stepIndex, 0);
  assert.equal(Object.hasOwn(restored.draft, 'onboardingStepIndex'), false);
});

test('replaces a legacy course that is outside the six-course MVP', () => {
  const hydrated = onboarding.hydrateOnboardingDraft({
    baseLanguage: 'english',
    currentCourse: 'igbo',
  });

  assert.equal(hydrated.currentCourse, 'jamaican-patois');
});

test('defaults to the approved example journey and 7 PM reminder', () => {
  assert.equal(onboarding.INITIAL_ONBOARDING_DRAFT.baseLanguage, 'english');
  assert.equal(onboarding.INITIAL_ONBOARDING_DRAFT.currentCourse, 'jamaican-patois');
  assert.equal(onboarding.INITIAL_ONBOARDING_DRAFT.motivation, 'heritage');
  assert.equal(onboarding.INITIAL_ONBOARDING_DRAFT.dailyGoalMinutes, 10);
  assert.equal(onboarding.INITIAL_ONBOARDING_DRAFT.proficiencyLevel, 'some');
  assert.equal(onboarding.INITIAL_ONBOARDING_DRAFT.reminderEnabled, true);
  assert.equal(onboarding.INITIAL_ONBOARDING_DRAFT.reminderTime, '19:00');
});

test('creates the durable completion payload once the ready screen finishes', () => {
  const complete = onboarding.completeOnboarding({
    ...onboarding.INITIAL_ONBOARDING_DRAFT,
    preferredName: '  Maya  ',
    proficiencyLevel: 'conversational',
    recommendedStartUnit: 1,
  });

  assert.equal(complete.preferredName, 'Maya');
  assert.equal(complete.onboardingCompleted, true);
  assert.equal(complete.recommendedStartUnit, 2);
  assert.equal(complete.selectedStartUnit, 2);
  assert.equal(complete.currentCourse, 'jamaican-patois');
  assert.equal(complete.reminderTime, '19:00');
});

test('a restored ready screen cannot complete with an unreleased course', () => {
  const unavailableCourse = ['english', 'french', 'arabic']
    .flatMap((baseLanguage) => onboarding.getCoursesForBaseLanguage(baseLanguage))
    .find((course) => !course.available);
  assert.ok(unavailableCourse, 'at least one MVP course remains unreleased during incremental delivery');
  const restored = onboarding.restoreOnboardingProgress({
    ...onboarding.INITIAL_ONBOARDING_DRAFT,
    preferredName: 'Maya',
    baseLanguage: unavailableCourse.baseLanguage,
    currentCourse: unavailableCourse.id,
    onboardingStepIndex: 6,
  });

  assert.equal(restored.stepIndex, 6);
  assert.equal(onboarding.canContinueOnboarding('ready', restored.draft), true);
  assert.equal(onboarding.canCompleteOnboarding(restored.draft), false);
  assert.throws(
    () => onboarding.completeOnboarding(restored.draft),
    { message: 'Select an available course before completing onboarding.' }
  );
});

test('derives both start-unit fields from proficiency instead of inconsistent input', () => {
  const complete = onboarding.completeOnboarding({
    ...onboarding.INITIAL_ONBOARDING_DRAFT,
    preferredName: 'Maya',
    proficiencyLevel: 'some',
    recommendedStartUnit: 2,
    selectedStartUnit: 2,
  });

  assert.equal(complete.recommendedStartUnit, 1);
  assert.equal(complete.selectedStartUnit, 1);
});

test('refuses to complete onboarding with fewer than two trimmed name characters', () => {
  for (const preferredName of ['', '   ', 'A', ' A ']) {
    assert.throws(
      () => onboarding.completeOnboarding({
        ...onboarding.INITIAL_ONBOARDING_DRAFT,
        preferredName,
      }),
      { message: 'Preferred name must be at least 2 characters.' }
    );
  }
});

test('only an explicitly completed profile skips the one-time onboarding', () => {
  assert.equal(onboarding.needsOnboarding({ onboardingCompleted: true }), false);
  assert.equal(onboarding.needsOnboarding({ onboardingCompleted: false }), true);
  assert.equal(onboarding.needsOnboarding({}), true);
  assert.equal(onboarding.needsOnboarding(null), true);
});

test('requires a two-character learner name because approved choices have safe defaults', () => {
  const draft = { ...onboarding.INITIAL_ONBOARDING_DRAFT };
  assert.equal(onboarding.canContinueOnboarding('welcome', draft), false);
  assert.equal(
    onboarding.canContinueOnboarding('welcome', { ...draft, preferredName: ' A ' }),
    false
  );
  assert.equal(
    onboarding.canContinueOnboarding('welcome', { ...draft, preferredName: 'Kai' }),
    true
  );

  for (const step of onboarding.ONBOARDING_STEPS.slice(1)) {
    assert.equal(onboarding.canContinueOnboarding(step, draft), true);
  }
});
