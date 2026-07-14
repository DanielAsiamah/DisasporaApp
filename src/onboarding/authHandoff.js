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

  return {
    beginBackground() {
      if (exclusiveRequest !== null) return null;
      latestRequest += 1;
      return latestRequest;
    },
    beginExclusive() {
      latestRequest += 1;
      exclusiveRequest = latestRequest;
      return exclusiveRequest;
    },
    endExclusive(requestId) {
      if (exclusiveRequest === requestId) {
        exclusiveRequest = null;
      }
    },
    isCurrent(requestId) {
      return requestId !== null && requestId === latestRequest;
    },
  };
}

function beginAuthenticatedProfileHandoff(gate, firebaseUser) {
  if (!firebaseUser?.uid) return null;
  return gate.beginExclusive();
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
  beginAuthenticatedProfileHandoff,
  createProfileLoadGate,
  filterCompletedProfileMergeFields,
  getEnsurePreferredName,
  getOnboardingBackAction,
  getOnboardingCompletionAction,
  getStartingLevelLabel,
  planSocialProfileHandoff,
  shouldClearStoredOnboardingDraft,
  unpackAuthResult,
};
