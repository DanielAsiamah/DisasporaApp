import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { fonts, radius, spacing } from '../theme';
import { AUTH_PALETTE } from './AuthScreenFrame';

export default function AuthTextField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  autoCapitalize = 'none',
  keyboardType = 'default',
  autoComplete,
  textContentType,
  returnKeyType,
  onSubmitEditing,
  error,
}) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  const isPassword = secureTextEntry;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, focused && styles.inputFocused, error && styles.inputError]}>
        <TextInput
          accessibilityLabel={label}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          autoCorrect={false}
          keyboardType={keyboardType}
          onBlur={() => setFocused(false)}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          placeholder={placeholder}
          placeholderTextColor={AUTH_PALETTE.textSoft}
          returnKeyType={returnKeyType}
          secureTextEntry={isPassword && !passwordVisible}
          style={styles.input}
          value={value}
          textContentType={textContentType}
          onSubmitEditing={onSubmitEditing}
        />
        {isPassword ? (
          <Pressable
            accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setPasswordVisible((current) => !current)}
            style={styles.visibilityButton}
          >
            <Text style={styles.visibilityText}>{passwordVisible ? 'HIDE' : 'SHOW'}</Text>
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },
  label: {
    color: AUTH_PALETTE.brandBlue,
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  inputRow: {
    alignItems: 'center',
    backgroundColor: AUTH_PALETTE.white,
    borderColor: AUTH_PALETTE.border,
    borderRadius: radius.md,
    borderWidth: 1.5,
    flexDirection: 'row',
    minHeight: 52,
  },
  inputFocused: {
    borderColor: AUTH_PALETTE.sky,
  },
  input: {
    color: AUTH_PALETTE.brandBlue,
    flex: 1,
    fontFamily: fonts.semiBold,
    fontSize: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inputError: {
    borderColor: '#FF4B4B',
  },
  errorText: {
    color: '#FF4B4B',
    fontFamily: fonts.semiBold,
    fontSize: 12,
  },
  visibilityButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  visibilityText: {
    color: AUTH_PALETTE.sky,
    fontFamily: fonts.extraBold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
});
