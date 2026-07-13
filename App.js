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
import { colors } from './src/theme';

function AppContent() {
  const { initializing, profile, syncProgress, isAuthenticated } = useAuth();
  const [screen, setScreen] = useState(null);
  const [userLanguage, setUserLanguage] = useState('english');
  const [selectedCourse, setSelectedCourse] = useState('patois');
  const [onboardingDraft, setOnboardingDraft] = useState(null);
  const [routeReady, setRouteReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function chooseInitialRoute() {
      if (initializing) {
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
        const course = profile?.currentCourse || 'patois';
        if (!cancelled) {
          setSelectedCourse(course);
          setScreen('home');
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
  }, [initializing, isAuthenticated, profile?.currentCourse]);

  async function finishSplash() {
    await AsyncStorage.setItem('hasSeenSplash', 'true');
    setScreen('welcome');
  }

  useEffect(() => {
    if (initializing || !routeReady || screen !== 'splash') {
      return;
    }

    if (isAuthenticated) {
      setSelectedCourse(profile?.currentCourse || 'patois');
      setScreen('home');
    }
  }, [initializing, isAuthenticated, profile?.currentCourse, routeReady, screen]);

  const handleHeartsSync = useCallback(
    (hearts) => {
      if (isAuthenticated) {
        syncProgress({ hearts });
      }
    },
    [isAuthenticated, syncProgress]
  );

  function goToPostAuthFlow(profileOverride) {
    const activeProfile = profileOverride || profile;
    if (onboardingDraft?.currentCourse) {
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
      setSelectedCourse(activeProfile.currentCourse);
      setScreen('home');
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
    <GameProvider profileHearts={profile?.hearts} onHeartsSync={handleHeartsSync}>
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
          onSuccess={goToPostAuthFlow}
          onSignUp={() => setScreen('signup')}
        />
      ) : null}

      {screen === 'signup' ? (
        <SignUpScreen
          onBack={() => setScreen(onboardingDraft ? 'account-choice' : 'login')}
          onSuccess={goToPostAuthFlow}
          onSignIn={() => {
            setOnboardingDraft(null);
            setScreen('login');
          }}
          onboardingData={onboardingDraft}
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
