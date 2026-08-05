import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { GameProvider } from './src/context/GameContext';
import CourseSelectScreen from './src/screens/CourseSelectScreen';
import HomeScreen from './src/screens/MvpHomeScreen';
import LanguageSelectScreen from './src/screens/LanguageSelectScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import SplashScreen from './src/screens/SplashScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import GuidedOnboardingScreen from './src/screens/GuidedOnboardingScreen';
import AccountChoiceScreen from './src/screens/AccountChoiceScreen';
import EmailVerificationScreen from './src/screens/EmailVerificationScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import {
  cancelDailyReminder,
  configureNotificationHandler,
  scheduleDailyReminder,
} from './src/services/reminderService';
import { colors } from './src/theme';
const {
  AVAILABLE_COURSE_IDS,
  getBaseLanguageForCourse,
  normalizeCourseId,
} = require('./src/data/courseCatalog.cjs');
const { resolveDeveloperPreviewCourseId } = require('./src/data/courseAccessPolicy.cjs');
const {
  resolveAuthenticatedRoute,
  shouldReconcileAuthenticatedRoute,
} = require('./src/onboarding/onboardingRoute');
const {
  getOnboardingBackAction,
  getOnboardingCompletionAction,
  shouldClearStoredOnboardingDraft,
  unpackAuthResult,
} = require('./src/onboarding/authHandoff');

const ONBOARDING_DRAFT_KEY = 'diaspora:onboarding-draft:v1';
const AVAILABLE_COURSE_ID_SET = new Set(AVAILABLE_COURSE_IDS);
const previewCourseId = resolveDeveloperPreviewCourseId({
  requestedCourseId: process.env.EXPO_PUBLIC_PREVIEW_COURSE_ID,
  isDevelopment: typeof __DEV__ !== 'undefined' && __DEV__ === true,
  previewOptIn: process.env.EXPO_PUBLIC_ENABLE_UNRELEASED_COURSE_PREVIEW === 'true',
});

