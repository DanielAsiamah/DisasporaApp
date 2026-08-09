import Constants from 'expo-constants';
import { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import AuthScreenFrame, { AUTH_PALETTE } from '../components/AuthScreenFrame';
import AuthTextField from '../components/AuthTextField';
import PrimaryButton from '../components/PrimaryButton';
import { useAuth } from '../context/AuthContext';
import { getAuthErrorMessage } from '../services/auth/authErrors';
import { fonts, radius, spacing } from '../theme';

export default function LoginScreen({ onSuccess, onSignUp, onBack, onForgotPassword }) {
  const { signIn, signInWithGoogle, signInWithApple } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState(null);

  async function handleSignIn() {
    if (loading || loadingProvider) return;
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
      if (error?.code !== 'ERR_REQUEST_CANCELED') {
        setFormError(error?.message || getAuthErrorMessage(error));
      }
    } finally {
      setLoadingProvider(null);
    }
  }

  return (
    <AuthScreenFrame
      centerContent
      headerLabel="Sign in"
      keyboardAware
      onBack={onBack}
      subtitle="Sign in to keep your hearts, XP, and lesson progress synced across devices."
      title="Welcome back"
    >
      <View style={styles.form}>
        <AuthTextField
          autoComplete="email"
          keyboardType="email-address"
          label="Email"
          onChangeText={setEmail}
          placeholder="you@example.com"
          textContentType="emailAddress"
          value={email}
        />
        <AuthTextField
          autoComplete="current-password"
          label="Password"
          onChangeText={setPassword}
          onSubmitEditing={handleSignIn}
          placeholder="Your password"
          returnKeyType="done"
          secureTextEntry
          textContentType="password"
          value={password}
        />
        <Pressable onPress={() => onForgotPassword(email.trim())} style={styles.forgotButton}>
          <Text style={styles.forgotText}>Forgot password?</Text>
        </Pressable>
        {formError ? <Text style={styles.formError}>{formError}</Text> : null}
      </View>

      <PrimaryButton
        disabled={Boolean(loadingProvider)}
        label="Sign in"
        loading={loading}
        onPress={handleSignIn}
        style={styles.controlWidth}
      />

      <View style={styles.dividerRow}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.divider} />
      </View>

      <Pressable
        disabled={loading || Boolean(loadingProvider)}
        onPress={() => handleProviderSignIn('google')}
        style={[
          styles.providerButton,
          (loading || Boolean(loadingProvider)) && styles.providerDisabled,
        ]}
      >
        {loadingProvider === 'google' ? (
          <ActivityIndicator color={AUTH_PALETTE.brandBlue} />
        ) : (
          <Text style={styles.providerIcon}>G</Text>
        )}
        <Text style={styles.providerText}>Continue with Google</Text>
      </Pressable>

      {Platform.OS === 'ios' ? (
        <Pressable
          disabled={loading || Boolean(loadingProvider)}
          onPress={() => handleProviderSignIn('apple')}
          style={[
            styles.providerButton,
            styles.appleButton,
            (loading || Boolean(loadingProvider)) && styles.providerDisabled,
          ]}
        >
          {loadingProvider === 'apple' ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={[styles.providerIcon, styles.appleText]}>●</Text>
          )}
          <Text style={[styles.providerText, styles.appleText]}>Continue with Apple</Text>
        </Pressable>
      ) : null}

      <Pressable onPress={onSignUp} style={styles.linkButton}>
        <Text style={styles.linkText}>Create an account</Text>
      </Pressable>
    </AuthScreenFrame>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.md,
    marginBottom: spacing.lg,
    width: '100%',
  },
  controlWidth: {
    width: '100%',
  },
  formError: {
    color: '#FF4B4B',
    fontFamily: fonts.semiBold,
    fontSize: 14,
    lineHeight: 20,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    paddingVertical: spacing.xs,
  },
  forgotText: {
    color: AUTH_PALETTE.sky,
    fontFamily: fonts.extraBold,
    fontSize: 13,
  },
  dividerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginVertical: spacing.md,
    width: '100%',
  },
  divider: {
    backgroundColor: AUTH_PALETTE.border,
    flex: 1,
    height: 1,
  },
  dividerText: {
    color: AUTH_PALETTE.textSoft,
    fontFamily: fonts.bold,
    fontSize: 11,
  },
  providerButton: {
    alignItems: 'center',
    backgroundColor: AUTH_PALETTE.white,
    borderColor: AUTH_PALETTE.border,
    borderRadius: radius.md,
    borderWidth: 2,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    marginBottom: spacing.sm,
    minHeight: 54,
    width: '100%',
  },
  appleButton: {
    backgroundColor: '#101113',
    borderColor: '#101113',
  },
  providerDisabled: {
    opacity: 0.65,
  },
  providerIcon: {
    color: AUTH_PALETTE.brandBlue,
    fontFamily: fonts.extraBold,
    fontSize: 18,
  },
  providerText: {
    color: AUTH_PALETTE.brandBlue,
    fontFamily: fonts.extraBold,
    fontSize: 14,
  },
  appleText: {
    color: '#FFFFFF',
  },
  linkButton: {
    alignItems: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  linkText: {
    color: AUTH_PALETTE.sky,
    fontFamily: fonts.extraBold,
    fontSize: 15,
  },
});
