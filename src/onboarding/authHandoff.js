'use strict';

const STARTING_LEVEL_LABELS = {
  beginner: 'Beginner start',
  comfortable: 'Conversational start',
  conversational: 'Conversational start',
  new: 'Beginner start',
  some: 'Basics refresher',
};

const ONBOARDING_PROFILE_FIELDS = new Set([
  'baseLanguage',
  'baseLanguageLevels',
  'currentCourse',
  'currentLesson',
  'dailyGoalMinutes',
  'guideRegion',
  'motivation',
  'onboardingCompleted',
  'preferredName',
  'proficiencyLevel',
  'recommendedStartUnit',
  'reminderEnabled',
  'reminderTime',
  'selectedStartUnit',
  'soundEffectsEnabled',
]);

function getStartingLevelLabel(levelId) {
  return STARTING_LEVEL_LABELS[levelId] || 'Beginner start';
}

function createProfileLoadGate() {
  let latestRequest = 0;
  let exclusiveRequest = null;
  let exclusiveIdentity;

  return {
    beginBackground(identity) {
      if (exclusiveRequest !== null) {
        const identityWasProvided = arguments.length > 0;
        if (!identityWasProvided || identity === exclusiveIdentity) return null;
        exclusiveRequest = null;
        exclusiveIdentity = undefined;
      }
      latestRequest += 1;
      return latestRequest;
    },
    beginExclusive(identity) {
      latestRequest += 1;
      exclusiveRequest = latestRequest;
      exclusiveIdentity = arguments.length > 0 ? identity : undefined;
      return exclusiveRequest;
    },
    endExclusive(requestId) {
      if (exclusiveRequest === requestId) {
        exclusiveRequest = null;
        exclusiveIdentity = undefined;
      }
    },
    isCurrent(requestId) {
      return requestId !== null && requestId === latestRequest;
    },
  };
}

function beginAuthenticatedProfileHandoff(gate, firebaseUser) {
  if (!firebaseUser?.uid) return null;
  return gate.beginExclusive(firebaseUser.uid);
}

function createAccountChangedError() {
  const error = new Error('The authenticated account changed while this request was running.');
  error.code = 'account-changed';
  return error;
}

function assertCurrentAuthIdentity({ getCurrentUserId, userId } = {}) {
  if (typeof getCurrentUserId !== 'function' || getCurrentUserId() !== userId) {
    throw createAccountChangedError();
  }
}

function assertCurrentAuthHandoff({ gate, getCurrentUserId, requestId, userId } = {}) {
  assertCurrentAuthIdentity({ getCurrentUserId, userId });
  if (!gate?.isCurrent(requestId)) {
    throw createAccountChangedError();
  }
}

async function runAuthBoundProfileTask({
  getCurrentUserId,
  onCurrentResult,
  task,
  userId,
} = {}) {
  if (typeof task !== 'function') throw new Error('An authenticated profile task is required.');
  const result = await task();
  assertCurrentAuthIdentity({ getCurrentUserId, userId });
  if (typeof onCurrentResult === 'function') onCurrentResult(result);
  return result;
}

function getOnboardingCompletionAction({
  isAuthenticated,
  profileLoaded,
  profileError,
  profile,
} = {}) {
  if (!isAuthenticated) return 'request-account';
  if (!profileLoaded) return 'wait-for-profile';
  if (profileError) return 'profile-error';
  if (profile?.onboardingCompleted === true) return 'use-durable-profile';
  return 'persist-draft';
}

function getOnboardingBackAction({ isAuthenticated } = {}) {
  return isAuthenticated ? 'sign-out-and-welcome' : 'welcome';
}

function filterCompletedProfileMergeFields(existingProfile, profileFields = {}) {
  if (existingProfile?.onboardingCompleted !== true) return profileFields;

  return Object.fromEntries(
    Object.entries(profileFields).filter(
      ([field]) => !ONBOARDING_PROFILE_FIELDS.has(field)
    )
  );
}

function getEnsurePreferredName({
  existingProfile,
  safeProfileFields = {},
  incomingUsername,
} = {}) {
  if (existingProfile?.onboardingCompleted === true) {
    return existingProfile.preferredName || existingProfile.username;
  }

  return (
    safeProfileFields.preferredName ||
    existingProfile?.preferredName ||
    incomingUsername
  );
}

function planSocialProfileHandoff({ existingProfile, onboardingData }) {
  if (existingProfile?.onboardingCompleted === true) {
    return {
      accountState: 'existing-completed',
      onboardingDraftApplied: false,
      profileFields: null,
      profile: existingProfile,
      shouldWriteProfile: false,
    };
  }

  const onboardingDraftApplied = onboardingData?.onboardingCompleted === true;
  return {
    accountState: existingProfile ? 'existing-incomplete' : 'new',
    onboardingDraftApplied,
    profileFields: onboardingDraftApplied ? onboardingData : {},
    profile: existingProfile || null,
    shouldWriteProfile: true,
  };
}

function unpackAuthResult(resultOrProfile) {
  if (
    resultOrProfile &&
    typeof resultOrProfile === 'object' &&
    Object.prototype.hasOwnProperty.call(resultOrProfile, 'profile')
  ) {
    return {
      profile: resultOrProfile.profile,
      handoff: resultOrProfile.handoff || null,
    };
  }

  return { profile: resultOrProfile, handoff: null };
}

function shouldClearStoredOnboardingDraft(profile) {
  return profile?.onboardingCompleted === true;
}

module.exports = {
  assertCurrentAuthHandoff,
  beginAuthenticatedProfileHandoff,
  createProfileLoadGate,
  filterCompletedProfileMergeFields,
  getEnsurePreferredName,
  getOnboardingBackAction,
  getOnboardingCompletionAction,
  getStartingLevelLabel,
  planSocialProfileHandoff,
  runAuthBoundProfileTask,
  shouldClearStoredOnboardingDraft,
  unpackAuthResult,
};