function AppContent() {
  const {
    initializing,
    profile,
    profileLoaded,
    profileError,
    refreshProfile,
    signOut,
    syncProgress,
    isAuthenticated,
    user,
  } = useAuth();
  const [screen, setScreen] = useState(null);
  const [userLanguage, setUserLanguage] = useState('english');
  const [selectedCourse, setSelectedCourse] = useState('jamaican-patois');
  const [onboardingDraft, setOnboardingDraft] = useState(null);
  const [pendingSignup, setPendingSignup] = useState(null);
  const [resetEmail, setResetEmail] = useState('');
  const [routeReady, setRouteReady] = useState(false);

  useEffect(() => {
    configureNotificationHandler().catch(() => {});
  }, []);

  useEffect(() => {
    if (
      profileLoaded &&
      !profileError &&
      shouldClearStoredOnboardingDraft(profile)
    ) {
      AsyncStorage.removeItem(ONBOARDING_DRAFT_KEY).catch(() => {});
    }
  }, [profile?.onboardingCompleted, profileError, profileLoaded]);

  useEffect(() => {
    let cancelled = false;

    async function chooseInitialRoute() {
      if (initializing || routeReady || (isAuthenticated && !profileLoaded)) {
        return;
      }

      if (isAuthenticated) {
        const authenticatedRoute = resolveAuthenticatedRoute({
          profileLoaded,
          profile,
          profileError,
          knownCourseIds: AVAILABLE_COURSE_ID_SET,
        });
        if (!authenticatedRoute) return;

        if (authenticatedRoute === 'profile-error') {
          if (!cancelled) {
            setScreen('profile-error');
            setRouteReady(true);
          }
          return;
        }

        if (authenticatedRoute === 'guided-onboarding') {
          if (!cancelled) {
            setScreen('guided-onboarding');
            setRouteReady(true);
          }
          return;
        }
        const course = normalizeCourseId(profile?.currentCourse);
        if (!cancelled) {
          if (authenticatedRoute === 'home') {
            setUserLanguage(profile?.baseLanguage || getBaseLanguageForCourse(course));
            setSelectedCourse(course);
            setScreen('home');
          } else {
            setUserLanguage(profile?.baseLanguage || 'english');
            setScreen('course-select');
          }
          setRouteReady(true);
        }
        return;
      }

      const hasSeenSplash = await AsyncStorage.getItem('hasSeenSplash');
      if (!cancelled) {
        setScreen(hasSeenSplash === 'true' ? 'welcome' : 'splash');
        setRouteReady(true);
      }
    }

    chooseInitialRoute();

    return () => {
      cancelled = true;
    };
  }, [initializing, isAuthenticated, profile?.baseLanguage, profile?.currentCourse, profile?.onboardingCompleted, profileError, profileLoaded, routeReady]);

  async function finishSplash() {
    await AsyncStorage.setItem('hasSeenSplash', 'true');
    setScreen('welcome');
  }

  useEffect(() => {
    const shouldReconcile = shouldReconcileAuthenticatedRoute({
      routeReady,
      isAuthenticated,
      profileLoaded,
      screen,
    });
    if (initializing || !shouldReconcile) {
      return;
    }

    const authenticatedRoute = resolveAuthenticatedRoute({
      profileLoaded,
      profile,
      profileError,
      knownCourseIds: AVAILABLE_COURSE_ID_SET,
    });
    if (!authenticatedRoute) return;

    if (authenticatedRoute === 'profile-error') {
      setScreen('profile-error');
    } else if (authenticatedRoute === 'guided-onboarding') {
      setScreen('guided-onboarding');
    } else if (authenticatedRoute === 'home') {
      const course = normalizeCourseId(profile.currentCourse);
      setUserLanguage(profile?.baseLanguage || getBaseLanguageForCourse(course));
      setSelectedCourse(course);
      setScreen('home');
    } else {
      setUserLanguage(profile?.baseLanguage || 'english');
      setScreen('course-select');
    }
  }, [initializing, isAuthenticated, profile?.baseLanguage, profile?.currentCourse, profile?.onboardingCompleted, profileError, profileLoaded, routeReady, screen]);

  useEffect(() => {
    const authenticatedScreens = ['home', 'course-select', 'language-select', 'verify-email'];
    if (routeReady && !initializing && !isAuthenticated && authenticatedScreens.includes(screen)) {
      setOnboardingDraft(null);
      setPendingSignup(null);
      setScreen('welcome');
    }
  }, [initializing, isAuthenticated, routeReady, screen]);

  const handleHeartsSync = useCallback(
    (heartProgress) => {
      if (isAuthenticated) {
        syncProgress(heartProgress).catch(() => {});
      }
    },
    [isAuthenticated, syncProgress]
  );

  function goToExistingAccountSignIn() {
    setScreen('login');
  }

  async function goToPostAuthFlow(resultOrProfile) {
    const authValue = arguments.length > 0 ? resultOrProfile : profile;
    const { profile: activeProfile, handoff } = unpackAuthResult(authValue);

    if (shouldClearStoredOnboardingDraft(activeProfile)) {
      await AsyncStorage.removeItem(ONBOARDING_DRAFT_KEY).catch(() => {});
      setOnboardingDraft(null);
    }

    if (activeProfile?.reminderEnabled) {
      scheduleDailyReminder({
        time: activeProfile.reminderTime || '19:00',
        preferredName: activeProfile.preferredName || activeProfile.username || '',
        requestPermission: handoff?.onboardingDraftApplied === true,
      }).catch(() => {});
    } else if (activeProfile?.reminderEnabled === false) {
      cancelDailyReminder().catch(() => {});
    }

    const authenticatedRoute = resolveAuthenticatedRoute({
      profileLoaded: true,
      profile: activeProfile,
      profileError: null,
      knownCourseIds: AVAILABLE_COURSE_ID_SET,
    });
    if (!authenticatedRoute) return;

    if (authenticatedRoute === 'guided-onboarding') {
      setScreen('guided-onboarding');
      return;
    }

    if (authenticatedRoute === 'home') {
      const course = normalizeCourseId(activeProfile.currentCourse);
      setUserLanguage(activeProfile.baseLanguage || getBaseLanguageForCourse(course));
      setSelectedCourse(course);
      setScreen('home');
      return;
    }

    setUserLanguage(activeProfile?.baseLanguage || 'english');
    setScreen('course-select');
  }

  if (initializing || !routeReady || !screen) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <GameProvider
      userId={user?.uid}
      profileHearts={profile?.hearts}
      profileNextHeartAt={profile?.nextHeartAt}
      profileHeartsUpdatedAt={profile?.heartsUpdatedAt}
      onHeartsSync={handleHeartsSync}
    >
      {screen === 'splash' ? <SplashScreen onFinish={finishSplash} /> : null}

      {screen === 'welcome' ? (
        <WelcomeScreen
          onGetStarted={() => setScreen('guided-onboarding')}
          onSignIn={goToExistingAccountSignIn}
        />
      ) : null}

      {screen === 'profile-error' ? (
        <ProfileLoadErrorScreen
          onRetry={() => {
            refreshProfile().catch(() => {});
          }}
        />
      ) : null}

      {screen === 'login' ? (
        <LoginScreen
          onBack={() => setScreen('welcome')}
          onForgotPassword={(email) => {
            setResetEmail(email);
            setScreen('forgot-password');
          }}
          onSuccess={goToPostAuthFlow}
          onSignUp={() => {
            setOnboardingDraft(null);
            setScreen('guided-onboarding');
          }}
        />
      ) : null}

      {screen === 'forgot-password' ? (
        <ForgotPasswordScreen initialEmail={resetEmail} onBack={() => setScreen('login')} />
      ) : null}

      {screen === 'signup' ? (
        <SignUpScreen
          onBack={() => setScreen(onboardingDraft ? 'account-choice' : 'login')}
          onSuccess={(result) => {
            if (shouldClearStoredOnboardingDraft(result.profile)) {
              AsyncStorage.removeItem(ONBOARDING_DRAFT_KEY).catch(() => {});
            }
            setPendingSignup(result);
            setScreen('verify-email');
          }}
          onSignIn={goToExistingAccountSignIn}
          onboardingData={onboardingDraft}
        />
      ) : null}

      {screen === 'verify-email' && pendingSignup ? (
        <EmailVerificationScreen
          email={pendingSignup.user?.email || ''}
          guideRegion={onboardingDraft?.guideRegion || 'caribbean'}
          verificationSent={pendingSignup.verificationSent}
          onContinue={() => {
            const signupResult = pendingSignup;
            setPendingSignup(null);
            goToPostAuthFlow(signupResult);
          }}
        />
      ) : null}

      {screen === 'account-choice' ? (
        <AccountChoiceScreen
          onboardingData={onboardingDraft}
          onBack={() => setScreen('guided-onboarding')}
          onEmail={() => setScreen('signup')}
          onExistingAccount={goToExistingAccountSignIn}
          onSuccess={goToPostAuthFlow}
        />
      ) : null}

      {screen === 'guided-onboarding' ? (
        <GuidedOnboardingScreen
          initialData={isAuthenticated ? profile : null}
          backAccessibilityLabel={
            isAuthenticated ? 'Sign out and go back' : 'Go back'
          }
          onBack={async () => {
            const backAction = getOnboardingBackAction({ isAuthenticated });
            if (backAction === 'sign-out-and-welcome') {
              try {
                await signOut();
              } catch {
                return;
              }
            }
            setScreen('welcome');
          }}
          onComplete={async (draft) => {
            const completionAction = getOnboardingCompletionAction({
              isAuthenticated,
              profileLoaded,
              profileError,
              profile,
            });

            if (completionAction === 'wait-for-profile') {
              throw new Error('Your saved profile is still loading. Please try again.');
            }
            if (completionAction === 'profile-error') {
              setScreen('profile-error');
              throw new Error('Your saved profile could not be verified.');
            }
            if (completionAction === 'use-durable-profile') {
              await goToPostAuthFlow(profile);
              return;
            }

            setOnboardingDraft(draft);
            setUserLanguage(draft.baseLanguage);
            setSelectedCourse(draft.currentCourse);
            if (completionAction === 'persist-draft') {
              await syncProgress(draft);
              if (draft.reminderEnabled) {
                await scheduleDailyReminder({
                  time: draft.reminderTime || '19:00',
                  preferredName: draft.preferredName || '',
                  requestPermission: true,
                }).catch(() => {});
              } else {
                await cancelDailyReminder().catch(() => {});
              }
              await AsyncStorage.removeItem(ONBOARDING_DRAFT_KEY);
              setOnboardingDraft(null);
              setScreen('home');
            } else {
              setScreen('account-choice');
            }
          }}
        />
      ) : null}

      {screen === 'language-select' ? (
        <LanguageSelectScreen
          onSelectLanguage={(lang) => {
            setUserLanguage(lang);
            setScreen('course-select');
          }}
          onBack={() => setScreen('welcome')}
        />
      ) : null}

      {screen === 'course-select' ? (
        <CourseSelectScreen
          userLanguage={userLanguage}
          onSelectCourse={(courseId) => {
            setSelectedCourse(courseId);
            if (isAuthenticated) {
              syncProgress({ currentCourse: courseId, currentLesson: null });
            }
            setScreen('home');
          }}
          onBack={() => setScreen('language-select')}
        />
      ) : null}

      {screen === 'home' ? (
        <HomeScreen
          userLanguage={userLanguage}
          courseId={previewCourseId || selectedCourse}
          previewCourseId={previewCourseId}
          onBack={() => setScreen('course-select')}
          onSignedOut={() => setScreen('welcome')}
        />
      ) : null}
    </GameProvider>
  );
}

