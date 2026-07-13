import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
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
import { colors, fonts, radius, spacing } from '../theme';

export default function LoginScreen({ onSuccess, onSignUp, onBack, onForgotPassword }) {
  const { signIn, signInWithGoogle, signInWithApple } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState(null);

  async function handleSignIn() {
    setFormError('');

    if (!email.trim() || !password) {
      setFormError('Enter your email and password.');
      return;
    }

    setLoading(true);

    try {
      const result = await signIn({ email, password });
      onSuccess(result.profile);
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleProviderSignIn(provider) {
    setFormError('');
    setLoadingProvider(provider);
    try {
      if (Constants.appOwnership === 'expo' && provider === 'google') {
        throw new Error('Google sign-in needs the Diaspora development build. Email sign-in works in Expo Go.');
      }
      const result = provider === 'google' ? await signInWithGoogle() : await signInWithApple();
      onSuccess(result.profile);
    } catch (error) {
      if (error?.code !== 'ERR_REQUEST_CANCELED') setFormError(error?.message || getAuthErrorMessage(error));
    } finally {
      setLoadingProvider(null);
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

            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to save your hearts, XP, and lesson progress.</Text>

            <View style={styles.form}>
              <AuthTextField
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
              />
              <AuthTextField
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Your password"
                secureTextEntry
                autoComplete="current-password"
                textContentType="password"
              />
              <Pressable onPress={() => onForgotPassword(email.trim())} style={styles.forgotButton}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </Pressable>
              {formError ? <Text style={styles.formError}>{formError}</Text> : null}
            </View>

            {loading ? (
              <ActivityIndicator color={colors.primary} style={styles.loader} />
            ) : (
              <PrimaryButton disabled={Boolean(loadingProvider)} label="Sign in" onPress={handleSignIn} style={styles.controlWidth} />
            )}

            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.divider} />
            </View>

            <Pressable disabled={loading || Boolean(loadingProvider)} onPress={() => handleProviderSignIn('google')} style={[styles.providerButton, (loading || Boolean(loadingProvider)) && styles.providerDisabled]}>
              {loadingProvider === 'google' ? <ActivityIndicator color={colors.text} /> : <Text style={styles.providerIcon}>G</Text>}
              <Text style={styles.providerText}>Continue with Google</Text>
            </Pressable>

            {Platform.OS === 'ios' ? (
              <Pressable disabled={loading || Boolean(loadingProvider)} onPress={() => handleProviderSignIn('apple')} style={[styles.providerButton, styles.appleButton, (loading || Boolean(loadingProvider)) && styles.providerDisabled]}>
                {loadingProvider === 'apple' ? <ActivityIndicator color="#FFFFFF" /> : <Text style={[styles.providerIcon, styles.appleText]}>●</Text>}
                <Text style={[styles.providerText, styles.appleText]}>Continue with Apple</Text>
              </Pressable>
            ) : null}

            <Pressable onPress={onSignUp} style={styles.linkButton}>
              <Text style={styles.linkText}>Create an account</Text>
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
  forgotButton: { alignSelf: 'flex-end', paddingVertical: spacing.xs },
  forgotText: { color: colors.blue, fontFamily: fonts.extraBold, fontSize: 13 },
  dividerRow: { alignItems: 'center', flexDirection: 'row', gap: 12, marginVertical: spacing.md, width: '88%' },
  divider: { backgroundColor: colors.border, flex: 1, height: 1 },
  dividerText: { color: colors.textLight, fontFamily: fonts.bold, fontSize: 11 },
  providerButton: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 2, flexDirection: 'row', gap: 12, justifyContent: 'center', marginBottom: spacing.sm, minHeight: 54, width: '88%' },
  appleButton: { backgroundColor: '#000000', borderColor: '#2F2F2F' },
  providerDisabled: { opacity: 0.65 },
  providerIcon: { color: colors.text, fontFamily: fonts.extraBold, fontSize: 18 },
  providerText: { color: colors.text, fontFamily: fonts.extraBold, fontSize: 14 },
  appleText: { color: '#FFFFFF' },
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
