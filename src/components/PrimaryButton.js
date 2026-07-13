import { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';

import { colors, fonts, radius } from '../theme';

export default function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
}) {
  const translateY = useRef(new Animated.Value(0)).current;
  const isPrimary = variant === 'primary';
  const backgroundColor = isPrimary ? colors.primary : colors.surface;
  const borderColor = isPrimary ? colors.primaryDark : colors.border;
  const textColor = isPrimary ? colors.surface : colors.blue;

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
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={style}
    >
      <Animated.View
        style={[
          styles.button,
          {
            backgroundColor,
            borderColor,
            opacity: disabled ? 0.55 : 1,
            transform: [{ translateY }],
          },
        ]}
      >
        <Text style={[styles.label, { color: textColor }]}>{label}</Text>
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
