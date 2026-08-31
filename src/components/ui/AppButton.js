import { Pressable, StyleSheet, Text } from 'react-native';

import { designTokens } from '../../design/tokens';

export default function AppButton({
  label,
  onPress,
  disabled = false,
  tone = 'primary',
  size = 'md',
  style,
  textStyle,
}) {
  const isSecondary = tone === 'secondary';
  const isDanger = tone === 'danger';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[size],
        isSecondary && styles.secondary,
        isDanger && styles.danger,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          isSecondary && styles.secondaryLabel,
          disabled && styles.disabledLabel,
          textStyle,
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: designTokens.color.brand,
    borderBottomColor: designTokens.color.brandPressed,
    borderBottomWidth: 5,
    borderRadius: designTokens.radius.lg,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: designTokens.space.lg,
  },
  sm: {
    minHeight: 42,
    paddingHorizontal: designTokens.space.md,
  },
  md: {
    minHeight: 52,
  },
  lg: {
    minHeight: 60,
  },
  secondary: {
    backgroundColor: designTokens.color.surface,
    borderBottomColor: designTokens.color.border,
    borderColor: designTokens.color.border,
    borderWidth: 2,
  },
  danger: {
    backgroundColor: designTokens.color.danger,
    borderBottomColor: '#C73535',
  },
  disabled: {
    backgroundColor: designTokens.color.disabled,
    borderBottomColor: '#C8D7D0',
  },
  pressed: {
    opacity: 0.86,
    transform: [{ translateY: 2 }],
  },
  label: {
    color: designTokens.color.ink,
    fontFamily: designTokens.font.black,
    fontSize: designTokens.text.body,
    letterSpacing: 0,
  },
  secondaryLabel: {
    color: designTokens.color.ink,
  },
  disabledLabel: {
    color: designTokens.color.inkMuted,
  },
});
