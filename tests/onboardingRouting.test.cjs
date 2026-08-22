const assert = require('node:assert/strict');
const test = require('node:test');

let routing = {};
try {
  routing = require('../src/onboarding/onboardingRoute');
} catch (error) {
  if (error.code !== 'MODULE_NOT_FOUND') throw error;
}

let authHandoff = {};
try {
  authHandoff = require('../src/onboarding/authHandoff');
} catch (error) {
  if (error.code !== 'MODULE_NOT_FOUND') throw error;
}

const resolveAuthenticatedRoute = routing.resolveAuthenticatedRoute || (() => undefined);
const shouldReconcileAuthenticatedRoute =
  routing.shouldReconcileAuthenticatedRoute || (() => undefined);
const planSocialProfileHandoff =
  authHandoff.planSocialProfileHandoff || (() => undefined);
const unpackAuthResult = authHandoff.unpackAuthResult || (() => undefined);
const shouldClearStoredOnboardingDraft =
  authHandoff.shouldClearStoredOnboardingDraft || (() => undefined);
const getStartingLevelLabel =
  authHandoff.getStartingLevelLabel || (() => undefined);
const createProfileLoadGate =
  authHandoff.createProfileLoadGate || (() => undefined);
const beginAuthenticatedProfileHandoff =
  authHandoff.beginAuthenticatedProfileHandoff || (() => undefined);
const getOnboardingCompletionAction =
  authHandoff.getOnboardingCompletionAction || (() => undefined);
const getOnboardingBackAction =
  authHandoff.getOnboardingBackAction || (() => undefined);
const filterCompletedProfileMergeFields =
  authHandoff.filterCompletedProfileMergeFields || (() => undefined);
const getEnsurePreferredName =
  authHandoff.getEnsurePreferredName || (() => undefined);
const runAuthBoundProfileTask =
  authHandoff.runAuthBoundProfileTask || (() => undefined);
const assertCurrentAuthHandoff =
  authHandoff.assertCurrentAuthHandoff || (() => undefined);
const { AVAILABLE_COURSE_IDS, COURSE_CATALOG } = require('../src/data/courseCatalog.cjs');
const knownCourseIds = new Set(AVAILABLE_COURSE_IDS);

function resolve(profileLoaded, profile, profileError = null) {
  return resolveAuthenticatedRoute({
    profileLoaded,
    profile,
    profileError,
    knownCourseIds,
  });
}

test('does not resolve an authenticated route before the profile has loaded', () => {
  assert.equal(
    resolve(false, { onboardingCompleted: true, currentCourse: 'patois' }),
    null
  );
});

test('routes a resolved missing profile into guided onboarding', () => {
  for (const profile of [undefined, null]) {
    assert.equal(resolve(true, profile), 'guided-onboarding');
  }
});

test('routes a Firestore profile read failure to a safe error state instead of onboarding', () => {
  assert.equal(
    resolve(true, null, new Error('Firestore unavailable')),
    'profile-error'
  );
});

test('routes an incomplete profile into guided onboarding', () => {
  assert.equal(
    resolve(true, { onboardingCompleted: false, currentCourse: 'patois' }),
    'guided-onboarding'
  );
});

test('normalizes the legacy Patois ID before routing home', () => {
  assert.equal(
    resolve(true, { onboardingCompleted: true, currentCourse: 'patois' }),
    'home'
  );
});

test('routes the canonical published Patois course home', () => {
  assert.equal(
    resolve(true, { onboardingCompleted: true, currentCourse: 'jamaican-patois' }),
    'home'
  );
});

test('routes every currently unavailable course to course selection', () => {
  for (const currentCourse of COURSE_CATALOG.filter(({ available }) => !available).map(({ id }) => id)) {
    assert.equal(
      resolve(true, { onboardingCompleted: true, currentCourse }),
      'course-select'
    );
  }
});

test('routes every currently available canonical course home', () => {
  for (const currentCourse of AVAILABLE_COURSE_IDS) {
    assert.equal(
      resolve(true, { onboardingCompleted: true, currentCourse }),
      'home'
    );
  }
});

test('routes a completed profile with an unknown course to course selection', () => {
  assert.equal(
    resolve(true, { onboardingCompleted: true, currentCourse: 'stale-course' }),
    'course-select'
  );
});

test('routes a completed profile without a course to course selection', () => {
  assert.equal(
    resolve(true, { onboardingCompleted: true, currentCourse: null }),
    'course-select'
  );
});

function shouldReconcile(screen, overrides = {}) {
  return shouldReconcileAuthenticatedRoute({
    routeReady: true,
    isAuthenticated: true,
    profileLoaded: true,
    screen,
    ...overrides,
  });
}

test('reconciles late authenticated profile state from guest entry screens', () => {
  for (const screen of ['splash', 'welcome']) {
    assert.equal(shouldReconcile(screen), true);
  }
});

