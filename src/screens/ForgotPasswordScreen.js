import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import AuthScreenFrame, { AUTH_PALETTE } from '../components/AuthScreenFrame';
import AuthTextField from '../components/AuthTextField';
import PrimaryButton from '../components/PrimaryButton';
import { useAuth } from '../context/AuthContext';
import { getAuthErrorMessage } from '../services/auth/authErrors';
import { fonts, spacing } from '../theme';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen({ initialEmail = '', onBack }) {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    const trimmedEmail = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setError('Enter the email address connected to your account.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await requestPasswordReset(trimmedEmail);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setSent(true);
    } catch (resetError) {
      setError(getAuthErrorMessage(resetError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreenFrame
      centerContent
      eyebrow={sent ? 'Check your inbox' : 'Reset your password'}
      headerLabel="Account help"
      keyboardAware
      onBack={onBack}
      subtitle={
        sent
          ? `If an account exists for ${email.trim()}, Firebase will send password-reset instructions.`
          : 'Enter your account email and we’ll send secure reset instructions.'
      }
      title={sent ? 'Your reset link is on its way.' : 'Let’s get you back in.'}
    >
      {!sent ? (
        <View style={styles.form}>
          <AuthTextField
            autoComplete="email"
            error={error}
            keyboardType="email-address"
            label="Email"
            onChangeText={(value) => {
              setEmail(value);
              setError('');
            }}
            onSubmitEditing={handleReset}
            placeholder="you@example.com"
            returnKeyType="send"
            textContentType="emailAddress"
            value={email}
          />
          {loading ? (
            <ActivityIndicator color={AUTH_PALETTE.sky} />
          ) : (
            <PrimaryButton label="SEND RESET LINK" onPress={handleReset} style={styles.button} />
          )}
        </View>
      ) : (
        <View style={styles.form}>
          <PrimaryButton label="BACK TO SIGN IN" onPress={onBack} style={styles.button} />
          <Text onPress={() => setSent(false)} style={styles.linkText}>
            Try another email
          </Text>
        </View>
      )}
    </AuthScreenFrame>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.md,
    marginTop: spacing.lg,
    width: '100%',
  },
  button: {
    width: '100%',
  },
  linkText: {
    color: AUTH_PALETTE.sky,
    fontFamily: fonts.extraBold,
    fontSize: 14,
    paddingVertical: spacing.sm,
    textAlign: 'center',
  },
});
