import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AuthTextField from '../components/AuthTextField';
import PrimaryButton from '../components/PrimaryButton';
import RegionalGuide from '../components/RegionalGuide';
import { useAuth } from '../context/AuthContext';
import { getAuthErrorMessage } from '../services/auth/authErrors';
import { colors, fonts, spacing } from '../theme';

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
    <View style={styles.root}>
      <LinearGradient colors={[colors.skyTop, colors.skyBottom]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Back to sign in" onPress={onBack} style={styles.backButton}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <Text style={styles.headerLabel}>ACCOUNT HELP</Text>
        </View>

        <View style={styles.content}>
          <RegionalGuide region="americas" size="large" />
          <Text style={styles.eyebrow}>{sent ? 'CHECK YOUR INBOX' : 'RESET YOUR PASSWORD'}</Text>
          <Text style={styles.title}>{sent ? 'Your reset link is on its way.' : 'Let’s get you back in.'}</Text>
          <Text style={styles.subtitle}>
            {sent
              ? `If an account exists for ${email.trim()}, Firebase will send password-reset instructions.`
              : 'Enter your account email and we’ll send secure reset instructions.'}
          </Text>

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
              {loading ? <ActivityIndicator color={colors.primary} /> : <PrimaryButton label="SEND RESET LINK" onPress={handleReset} />}
            </View>
          ) : (
            <View style={styles.form}>
              <PrimaryButton label="BACK TO SIGN IN" onPress={onBack} />
              <Pressable onPress={() => setSent(false)} style={styles.linkButton}>
                <Text style={styles.linkText}>Try another email</Text>
              </Pressable>
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', gap: 10, paddingHorizontal: spacing.lg, paddingVertical: 12 },
  backButton: { alignItems: 'center', height: 42, justifyContent: 'center', width: 34 },
  backText: { color: colors.text, fontFamily: fonts.bold, fontSize: 34, lineHeight: 36 },
  headerLabel: { color: colors.accent, fontFamily: fonts.extraBold, fontSize: 12, letterSpacing: 1.4 },
  content: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingVertical: spacing.lg },
  eyebrow: { color: colors.primary, fontFamily: fonts.extraBold, fontSize: 12, letterSpacing: 1.3, marginTop: spacing.lg },
  title: { color: colors.text, fontFamily: fonts.extraBold, fontSize: 30, lineHeight: 38, marginTop: spacing.xs, textAlign: 'center', width: '88%' },
  subtitle: { color: colors.textMuted, fontFamily: fonts.medium, fontSize: 14, lineHeight: 21, marginTop: spacing.sm, maxWidth: 380, textAlign: 'center', width: '88%' },
  form: { gap: spacing.md, marginTop: spacing.xl, maxWidth: 420, width: '88%' },
  linkButton: { alignItems: 'center', padding: spacing.sm },
  linkText: { color: colors.blue, fontFamily: fonts.extraBold, fontSize: 14 },
});
