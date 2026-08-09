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
  const backgroundColor = isPrimary ? colors.blue : '#FFFFFF';
  const borderColor = isPrimary ? '#0C8CE9' : '#B7DFF7';
  const textColor = isPrimary ? '#FFFFFF' : colors.blue;
  const unavailable = disabled || loading;

  function handlePressIn() {
    Animated.spring(translateY, {
      toValue: 3,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  }

  function handlePressOut() {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
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
    borderBottomWidth: 4,
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  label: {
    fontFamily: fonts.extraBold,
    fontSize: 17,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});
