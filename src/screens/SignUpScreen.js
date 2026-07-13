import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import AuthTextField from '../components/AuthTextField';
import PrimaryButton from '../components/PrimaryButton';
import { useAuth } from '../context/AuthContext';
import { getAuthErrorMessage } from '../services/auth/authErrors';
import { colors, fonts, spacing } from '../theme';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignUpScreen({ onSuccess, onSignIn, onBack, onboardingData }) {
  const { signUp } = useAuth();
  const [username, setUsername] = useState(onboardingData?.preferredName || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  function validateForm() {
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();

    const errors = {};
    if (!trimmedUsername || trimmedUsername.length < 2) errors.username = 'Enter at least 2 characters.';
    if (!trimmedEmail || !EMAIL_PATTERN.test(trimmedEmail)) errors.email = 'Enter a valid email address.';
    if (password.length < 8) errors.password = 'Use at least 8 characters.';
    if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match.';
    return errors;
  }

  async function handleSignUp() {
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length) {
      setFieldErrors(validationErrors);
      setFormError('Check the highlighted fields and try again.');
      return;
    }

    setFieldErrors({});
    setFormError('');
    setLoading(true);

    try {
      const result = await signUp({
        username: username.trim(),
        email,
        password,
        profileData: onboardingData || {},
      });
      onSuccess(result);
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={[colors.skyTop, colors.skyBottom]} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <Pressable onPress={onBack} style={styles.backButton}>
                <Text style={styles.backText}>←</Text>
              </Pressable>
            </View>

            <Text style={styles.title}>Save your Diaspora path</Text>
            <Text style={styles.subtitle}>
              Create your account to keep your language, goal, and progress safe across devices.
            </Text>

            <View style={styles.form}>
              <AuthTextField
                label="Your name"
                value={username}
                onChangeText={(value) => {
                  setUsername(value);
                  setFieldErrors((current) => ({ ...current, username: '' }));
                }}
                placeholder="First name or nickname"
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                error={fieldErrors.username}
              />
              <AuthTextField
                label="Email"
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  setFieldErrors((current) => ({ ...current, email: '' }));
                }}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                error={fieldErrors.email}
              />
              <AuthTextField
                label="Password"
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  setFieldErrors((current) => ({ ...current, password: '' }));
                }}
                placeholder="At least 8 characters"
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
                error={fieldErrors.password}
              />
              <AuthTextField
                label="Confirm password"
                value={confirmPassword}
                onChangeText={(value) => {
                  setConfirmPassword(value);
                  setFieldErrors((current) => ({ ...current, confirmPassword: '' }));
                }}
                placeholder="Repeat your password"
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
                error={fieldErrors.confirmPassword}
              />
              {formError ? <Text style={styles.formError}>{formError}</Text> : null}
            </View>

            {loading ? (
              <ActivityIndicator color={colors.primary} style={styles.loader} />
            ) : (
              <PrimaryButton label="Create account" onPress={handleSignUp} style={styles.controlWidth} />
            )}

            <Pressable onPress={onSignIn} style={styles.linkButton}>
              <Text style={styles.linkText}>Already have an account? Sign in</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
  header: {
    alignSelf: 'center',
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
    width: '88%',
  },
  backButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  backText: {
    color: colors.blue,
    fontFamily: fonts.extraBold,
    fontSize: 24,
  },
  title: {
    width: '88%',
    color: colors.textDark,
    fontFamily: fonts.black,
    fontSize: 30,
    lineHeight: 36,
  },
  subtitle: {
    width: '88%',
    color: colors.textMuted,
    fontFamily: fonts.semiBold,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  form: {
    gap: spacing.md,
    marginBottom: spacing.lg,
    width: '88%',
  },
  controlWidth: { width: '88%' },
  formError: {
    color: colors.error,
    fontFamily: fonts.semiBold,
    fontSize: 14,
    lineHeight: 20,
  },
  loader: {
    marginVertical: spacing.md,
  },
  linkButton: {
    alignItems: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  linkText: {
    color: colors.blue,
    fontFamily: fonts.extraBold,
    fontSize: 15,
  },
});
