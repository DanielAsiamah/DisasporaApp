import { Pressable, StyleSheet, Text } from 'react-native';

import { designTokens } from '../../design/tokens';

export default function IconButton({
  label,
  icon,
  onPress,
  disabled = false,
  tone = 'dark',
  size = 44,
  style,
}) {
  const isLight = tone === 'light';

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { height: size, width: size, borderRadius: size / 2 },
        isLight && styles.light,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.icon, isLight && styles.lightIcon]}>{icon}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: designTokens.dark.surface,
    borderColor: designTokens.dark.border,
    borderWidth: 1,
    justifyContent: 'center',
  },
  light: {
    backgroundColor: designTokens.color.surface,
    borderColor: designTokens.color.border,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.96 }],
  },
  icon: {
    color: designTokens.dark.ink,
    fontFamily: designTokens.font.black,
    fontSize: 18,
    lineHeight: 22,
    textAlign: 'center',
  },
  lightIcon: {
    color: designTokens.color.ink,
  },
});
