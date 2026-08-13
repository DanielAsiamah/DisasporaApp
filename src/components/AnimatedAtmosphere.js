import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { useReducedMotion } from '../hooks/useReducedMotion';
import { colors } from '../theme';

export default function AnimatedAtmosphere({
  colors: gradientColors = [colors.skyTop, colors.skyBottom],
  accent = colors.primary,
}) {
  const reducedMotion = useReducedMotion(null);
  const drift = useRef(new Animated.Value(0.5)).current;
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reducedMotion !== false) {
      drift.setValue(0.5);
      float.setValue(0);
      return undefined;
    }

    drift.setValue(0);
    float.setValue(0);
    const driftLoop = Animated.loop(
      Animated.timing(drift, {
        toValue: 1,
        duration: 60000,
        useNativeDriver: true,
      })
    );

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 9000,
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 9000,
          useNativeDriver: true,
        }),
      ])
    );
    driftLoop.start();
    floatLoop.start();
    return () => {
      driftLoop.stop();
      floatLoop.stop();
    };
  }, [drift, float, reducedMotion]);

  const cloudTranslate = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [-80, 80],
  });
  const reverseCloudTranslate = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [70, -70],
  });
  const floatTranslate = float.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />

      <Animated.View
        style={[
          styles.cloudCluster,
          styles.cloudOne,
          {
            opacity: 0.16,
            transform: [{ translateX: cloudTranslate }, { translateY: floatTranslate }],
          },
        ]}
      >
        <View style={styles.cloudLarge} />
        <View style={styles.cloudSmall} />
        <View style={styles.cloudTail} />
      </Animated.View>

      <Animated.View
        style={[
          styles.cloudCluster,
          styles.cloudTwo,
          {
            opacity: 0.1,
            transform: [{ translateX: reverseCloudTranslate }],
          },
        ]}
      >
        <View style={styles.cloudLarge} />
        <View style={styles.cloudSmall} />
        <View style={styles.cloudTail} />
      </Animated.View>

      <View style={[styles.glow, { backgroundColor: accent }]} />
      <View style={styles.waveOne} />
      <View style={styles.waveTwo} />
    </View>
  );
}

const styles = StyleSheet.create({
  cloudCluster: {
    height: 70,
    position: 'absolute',
    width: 170,
  },
  cloudOne: {
    left: 10,
    top: 70,
  },
  cloudTwo: {
    right: -20,
    top: 170,
  },
  cloudLarge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    height: 42,
    left: 42,
    position: 'absolute',
    top: 10,
    width: 86,
  },
  cloudSmall: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    height: 36,
    left: 16,
    position: 'absolute',
    top: 24,
    width: 72,
  },
  cloudTail: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    height: 30,
    left: 86,
    position: 'absolute',
    top: 28,
    width: 70,
  },
  glow: {
    borderRadius: 999,
    height: 220,
    opacity: 0.08,
    position: 'absolute',
    right: -95,
    top: 90,
    width: 220,
  },
  waveOne: {
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderRadius: 999,
    bottom: -80,
    height: 180,
    left: -70,
    position: 'absolute',
    width: 360,
  },
  waveTwo: {
    backgroundColor: 'rgba(31,190,86,0.06)',
    borderRadius: 999,
    bottom: -110,
    height: 210,
    position: 'absolute',
    right: -110,
    width: 420,
  },
});
