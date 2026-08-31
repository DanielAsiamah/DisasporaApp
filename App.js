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

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { isDevAccount } from './src/config/devConfig';
import { GameProvider } from './src/context/GameContext';
import CourseSelectScreen from './src/screens/CourseSelectScreen';
import HomeScreen from './src/screens/HomeScreen';
import LanguageSelectScreen from './src/screens/LanguageSelectScreen';
import LoginScreen from './src/screens/LoginScreen';
import NameInputScreen from './src/screens/NameInputScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import SplashScreen from './src/screens/SplashScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import { colors } from './src/theme';

function AppContent() {
  const { initializing, profile, user, syncProgress, isAuthenticated } = useAuth();
  const isDev = isDevAccount(user?.email);
  const [screen, setScreen] = useState(null);
  const [userLanguage, setUserLanguage] = useState('english');
  const [selectedCourse, setSelectedCourse] = useState('patois');
  const [routeReady, setRouteReady] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function chooseInitialRoute() {
      if (initializing) {
        return;
      }

      if (isAuthenticated) {
        const course = profile?.currentCourse || 'patois';
        if (!cancelled) {
          setSelectedCourse(course);
          setUserName(profile?.displayName || profile?.username || '');
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

  function goToPostAuthFlow() {
    if (profile?.currentCourse) {
      setSelectedCourse(profile.currentCourse);
      setUserName(profile?.displayName || profile?.username || '');
      setScreen('home');
      return;
    }

    // New users go to name input first
    if (!profile?.displayName) {
      setScreen('name-input');
      return;
    }

    setUserName(profile?.displayName || '');
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
    <GameProvider profileHearts={profile?.hearts} onHeartsSync={handleHeartsSync} devMode={isDev}>
      {screen === 'splash' ? <SplashScreen onFinish={finishSplash} /> : null}

      {screen === 'welcome' ? (
        <WelcomeScreen
          onGetStarted={() => setScreen('signup')}
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
          onBack={() => setScreen('welcome')}
          onSuccess={goToPostAuthFlow}
          onSignIn={() => setScreen('login')}
        />
      ) : null}

      {screen === 'name-input' ? (
        <NameInputScreen
          onSubmitName={(name) => {
            setUserName(name);
            if (isAuthenticated) {
              syncProgress({ displayName: name });
            }
            setScreen('language-select');
          }}
          onBack={() => setScreen('welcome')}
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
          userName={userName}
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
    <AuthProvider>
      <AppContent />
    </AuthProvider>
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
