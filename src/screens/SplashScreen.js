import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { AUTH_PALETTE } from '../components/AuthScreenFrame';
import { fonts } from '../theme';

const PHASES = [
  {
    key: 'welcome',
    line: 'Diaspora',
    subline: 'Languages carry us home',
    accent: AUTH_PALETTE.brandBlue,
    gradient: [AUTH_PALETTE.backgroundTop, '#F7FDFF', AUTH_PALETTE.backgroundBottom],
    duration: 1600,
  },
  {
    key: 'courses',
    line: 'Six live MVP courses',
    subline: 'Jamaican Patois · Swahili · Wolof · Haitian Creole · Sudanese Arabic · Nobiin',
    accent: AUTH_PALETTE.sky,
    gradient: ['#EEF9FF', '#FFFFFF', '#F3FBFF'],
    duration: 1600,
  },
  {
    key: 'promise',
    line: 'Learn • Review • Leaderboard',
    subline: 'Built for diaspora language journeys with real lessons and clear progress.',
    accent: AUTH_PALETTE.success,
    gradient: ['#F6FCFF', '#FFFFFF', '#EAF8FF'],
    duration: 1500,
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
    return () => {
      cancelled = true;
    };
  }, [bgProgress, exitOpacity, onFinish, sublineOpacity, textOpacity, textScale]);

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
  const inputRange = Array.from({ length: PHASES.length }, (_, i) =>
    PHASES.length === 1 ? 0 : i / (PHASES.length - 1)
  );
  const bgColors = PHASES.map((entry) => entry.gradient[1]);
  const backgroundColor = bgProgress.interpolate({ inputRange, outputRange: bgColors });

  return (
    <Animated.View style={[styles.root, { opacity: exitOpacity }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor }]} />
      <LinearGradient colors={phase.gradient} style={StyleSheet.absoluteFill} />
      <View style={styles.glow} />

      <View style={styles.content}>
        <Text style={styles.brandPill}>Diaspora</Text>
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
  root: {
    flex: 1,
  },
  glow: {
    backgroundColor: 'rgba(28,176,246,0.08)',
    borderRadius: 999,
    height: 240,
    position: 'absolute',
    right: -90,
    top: 120,
    width: 240,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  brandPill: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderColor: AUTH_PALETTE.border,
    borderRadius: 999,
    borderWidth: 1.5,
    color: AUTH_PALETTE.sky,
    fontFamily: fonts.extraBold,
    fontSize: 12,
    letterSpacing: 0.8,
    marginBottom: 18,
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingVertical: 8,
    textTransform: 'uppercase',
  },
  welcomeText: {
    fontFamily: fonts.black,
    fontSize: 38,
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  phaseText: {
    fontFamily: fonts.black,
    fontSize: 34,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  subline: {
    color: AUTH_PALETTE.textMuted,
    fontFamily: fonts.semiBold,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 14,
    opacity: 0.92,
    textAlign: 'center',
  },
});