test('does not hijack an intentional active screen during auth reconciliation', () => {
  for (const screen of ['login', 'course-select', 'home']) {
    assert.equal(shouldReconcile(screen), false);
  }
});

test('reconciles late authentication after a guest has just entered onboarding', () => {
  assert.equal(shouldReconcile('guided-onboarding'), true);
});

test('reconciles a successful profile retry from the profile error screen', () => {
  assert.equal(shouldReconcile('profile-error'), true);
});

test('waits for route, authentication, and profile readiness before reconciling', () => {
  assert.equal(shouldReconcile('welcome', { routeReady: false }), false);
  assert.equal(shouldReconcile('welcome', { isAuthenticated: false }), false);
  assert.equal(shouldReconcile('welcome', { profileLoaded: false }), false);
});

const completedGuestDraft = {
  preferredName: 'New name',
  baseLanguage: 'english',
  currentCourse: 'jamaican-patois',
  onboardingCompleted: true,
  reminderEnabled: true,
  reminderTime: '19:00',
};

test('preserves an existing completed social profile without writing guest onboarding fields', () => {
  const existingProfile = {
    id: 'uid-1',
    preferredName: 'Existing learner',
    currentCourse: 'swahili',
    onboardingCompleted: true,
  };

  const plan = planSocialProfileHandoff({
    existingProfile,
    onboardingData: completedGuestDraft,
  });

  assert.deepEqual(plan, {
    accountState: 'existing-completed',
    onboardingDraftApplied: false,
    profileFields: null,
    profile: existingProfile,
    shouldWriteProfile: false,
  });
});

test('allows a completed guest draft to initialize new and incomplete social profiles', () => {
  for (const existingProfile of [
    null,
    { id: 'uid-2', onboardingCompleted: false, currentCourse: null },
  ]) {
    const plan = planSocialProfileHandoff({
      existingProfile,
      onboardingData: completedGuestDraft,
    });

    assert.equal(plan.shouldWriteProfile, true);
    assert.equal(plan.onboardingDraftApplied, true);
    assert.equal(plan.profileFields, completedGuestDraft);
    assert.equal(
      plan.accountState,
      existingProfile ? 'existing-incomplete' : 'new'
    );
  }
});

test('does not apply an unfinished guest draft during social sign-in', () => {
  const plan = planSocialProfileHandoff({
    existingProfile: null,
    onboardingData: {
      ...completedGuestDraft,
      onboardingCompleted: false,
    },
  });

  assert.equal(plan.shouldWriteProfile, true);
  assert.equal(plan.onboardingDraftApplied, false);
  assert.deepEqual(plan.profileFields, {});
});

test('unpacks explicit social handoff metadata without treating it as the profile', () => {
  const profile = { id: 'uid-1', onboardingCompleted: true };
  const handoff = {
    accountState: 'existing-completed',
    onboardingDraftApplied: false,
  };

  assert.deepEqual(unpackAuthResult({ profile, handoff, user: { uid: 'uid-1' } }), {
    profile,
    handoff,
  });
  assert.deepEqual(unpackAuthResult(profile), { profile, handoff: null });
});

test('clears a stored draft only after durable onboarding completion is known', () => {
  assert.equal(
    shouldClearStoredOnboardingDraft({ onboardingCompleted: true }),
    true
  );
  assert.equal(
    shouldClearStoredOnboardingDraft({ onboardingCompleted: false }),
    false
  );
  assert.equal(shouldClearStoredOnboardingDraft(null), false);
});

test('summarizes current and legacy starting-level ids accurately', () => {
  assert.equal(getStartingLevelLabel('new'), 'Beginner start');
  assert.equal(getStartingLevelLabel('some'), 'Basics refresher');
  assert.equal(getStartingLevelLabel('conversational'), 'Conversational start');
  assert.equal(getStartingLevelLabel('beginner'), 'Beginner start');
  assert.equal(getStartingLevelLabel('comfortable'), 'Conversational start');
  assert.equal(getStartingLevelLabel('unknown'), 'Beginner start');
});

test('prevents stale auth-listener profile reads from overwriting an explicit auth handoff', () => {
  const gate = createProfileLoadGate();
  const staleListenerRequest = gate.beginBackground();
  const explicitAuthRequest = gate.beginExclusive();

  assert.equal(gate.isCurrent(staleListenerRequest), false);
  assert.equal(gate.beginBackground(), null);
  assert.equal(gate.isCurrent(explicitAuthRequest), true);

  gate.endExclusive(explicitAuthRequest);
  const nextListenerRequest = gate.beginBackground();
  assert.notEqual(nextListenerRequest, null);
  assert.equal(gate.isCurrent(nextListenerRequest), true);
});

test('an external account change supersedes an exclusive read for the previous account', () => {
  const gate = createProfileLoadGate();
  const accountARefresh = gate.beginExclusive('account-a');

  assert.equal(gate.beginBackground('account-a'), null);

  const accountBListener = gate.beginBackground('account-b');
  assert.notEqual(accountBListener, null);
  assert.equal(gate.isCurrent(accountARefresh), false);
  assert.equal(gate.isCurrent(accountBListener), true);
});

