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
import { useAuth } from '../context/AuthContext';
import { getAuthErrorMessage } from '../services/auth/authErrors';
import { colors, fonts, radius, spacing } from '../theme';

export default function SignUpScreen({ onSuccess, onSignIn, onBack }) {
  const { signUp } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  function validateForm() {
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();

    if (!trimmedUsername || trimmedUsername.length < 2) {
      return 'Username must be at least 2 characters.';
    }

    if (!trimmedEmail) {
      return 'Enter your email address.';
    }

    if (password.length < 6) {
      return 'Password must be at least 6 characters.';
    }

    if (password !== confirmPassword) {
      return 'Passwords do not match.';
    }

    return '';
  }

  async function handleSignUp() {
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError('');
    setLoading(true);

    try {
      await signUp({
        username: username.trim(),
        email,
        password,
      });
      onSuccess();
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={[colors.skyTop, colors.splash, colors.skyBottom]} style={StyleSheet.absoluteFill} />

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

            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>
              Start with 5 hearts and track your progress.
            </Text>

            <View style={styles.form}>
              <AuthTextField
                label="Username"
                value={username}
                onChangeText={setUsername}
                placeholder="Your display name"
                autoCapitalize="words"
              />
              <AuthTextField
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
              />
              <AuthTextField
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="At least 6 characters"
                secureTextEntry
              />
              <AuthTextField
                label="Confirm password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repeat your password"
                secureTextEntry
              />
              {formError ? <Text style={styles.formError}>{formError}</Text> : null}
            </View>

            {loading ? (
              <ActivityIndicator color={colors.primary} style={styles.loader} />
            ) : (
              <Pressable style={styles.createButton} onPress={handleSignUp}>
                <Text style={styles.createButtonText}>CREATE ACCOUNT</Text>
              </Pressable>
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
    backgroundColor: colors.splash,
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  header: {
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  backButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  backText: {
    color: colors.textMuted,
    fontFamily: fonts.extraBold,
    fontSize: 24,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.extraBold,
    fontSize: 30,
    lineHeight: 36,
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  form: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  formError: {
    color: colors.error,
    fontFamily: fonts.semiBold,
    fontSize: 14,
    lineHeight: 20,
  },
  loader: {
    marginVertical: spacing.md,
  },
  createButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontFamily: fonts.extraBold,
    fontSize: 15,
    letterSpacing: 1,
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
