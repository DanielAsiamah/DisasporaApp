import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '../theme';

export default function HeartsBar({ hearts, maxHearts, showCount = true }) {
  const safeMaxHearts = Number.isFinite(maxHearts) ? maxHearts : 5;
  const safeHearts = Math.max(0, Math.min(Number(hearts) || 0, safeMaxHearts));
  const prevHeartsRef = useRef(safeHearts);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (safeHearts < prevHeartsRef.current) {
      // Heart lost - shake + pulse animation
      Animated.parallel([
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.3,
            duration: 100,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 200,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
    prevHeartsRef.current = safeHearts;
  }, [safeHearts, shakeAnim, scaleAnim]);

  return (
    <Animated.View
      style={[
        styles.row,
        { transform: [{ translateX: shakeAnim }, { scale: scaleAnim }] },
      ]}
    >
      <Text style={styles.heartIcon}>{safeHearts > 0 ? '\u2764\ufe0f' : '\ud83d\udc94'}</Text>
      {showCount ? (
        <Text style={[styles.heartCount, safeHearts === 0 && styles.heartCountEmpty]}>
          {safeHearts}
        </Text>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  heartIcon: {
    fontSize: 20,
  },
  heartCount: {
    color: colors.heart,
    fontFamily: fonts.extraBold,
    fontSize: 17,
  },
  heartCountEmpty: {
    color: colors.error,
  },
});
