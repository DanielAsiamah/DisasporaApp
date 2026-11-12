import { useRef } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text } from 'react-native';

import { colors, fonts, radius } from '../theme';

export default function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
}) {
  const translateY = useRef(new Animated.Value(0)).current;
  const isPrimary = variant === 'primary';
  const backgroundColor = isPrimary ? colors.ink : colors.paper;
  const borderColor = isPrimary ? colors.ink : colors.border;
  const textColor = isPrimary ? colors.paper : colors.ink;
  const unavailable = disabled || loading;

  function handlePressIn() {
    Animated.spring(translateY, {
      toValue: 2,
      useNativeDriver: true,
      speed: 50,
      bounciness: 1,
    }).start();
  }

  function handlePressOut() {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      speed: 50,
      bounciness: 6,
    }).start();
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: unavailable }}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={unavailable}
      style={style}
    >
      <Animated.View
        style={[
          styles.button,
          {
            backgroundColor,
            borderColor,
            opacity: unavailable ? 0.55 : 1,
            transform: [{ translateY }],
          },
        ]}
      >
        {loading ? <ActivityIndicator color={textColor} /> : <Text style={[styles.label, { color: textColor }]}>{label}</Text>}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: radius.lg,
    justifyContent: 'center',
    minHeight: 58,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  label: {
    fontFamily: fonts.bold,
    fontSize: 18,
    letterSpacing: 0.1,
  },
});
