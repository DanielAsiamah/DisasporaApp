import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import {
  signInWithEmail,
  signInWithAppleProvider,
  signInWithGoogleProvider,
  refreshEmailVerification,
  sendPasswordReset,
  sendVerificationEmail,
  signOutUser,
  signUpWithEmail,
  subscribeToAuthState,
} from '../services/auth/authService';
import {
  addAnswerToLessonSession,
  completeLessonSession,
  createLessonSession,
  createUserDocument,
  ensureUserDocument,
  getLanguageProgress,
  getUserDocument,
  setLanguageProgress,
  touchUserLastActive,
  updateUserProgress,
} from '../services/firestore/userService';
const {
  beginAuthenticatedProfileHandoff,
  createProfileLoadGate,
  planSocialProfileHandoff,
} = require('../onboarding/authHandoff');

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const profileLoadGateRef = useRef(null);
  if (!profileLoadGateRef.current) {
    profileLoadGateRef.current = createProfileLoadGate();
  }

  useEffect(() => {
    let active = true;
    const startupFallback = setTimeout(() => {
      if (active) setInitializing(false);
    }, 3500);

    const unsubscribe = subscribeToAuthState(async (firebaseUser) => {
      if (!active) return;

      const requestId = profileLoadGateRef.current.beginBackground();
      if (requestId === null) return;

      setProfileLoaded(false);
      setProfileError(null);
      setUser(firebaseUser);

      try {
        if (firebaseUser) {
          const document = await getUserDocument(firebaseUser.uid);
          if (!active || !profileLoadGateRef.current.isCurrent(requestId)) return;
          if (document) {
            await touchUserLastActive(firebaseUser.uid).catch(() => {});
          }
          if (active && profileLoadGateRef.current.isCurrent(requestId)) {
            setProfile(document);
          }
        } else {
          if (active && profileLoadGateRef.current.isCurrent(requestId)) {
            setProfile(null);
          }
        }
      } catch (error) {
        if (active && profileLoadGateRef.current.isCurrent(requestId)) {
          setProfile(null);
          setProfileError(error);
        }
      } finally {
        clearTimeout(startupFallback);
        if (active && profileLoadGateRef.current.isCurrent(requestId)) {
          setProfileLoaded(true);
          setInitializing(false);
        }
      }
    });

    return () => {
      active = false;
      clearTimeout(startupFallback);
      unsubscribe();
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setProfileError(null);
      setProfileLoaded(true);
      return null;
    }

    const requestId = profileLoadGateRef.current.beginExclusive();
    setProfileLoaded(false);
    setProfileError(null);
    try {
      const document = await getUserDocument(user.uid);
      if (profileLoadGateRef.current.isCurrent(requestId)) {
        setProfile(document);
      }
      return document;
    } catch (error) {
      if (profileLoadGateRef.current.isCurrent(requestId)) {
        setProfile(null);
        setProfileError(error);
      }
      throw error;
    } finally {
      if (profileLoadGateRef.current.isCurrent(requestId)) {
        setProfileLoaded(true);
      }
      profileLoadGateRef.current.endExclusive(requestId);
    }
  }, [user]);

  const signUp = useCallback(async ({ username, email, password, profileData = {} }) => {
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim().toLowerCase();
    let firebaseUser = null;
    let requestId = null;

    try {
      firebaseUser = await signUpWithEmail(trimmedEmail, password);
      requestId = beginAuthenticatedProfileHandoff(
        profileLoadGateRef.current,
        firebaseUser
      );
      setProfileLoaded(false);
      setProfileError(null);
      setUser(firebaseUser);
      const verificationSent = await sendVerificationEmail(firebaseUser)
        .then(() => true)
        .catch(() => false);
      const createdProfile = await createUserDocument(firebaseUser.uid, {
        username: trimmedUsername,
        email: trimmedEmail,
        emailVerified: firebaseUser.emailVerified,
        ...profileData,
        onboardingCompleted: profileData.onboardingCompleted ?? false,
      });

      const document = { id: firebaseUser.uid, ...createdProfile };
      if (profileLoadGateRef.current.isCurrent(requestId)) {
        setProfile(document);
      }
      return {
        user: firebaseUser,
        profile: document,
        verificationSent,
        handoff: {
          accountState: 'new',
          onboardingDraftApplied: profileData.onboardingCompleted === true,
        },
      };
    } catch (error) {
      if (firebaseUser && profileLoadGateRef.current.isCurrent(requestId)) {
        setProfile(null);
        setProfileError(error);
      }
      throw error;
    } finally {
      if (profileLoadGateRef.current.isCurrent(requestId)) {
        setProfileLoaded(true);
        setInitializing(false);
      }
      profileLoadGateRef.current.endExclusive(requestId);
    }
  }, []);

  const signIn = useCallback(async ({ email, password }) => {
    const trimmedEmail = email.trim().toLowerCase();
    let firebaseUser = null;
    let requestId = null;
    try {
      firebaseUser = await signInWithEmail(trimmedEmail, password);
      requestId = beginAuthenticatedProfileHandoff(
        profileLoadGateRef.current,
        firebaseUser
      );
      setProfileLoaded(false);
      setProfileError(null);
      setUser(firebaseUser);
      const document = await getUserDocument(firebaseUser.uid);
      if (profileLoadGateRef.current.isCurrent(requestId)) {
        setProfile(document);
      }
      return { user: firebaseUser, profile: document };
    } catch (error) {
      if (firebaseUser && profileLoadGateRef.current.isCurrent(requestId)) {
        setProfile(null);
        setProfileError(error);
      }
      throw error;
    } finally {
      if (profileLoadGateRef.current.isCurrent(requestId)) {
        setProfileLoaded(true);
        setInitializing(false);
      }
      profileLoadGateRef.current.endExclusive(requestId);
    }
  }, []);

  const finishSocialSignIn = useCallback(async ({ firebaseUser, preferredName, profileData, requestId }) => {
    setUser(firebaseUser);

    try {
      const existingProfile = await getUserDocument(firebaseUser.uid);
      const plan = planSocialProfileHandoff({
        existingProfile,
        onboardingData: profileData,
      });
      const document = plan.shouldWriteProfile
        ? await ensureUserDocument(firebaseUser.uid, {
            username:
              plan.profileFields.preferredName ||
              preferredName ||
              firebaseUser.displayName ||
              'Learner',
            email: firebaseUser.email || '',
            emailVerified: firebaseUser.emailVerified,
            ...plan.profileFields,
          })
        : plan.profile;

      if (profileLoadGateRef.current.isCurrent(requestId)) {
        setProfile(document);
      }
      return {
        user: firebaseUser,
        profile: document,
        handoff: {
          accountState: plan.accountState,
          onboardingDraftApplied: plan.onboardingDraftApplied,
        },
      };
    } catch (error) {
      if (profileLoadGateRef.current.isCurrent(requestId)) {
        setProfile(null);
        setProfileError(error);
      }
      throw error;
    }
  }, []);

  const signInWithGoogle = useCallback(async (profileData = {}) => {
    let requestId = null;
    try {
      const firebaseUser = await signInWithGoogleProvider();
      requestId = beginAuthenticatedProfileHandoff(
        profileLoadGateRef.current,
        firebaseUser
      );
      setProfileLoaded(false);
      setProfileError(null);
      return await finishSocialSignIn({
        firebaseUser,
        preferredName: firebaseUser.displayName,
        profileData,
        requestId,
      });
    } finally {
      if (profileLoadGateRef.current.isCurrent(requestId)) {
        setProfileLoaded(true);
        setInitializing(false);
      }
      profileLoadGateRef.current.endExclusive(requestId);
    }
  }, [finishSocialSignIn]);

  const signInWithApple = useCallback(async (profileData = {}) => {
    let requestId = null;
    try {
      const result = await signInWithAppleProvider();
      const firebaseUser = result.user;
      requestId = beginAuthenticatedProfileHandoff(
        profileLoadGateRef.current,
        firebaseUser
      );
      setProfileLoaded(false);
      setProfileError(null);
      return await finishSocialSignIn({
        firebaseUser,
        preferredName: result.preferredName || firebaseUser.displayName,
        profileData,
        requestId,
      });
    } finally {
      if (profileLoadGateRef.current.isCurrent(requestId)) {
        setProfileLoaded(true);
        setInitializing(false);
      }
      profileLoadGateRef.current.endExclusive(requestId);
    }
  }, [finishSocialSignIn]);

  const signOut = useCallback(async () => {
    const requestId = profileLoadGateRef.current.beginExclusive();
    try {
      await signOutUser();
      if (profileLoadGateRef.current.isCurrent(requestId)) {
        setUser(null);
        setProfile(null);
        setProfileError(null);
        setProfileLoaded(true);
      }
    } finally {
      profileLoadGateRef.current.endExclusive(requestId);
    }
  }, []);

  const requestPasswordReset = useCallback(async (email) => {
    await sendPasswordReset(email);
  }, []);

  const resendVerification = useCallback(async () => {
    await sendVerificationEmail(user);
  }, [user]);

  const checkEmailVerification = useCallback(async () => {
    const verified = await refreshEmailVerification(user);
    if (verified && user) {
      await updateUserProgress(user.uid, { emailVerified: true });
      setProfile((current) => (current ? { ...current, emailVerified: true } : current));
    }
    return verified;
  }, [user]);

  const syncProgress = useCallback(
    async (fields) => {
      if (!user) {
        return;
      }

      if (!profileLoaded) {
        throw new Error('Your saved profile is still loading. Please try again.');
      }

      if (profileError) {
        throw new Error('Your saved profile could not be verified. Retry before saving progress.');
      }

      if (
        profile?.onboardingCompleted === true &&
        fields?.onboardingCompleted === true
      ) {
        throw new Error('Onboarding is already complete for this account.');
      }

      if (profile) {
        await updateUserProgress(user.uid, fields);
        setProfile((current) => (current ? { ...current, ...fields } : current));
        return;
      }

      const document = await ensureUserDocument(user.uid, {
        username:
          fields.preferredName ||
          user.displayName ||
          user.email?.split('@')[0] ||
          'Learner',
        email: user.email || '',
        emailVerified: user.emailVerified,
        ...fields,
      });
      setProfile(document);
    },
    [profile, profileError, profileLoaded, user]
  );

  const loadLanguageProgress = useCallback(
    async (languageId) => {
      if (!user || !languageId) {
        return null;
      }

      return getLanguageProgress(user.uid, languageId);
    },
    [user]
  );

  const syncLanguageProgress = useCallback(
    async (languageId, fields) => {
      if (!user || !languageId) {
        return;
      }

      await setLanguageProgress(user.uid, languageId, fields);
    },
    [user]
  );

  const recordLessonSession = useCallback(
    async (fields) => {
      if (!user) {
        return null;
      }

      return createLessonSession(user.uid, fields);
    },
    [user]
  );

  const recordLessonAnswer = useCallback(
    async (sessionId, answer) => {
      if (!user || !sessionId) {
        return;
      }

      await addAnswerToLessonSession(user.uid, sessionId, answer);
    },
    [user]
  );

  const finishLessonSession = useCallback(
    async (sessionId, fields) => {
      if (!user || !sessionId) {
        return;
      }

      await completeLessonSession(user.uid, sessionId, fields);
    },
    [user]
  );

  const value = useMemo(
    () => ({
      user,
      profile,
      profileLoaded,
      profileError,
      initializing,
      isAuthenticated: Boolean(user),
      signUp,
      signIn,
      signInWithGoogle,
      signInWithApple,
      signOut,
      requestPasswordReset,
      resendVerification,
      checkEmailVerification,
      refreshProfile,
      syncProgress,
      loadLanguageProgress,
      syncLanguageProgress,
      recordLessonSession,
      recordLessonAnswer,
      finishLessonSession,
    }),
    [
      user,
      profile,
      profileLoaded,
      profileError,
      initializing,
      signUp,
      signIn,
      signInWithGoogle,
      signInWithApple,
      signOut,
      requestPasswordReset,
      resendVerification,
      checkEmailVerification,
      refreshProfile,
      syncProgress,
      loadLanguageProgress,
      syncLanguageProgress,
      recordLessonSession,
      recordLessonAnswer,
      finishLessonSession,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