function ProfileLoadErrorScreen({ onRetry }) {
  return (
    <View accessibilityLiveRegion="polite" style={styles.profileErrorRoot}>
      <Text style={styles.profileErrorTitle}>We couldn&apos;t load your progress</Text>
      <Text style={styles.profileErrorBody}>
        Your saved learning path is still protected. Check your connection and try again.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        style={({ pressed }) => [
          styles.profileErrorButton,
          pressed && styles.profileErrorButtonPressed,
        ]}
      >
        <Text style={styles.profileErrorButtonText}>TRY AGAIN</Text>
      </Pressable>
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    backgroundColor: colors.splash,
    flex: 1,
    justifyContent: 'center',
  },
  profileErrorRoot: {
    alignItems: 'center',
    backgroundColor: colors.splash,
    flex: 1,
    gap: 16,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  profileErrorTitle: {
    color: colors.text,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 26,
    lineHeight: 34,
    textAlign: 'center',
  },
  profileErrorBody: {
    color: colors.textMuted,
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 15,
    lineHeight: 23,
    maxWidth: 360,
    textAlign: 'center',
  },
  profileErrorButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 16,
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 54,
    paddingHorizontal: 36,
  },
  profileErrorButtonPressed: {
    opacity: 0.85,
    transform: [{ translateY: 1 }],
  },
  profileErrorButtonText: {
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 14,
    letterSpacing: 0.6,
  },
});
