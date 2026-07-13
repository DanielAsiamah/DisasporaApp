import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius } from '../theme';

export const REGIONAL_GUIDES = {
  africa: {
    id: 'africa',
    name: 'Amara',
    region: 'Africa',
    emoji: '👩🏿‍🦱',
    accessory: '🌍',
    color: colors.africaGold,
    greeting: 'Welcome — your roots have a voice.',
  },
  caribbean: {
    id: 'caribbean',
    name: 'Kai',
    region: 'Caribbean',
    emoji: '🧑🏾‍🦱',
    accessory: '🌺',
    color: colors.caribbeanBright,
    greeting: 'Every phrase carries a little sunshine.',
  },
  americas: {
    id: 'americas',
    name: 'Sol',
    region: 'The Americas',
    emoji: '👩🏽‍🦱',
    accessory: '☀️',
    color: colors.coral,
    greeting: 'Let’s connect language, family, and home.',
  },
};

export default function RegionalGuide({
  region = 'caribbean',
  size = 'medium',
  showLabel = false,
  wearHat = false,
  animated = false,
  active = false,
}) {
  const guide = REGIONAL_GUIDES[region] || REGIONAL_GUIDES.caribbean;
  const dimension = size === 'large' ? 116 : size === 'small' ? 58 : 82;
  const emojiSize = size === 'large' ? 62 : size === 'small' ? 31 : 44;
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) {
      float.setValue(0);
      return undefined;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          duration: active ? 850 : 1200,
          easing: Easing.inOut(Easing.sin),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          duration: active ? 850 : 1200,
          easing: Easing.inOut(Easing.sin),
          toValue: 0,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active, animated, float]);

  const animatedStyle = animated
    ? {
        transform: [
          { translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, active ? -7 : -3] }) },
          { rotate: float.interpolate({ inputRange: [0, 1], outputRange: ['-1deg', '1deg'] }) },
          { scale: active ? 1.06 : 1 },
        ],
      }
    : null;

  return (
    <Animated.View style={[styles.wrapper, animatedStyle]}>
      <Animated.View
        accessibilityLabel={`${guide.name}, ${guide.region} guide`}
        accessibilityState={{ selected: active }}
        style={[
          styles.avatar,
          active && styles.avatarActive,
          {
            borderColor: guide.color,
            height: dimension,
            width: dimension,
          },
        ]}
      >
        {wearHat ? <Text style={[styles.hat, { fontSize: emojiSize * 0.72 }]}>🎩</Text> : null}
        <Text style={{ fontSize: emojiSize }}>{guide.emoji}</Text>
        <View style={[styles.accessory, { backgroundColor: guide.color }]}>
          <Text style={styles.accessoryText}>{guide.accessory}</Text>
        </View>
      </Animated.View>
      {showLabel ? (
        <View style={styles.labelRow}>
          <Text style={[styles.name, { color: guide.color }]}>{guide.name}</Text>
          <Text style={styles.region}>{guide.region}</Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: 8 },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderCurve: 'continuous',
    borderRadius: radius.xl,
    borderWidth: 3,
    justifyContent: 'center',
    position: 'relative',
  },
  avatarActive: {
    backgroundColor: colors.surface,
    shadowColor: '#000000',
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.24,
    shadowRadius: 10,
  },
  accessory: {
    alignItems: 'center',
    borderRadius: radius.pill,
    bottom: -7,
    height: 30,
    justifyContent: 'center',
    position: 'absolute',
    right: -7,
    width: 30,
  },
  accessoryText: { fontSize: 16 },
  hat: {
    position: 'absolute',
    top: -20,
    transform: [{ rotate: '-8deg' }],
    zIndex: 2,
  },
  labelRow: { alignItems: 'center' },
  name: { fontFamily: fonts.extraBold, fontSize: 14 },
  region: { color: colors.textMuted, fontFamily: fonts.semiBold, fontSize: 11 },
});
