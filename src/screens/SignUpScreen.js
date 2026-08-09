import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import AuthScreenFrame, { AUTH_PALETTE } from '../components/AuthScreenFrame';
import AuthTextField from '../components/AuthTextField';
import PrimaryButton from '../components/PrimaryButton';
import { useAuth } from '../context/AuthContext';
import { getAuthErrorMessage } from '../services/auth/authErrors';
import { fonts, spacing } from '../theme';

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
  const hasPersonalizedName = Boolean(onboardingData?.preferredName?.trim());
  const passwordRules = [
    { label: '8 or more characters', met: password.length >= 8 },
    { label: 'At least one letter', met: /[A-Za-z]/.test(password) },
    { label: 'At least one number', met: /\d/.test(password) },
  ];

  function validateForm() {
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();

    const errors = {};
    if (!trimmedUsername || trimmedUsername.length < 2) errors.username = 'Enter at least 2 characters.';
    if (!trimmedEmail || !EMAIL_PATTERN.test(trimmedEmail)) errors.email = 'Enter a valid email address.';
    if (passwordRules.some((rule) => !rule.met)) errors.password = 'Use 8+ characters with a letter and number.';
    if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match.';
    return errors;
  }

  async function handleSignUp() {
    if (loading) return;

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
        profileData: {
          ...(onboardingData || {}),
          preferredName: username.trim(),
        },
      });
      onSuccess(result);
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreenFrame
      headerLabel="Create account"
      keyboardAware
      onBack={onBack}
      subtitle="Create your account to keep your language, goal, and progress safe across devices."
      title="Save your Diaspora path"
    >
      <View style={styles.form}>
        {hasPersonalizedName ? (
          <View style={styles.profileNameCard}>
            <View style={styles.profileInitial}>
              <Text style={styles.profileInitialText}>{username.trim().charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.profileNameCopy}>
              <Text style={styles.profileNameEyebrow}>CREATING A PATH FOR</Text>
              <Text style={styles.profileName}>{username.trim()}</Text>
            </View>
          </View>
        ) : (
          <AuthTextField
            autoCapitalize="words"
            autoComplete="name"
            error={fieldErrors.username}
            label="Your name"
            onChangeText={(value) => {
              setUsername(value);
              setFieldErrors((current) => ({ ...current, username: '' }));
            }}
            placeholder="First name or nickname"
            textContentType="name"
            value={username}
          />
        )}
        <AuthTextField
          autoComplete="email"
          error={fieldErrors.email}
          keyboardType="email-address"
          label="Email"
          onChangeText={(value) => {
            setEmail(value);
            setFieldErrors((current) => ({ ...current, email: '' }));
          }}
          placeholder="you@example.com"
          textContentType="emailAddress"
          value={email}
        />
        <AuthTextField
          autoComplete="new-password"
          error={fieldErrors.password}
          label="Password"
          onChangeText={(value) => {
            setPassword(value);
            setFieldErrors((current) => ({ ...current, password: '' }));
          }}
          placeholder="At least 8 characters"
          secureTextEntry
          textContentType="newPassword"
          value={password}
        />
        <View style={styles.passwordRules}>
          {passwordRules.map((rule) => (
            <View key={rule.label} style={styles.passwordRuleRow}>
              <Text style={[styles.passwordRuleIcon, rule.met && styles.passwordRuleMet]}>
                {rule.met ? '✓' : '○'}
              </Text>
              <Text style={[styles.passwordRuleText, rule.met && styles.passwordRuleMet]}>
                {rule.label}
              </Text>
            </View>
          ))}
        </View>
        <AuthTextField
          autoComplete="new-password"
          error={fieldErrors.confirmPassword}
          label="Confirm password"
          onChangeText={(value) => {
            setConfirmPassword(value);
            setFieldErrors((current) => ({ ...current, confirmPassword: '' }));
          }}
          onSubmitEditing={handleSignUp}
          placeholder="Repeat your password"
          returnKeyType="done"
          secureTextEntry
          textContentType="newPassword"
          value={confirmPassword}
        />
        {formError ? <Text style={styles.formError}>{formError}</Text> : null}
      </View>

      <PrimaryButton
        label="Create account"
        loading={loading}
        onPress={handleSignUp}
        style={styles.controlWidth}
      />

      <Pressable onPress={onSignIn} style={styles.linkButton}>
        <Text style={styles.linkText}>Already have an account? Sign in</Text>
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
  profileNameCard: {
    alignItems: 'center',
    backgroundColor: AUTH_PALETTE.white,
    borderColor: AUTH_PALETTE.border,
    borderRadius: 16,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  profileInitial: {
    alignItems: 'center',
    backgroundColor: AUTH_PALETTE.sky,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  profileInitialText: {
    color: AUTH_PALETTE.white,
    fontFamily: fonts.black,
    fontSize: 18,
  },
  profileNameCopy: {
    flex: 1,
  },
  profileNameEyebrow: {
    color: AUTH_PALETTE.textSoft,
    fontFamily: fonts.extraBold,
    fontSize: 9,
    letterSpacing: 0.7,
  },
  profileName: {
    color: AUTH_PALETTE.brandBlue,
    fontFamily: fonts.extraBold,
    fontSize: 17,
    marginTop: 2,
  },
  passwordRules: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  passwordRuleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    minWidth: '46%',
  },
  passwordRuleIcon: {
    color: AUTH_PALETTE.textSoft,
    fontFamily: fonts.extraBold,
    fontSize: 13,
  },
  passwordRuleText: {
    color: AUTH_PALETTE.textSoft,
    fontFamily: fonts.semiBold,
    fontSize: 11,
  },
  passwordRuleMet: {
    color: AUTH_PALETTE.success,
  },
  formError: {
    color: '#FF4B4B',
    fontFamily: fonts.semiBold,
    fontSize: 14,
    lineHeight: 20,
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
