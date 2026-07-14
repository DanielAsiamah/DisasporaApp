'use strict';

const AUTH_RECONCILIATION_SCREENS = new Set([
  'splash',
  'welcome',
  'guided-onboarding',
  'profile-error',
]);

function normalizeCourseId(courseId) {
  return courseId === 'belize' ? 'belizean' : courseId;
}

function resolveAuthenticatedRoute({
  profileLoaded,
  profile,
  profileError,
  knownCourseIds,
}) {
  if (!profileLoaded) return null;
  if (profileError) return 'profile-error';
  if (profile?.onboardingCompleted !== true) return 'guided-onboarding';

  const courseId = normalizeCourseId(profile.currentCourse);
  return courseId && knownCourseIds?.has(courseId) ? 'home' : 'course-select';
}

function shouldReconcileAuthenticatedRoute({
  routeReady,
  isAuthenticated,
  profileLoaded,
  screen,
}) {
  return Boolean(
    routeReady &&
      isAuthenticated &&
      profileLoaded &&
      AUTH_RECONCILIATION_SCREENS.has(screen)
  );
}

module.exports = {
  resolveAuthenticatedRoute,
  shouldReconcileAuthenticatedRoute,
};
