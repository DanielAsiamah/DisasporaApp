import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { GameProvider } from './src/context/GameContext';
import CourseSelectScreen from './src/screens/CourseSelectScreen';
import HomeScreen from './src/screens/HomeScreen';
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
import { coursesData } from './src/data/generatedCourses';

const normaliseCourseId = (courseId) => (courseId === 'belize' ? 'belizean' : courseId || 'patois');
const courseHasLessons = (courseId) => Boolean(courseId) && coursesData[normaliseCourseId(courseId)]?.units?.some(
  (unit) => unit.lessons?.length > 0
) === true;
const courseBaseLanguage = (courseId) => {
  if (['haitian', 'nouchi', 'wolof'].includes(courseId)) return 'french';
  if (['sudanese', 'nubian'].includes(courseId)) return 'arabic';
  return 'english';
};

function AppContent() {
  const { initializing, profile, syncProgress, isAuthenticated, user } = useAuth();
  const [screen, setScreen] = useState(null);
  const [userLanguage, setUserLanguage] = useState('english');
  const [selectedCourse, setSelectedCourse] = useState('patois');
  const [onboardingDraft, setOnboardingDraft] = useState(null);
  const [pendingSignup, setPendingSignup] = useState(null);
  const [resetEmail, setResetEmail] = useState('');
  const [routeReady, setRouteReady] = useState(false);

  useEffect(() => {
    configureNotificationHandler().catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function chooseInitialRoute() {
      if (initializing || routeReady) {
        return;
      }

      if (isAuthenticated) {
        if (profile?.onboardingCompleted === false) {
          if (!cancelled) {
            setScreen('guided-onboarding');
            setRouteReady(true);
          }
          return;
        }
        const course = normaliseCourseId(profile?.currentCourse);
        if (!cancelled) {
          if (courseHasLessons(course)) {
            setSelectedCourse(course);
            setScreen('home');
          } else {
            setUserLanguage(courseBaseLanguage(course));
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
  }, [initializing, isAuthenticated, profile?.currentCourse, profile?.onboardingCompleted, routeReady]);

  async function finishSplash() {
    await AsyncStorage.setItem('hasSeenSplash', 'true');
    setScreen('welcome');
  }

  useEffect(() => {
    if (initializing || !routeReady || screen !== 'splash') {
      return;
    }

    if (isAuthenticated) {
      setSelectedCourse(normaliseCourseId(profile?.currentCourse));
      setScreen('home');
    }
  }, [initializing, isAuthenticated, profile?.currentCourse, routeReady, screen]);

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

  function goToPostAuthFlow(profileOverride) {
    const activeProfile = profileOverride || profile;
    const reminderSource = onboardingDraft || activeProfile;
    if (reminderSource?.reminderEnabled) {
      scheduleDailyReminder({
        time: reminderSource.reminderTime || '19:00',
        preferredName: reminderSource.preferredName || reminderSource.username || '',
        requestPermission: Boolean(onboardingDraft),
      }).catch(() => {});
    } else if (onboardingDraft?.reminderEnabled === false) {
      cancelDailyReminder().catch(() => {});
    }

    if (courseHasLessons(onboardingDraft?.currentCourse)) {
      setUserLanguage(onboardingDraft.baseLanguage || 'english');
      setSelectedCourse(onboardingDraft.currentCourse);
      AsyncStorage.removeItem('diaspora:onboarding-draft:v1').catch(() => {});
      setOnboardingDraft(null);
      setScreen('home');
      return;
    }

    if (activeProfile?.onboardingCompleted === false) {
      setScreen('guided-onboarding');
      return;
    }

    if (activeProfile?.currentCourse) {
      const course = normaliseCourseId(activeProfile.currentCourse);
      if (courseHasLessons(course)) {
        setSelectedCourse(course);
        setScreen('home');
      } else {
        setUserLanguage(courseBaseLanguage(course));
        setScreen('course-select');
      }
      return;
    }

    setScreen('language-select');
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
          onSignIn={() => setScreen('login')}
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
            setPendingSignup(result);
            setScreen('verify-email');
          }}
          onSignIn={() => {
            setOnboardingDraft(null);
            setScreen('login');
          }}
          onboardingData={onboardingDraft}
        />
      ) : null}

      {screen === 'verify-email' && pendingSignup ? (
        <EmailVerificationScreen
          email={pendingSignup.user?.email || ''}
          guideRegion={onboardingDraft?.guideRegion || 'caribbean'}
          verificationSent={pendingSignup.verificationSent}
          onContinue={() => {
            const signupProfile = pendingSignup.profile;
            setPendingSignup(null);
            goToPostAuthFlow(signupProfile);
          }}
        />
      ) : null}

      {screen === 'account-choice' ? (
        <AccountChoiceScreen
          onboardingData={onboardingDraft}
          onBack={() => setScreen('guided-onboarding')}
          onEmail={() => setScreen('signup')}
          onExistingAccount={() => {
            setOnboardingDraft(null);
            setScreen('login');
          }}
          onSuccess={goToPostAuthFlow}
        />
      ) : null}

      {screen === 'guided-onboarding' ? (
        <GuidedOnboardingScreen
          initialData={isAuthenticated ? profile : null}
          onBack={() => setScreen('welcome')}
          onComplete={async (draft) => {
            setOnboardingDraft(draft);
            setUserLanguage(draft.baseLanguage);
            setSelectedCourse(draft.currentCourse);
            if (isAuthenticated) {
              await syncProgress(draft);
              await AsyncStorage.removeItem('diaspora:onboarding-draft:v1');
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
          courseId={selectedCourse}
          onBack={() => setScreen('course-select')}
          onSignedOut={() => setScreen('welcome')}
        />
      ) : null}
    </GameProvider>
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
});
