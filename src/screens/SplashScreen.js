import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '../theme';

const PHASES = [
  {
    key: 'welcome',
    line: 'Welcome to Diaspora...',
    subline: 'Learn the languages of the people',
    accent: colors.textOnDark,
    gradient: [colors.splash, '#101E33', colors.splash],
    duration: 1800,
  },
  {
    key: 'africa',
    line: 'Africa',
    subline: 'Swahili · Igbo · Wolof · more coming soon',
    accent: colors.africaGold,
    gradient: [colors.splashWarm, '#2A1808', colors.splashWarm],
    duration: 1400,
  },
  {
    key: 'caribbean',
    line: 'Caribbean',
    subline: 'Jamaican Patois · Haitian Creole',
    accent: colors.caribbeanBright,
    gradient: [colors.splashGreen, '#0D2618', colors.splashGreen],
    duration: 1400,
  },
  {
    key: 'americas',
    line: 'The Americas',
    subline: 'Belizean Kriol · Black American English · living roots',
    accent: colors.coral,
    gradient: ['#1A0A05', '#2B1510', '#1A0A05'],
    duration: 1400,
  },
];

export default function SplashScreen({ onFinish }) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textScale = useRef(new Animated.Value(0.96)).current;
  const sublineOpacity = useRef(new Animated.Value(0)).current;
  const bgProgress = useRef(new Animated.Value(0)).current;
  const exitOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let cancelled = false;

    async function runSequence() {
      for (let index = 0; index < PHASES.length; index += 1) {
        if (cancelled) return;

        setPhaseIndex(index);
        textOpacity.setValue(0);
        textScale.setValue(0.96);
        sublineOpacity.setValue(0);

        Animated.timing(bgProgress, {
          toValue: index / (PHASES.length - 1),
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start();

        await animateIn();
        if (cancelled) return;

        Animated.timing(sublineOpacity, {
          toValue: 1,
          duration: 350,
          delay: 100,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();

        await wait(PHASES[index].duration);
        if (cancelled) return;

        if (index < PHASES.length - 1) {
          await animateOut();
        }
      }

      Animated.timing(exitOpacity, {
        toValue: 0,
        duration: 700,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && !cancelled) onFinish();
      });
    }

    runSequence();
    return () => { cancelled = true; };
  }, [bgProgress, exitOpacity, onFinish, textOpacity, textScale, sublineOpacity]);

  function animateIn() {
    return new Promise((resolve) => {
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(textScale, {
          toValue: 1,
          speed: 14,
          bounciness: 3,
          useNativeDriver: true,
        }),
      ]).start(() => resolve());
    });
  }

  function animateOut() {
    return new Promise((resolve) => {
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 0,
          duration: 450,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(sublineOpacity, {
          toValue: 0,
          duration: 350,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => resolve());
    });
  }

  const phase = PHASES[phaseIndex];
  const phaseCount = PHASES.length - 1;
  const inputRange = Array.from({ length: PHASES.length }, (_, i) => i / phaseCount);
  const bgColors = PHASES.map((p) => p.gradient[1]);
  const backgroundColor = bgProgress.interpolate({ inputRange, outputRange: bgColors });

  return (
    <Animated.View style={[styles.root, { opacity: exitOpacity }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor }]} />
      <LinearGradient colors={phase.gradient} style={StyleSheet.absoluteFill} />

      <View style={styles.content}>
        <Animated.Text
          style={[
            phase.key === 'welcome' ? styles.welcomeText : styles.phaseText,
            {
              color: phase.accent,
              opacity: textOpacity,
              transform: [{ scale: textScale }],
            },
          ]}
        >
          {phase.line}
        </Animated.Text>

        <Animated.Text style={[styles.subline, { opacity: sublineOpacity }]}>
          {phase.subline}
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  welcomeText: {
    fontFamily: fonts.semiBold,
    fontSize: 22,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  phaseText: {
    fontFamily: fonts.extraBold,
    fontSize: 48,
    letterSpacing: 1,
    textAlign: 'center',
  },
  subline: {
    color: colors.textOnDark,
    fontFamily: fonts.medium,
    fontSize: 16,
    marginTop: 14,
    opacity: 0.82,
    textAlign: 'center',
  },
});