test('a delayed profile mutation cannot publish account A data after account B takes over', async () => {
  let currentUserId = 'account-a';
  let resolveTask;
  let published = null;
  const task = new Promise((resolve) => { resolveTask = resolve; });

  const pending = runAuthBoundProfileTask({
    getCurrentUserId: () => currentUserId,
    onCurrentResult: (result) => { published = result; },
    task: () => task,
    userId: 'account-a',
  });
  currentUserId = 'account-b';
  resolveTask({ preferredName: 'Account A' });

  await assert.rejects(pending, (error) => error?.code === 'account-changed');
  assert.equal(published, null);
});

test('a superseded explicit auth handoff cannot return its stale account profile', () => {
  const gate = createProfileLoadGate();
  const accountARequest = gate.beginExclusive('account-a');
  gate.beginBackground('account-b');

  assert.throws(
    () => assertCurrentAuthHandoff({
      gate,
      getCurrentUserId: () => 'account-b',
      requestId: accountARequest,
      userId: 'account-a',
    }),
    (error) => error?.code === 'account-changed'
  );
});

test('does not invalidate profile loading until credential or provider auth succeeds', () => {
  const gate = createProfileLoadGate();
  const existingProfileRead = gate.beginBackground();

  assert.equal(beginAuthenticatedProfileHandoff(gate, null), null);
  assert.equal(gate.isCurrent(existingProfileRead), true);

  const authenticatedHandoff = beginAuthenticatedProfileHandoff(gate, {
    uid: 'uid-1',
  });
  assert.notEqual(authenticatedHandoff, null);
  assert.equal(gate.isCurrent(existingProfileRead), false);
  assert.equal(gate.isCurrent(authenticatedHandoff), true);
});

test('refuses authenticated onboarding writes until the durable profile is resolved', () => {
  assert.equal(
    getOnboardingCompletionAction({
      isAuthenticated: true,
      profileLoaded: false,
      profile: null,
      profileError: null,
    }),
    'wait-for-profile'
  );
  assert.equal(
    getOnboardingCompletionAction({
      isAuthenticated: true,
      profileLoaded: true,
      profile: null,
      profileError: new Error('Firestore unavailable'),
    }),
    'profile-error'
  );
});

test('routes an already completed account from its durable profile without applying the guest draft', () => {
  assert.equal(
    getOnboardingCompletionAction({
      isAuthenticated: true,
      profileLoaded: true,
      profile: { onboardingCompleted: true, currentCourse: 'swahili' },
      profileError: null,
    }),
    'use-durable-profile'
  );
  assert.equal(
    getOnboardingCompletionAction({
      isAuthenticated: true,
      profileLoaded: true,
      profile: { onboardingCompleted: false },
      profileError: null,
    }),
    'persist-draft'
  );
  assert.equal(
    getOnboardingCompletionAction({ isAuthenticated: false }),
    'request-account'
  );
});

test('protects onboarding fields when ensure encounters an existing completed profile', () => {
  const fields = {
    onboardingCompleted: true,
    preferredName: 'Guest name',
    baseLanguage: 'english',
    currentCourse: 'jamaican-patois',
    motivation: 'heritage',
    dailyGoalMinutes: 10,
    reminderEnabled: true,
    emailVerified: true,
    hearts: 4,
  };

  assert.deepEqual(
    filterCompletedProfileMergeFields(
      { onboardingCompleted: true, currentCourse: 'swahili' },
      fields
    ),
    { emailVerified: true, hearts: 4 }
  );
  assert.deepEqual(
    filterCompletedProfileMergeFields(
      { onboardingCompleted: false },
      fields
    ),
    fields
  );
});

test('does not reintroduce a guest name while ensuring a completed profile', () => {
  assert.equal(
    getEnsurePreferredName({
      existingProfile: {
        onboardingCompleted: true,
        username: 'Existing learner',
      },
      safeProfileFields: {},
      incomingUsername: 'Guest learner',
    }),
    'Existing learner'
  );
  assert.equal(
    getEnsurePreferredName({
      existingProfile: { onboardingCompleted: true },
      safeProfileFields: {},
      incomingUsername: 'Guest learner',
    }),
    undefined
  );
  assert.equal(
    getEnsurePreferredName({
      existingProfile: { onboardingCompleted: false },
      safeProfileFields: { preferredName: 'New learner' },
      incomingUsername: 'Guest learner',
    }),
    'New learner'
  );
});

test('authenticated onboarding Back signs out while guest Back only returns to Welcome', () => {
  assert.equal(
    getOnboardingBackAction({ isAuthenticated: true }),
    'sign-out-and-welcome'
  );
  assert.equal(
    getOnboardingBackAction({ isAuthenticated: false }),
    'welcome'
  );
});
