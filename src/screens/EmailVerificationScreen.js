import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import PrimaryButton from '../components/PrimaryButton';
import RegionalGuide from '../components/RegionalGuide';
import { useAuth } from '../context/AuthContext';
import { getAuthErrorMessage } from '../services/auth/authErrors';
import { colors, fonts, radius, spacing } from '../theme';

export default function EmailVerificationScreen({ email, verificationSent = true, guideRegion, onContinue }) {
  const { checkEmailVerification, resendVerification } = useAuth();
  const [loadingAction, setLoadingAction] = useState(null);
  const [message, setMessage] = useState(verificationSent ? '' : 'We could not send the first email. Tap resend below.');
  const [isError, setIsError] = useState(!verificationSent);

  async function checkVerification() {
    setLoadingAction('check');
    setMessage('');
    setIsError(false);
    try {
      const verified = await checkEmailVerification();
      if (!verified) {
        setIsError(true);
        setMessage('That email is not verified yet. Open the link in your inbox, then try again.');
        return;
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onContinue();
    } catch (error) {
      setIsError(true);
      setMessage(getAuthErrorMessage(error));
    } finally {
      setLoadingAction(null);
    }
  }

  async function resend() {
    setLoadingAction('resend');
    setMessage('');
    setIsError(false);
    try {
      await resendVerification();
      await Haptics.selectionAsync().catch(() => {});
      setMessage('A fresh verification email has been sent.');
    } catch (error) {
      setIsError(true);
      setMessage(getAuthErrorMessage(error));
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.mailBadge}><Text style={styles.mailEmoji}>✉️</Text></View>
          <RegionalGuide region={guideRegion} size="medium" showLabel />
          <Text style={styles.eyebrow}>ONE QUICK CHECK</Text>
          <Text style={styles.title}>Verify your email</Text>
          <Text style={styles.subtitle}>We sent a secure link to</Text>
          <Text selectable style={styles.email}>{email}</Text>
          <Text style={styles.body}>Verification protects your streak and makes account recovery easier.</Text>

          {message ? <Text style={[styles.message, isError && styles.error]}>{message}</Text> : null}

          <View style={styles.actions}>
            {loadingAction === 'check' ? <ActivityIndicator color={colors.primary} /> : <PrimaryButton label="I VERIFIED MY EMAIL" onPress={checkVerification} />}
            <Pressable disabled={Boolean(loadingAction)} onPress={resend} style={styles.linkButton}>
              {loadingAction === 'resend' ? <ActivityIndicator color={colors.blue} /> : <Text style={styles.linkText}>Resend verification email</Text>}
            </Pressable>
            <Pressable disabled={Boolean(loadingAction)} onPress={onContinue} style={styles.skipButton}>
              <Text style={styles.skipText}>Continue for now</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.skyBottom, flex: 1 },
  safeArea: { flex: 1 },
  content: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingVertical: spacing.lg },
  mailBadge: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderColor: colors.border, borderRadius: radius.pill, borderWidth: 2, height: 58, justifyContent: 'center', marginBottom: spacing.md, width: 58 },
  mailEmoji: { fontSize: 27 },
  eyebrow: { color: colors.primary, fontFamily: fonts.extraBold, fontSize: 12, letterSpacing: 1.3, marginTop: spacing.lg },
  title: { color: colors.text, fontFamily: fonts.extraBold, fontSize: 31, lineHeight: 38, marginTop: spacing.xs },
  subtitle: { color: colors.textMuted, fontFamily: fonts.medium, fontSize: 14, marginTop: spacing.sm },
  email: { color: colors.blue, fontFamily: fonts.extraBold, fontSize: 16, marginTop: spacing.xs },
  body: { color: colors.textMuted, fontFamily: fonts.medium, fontSize: 14, lineHeight: 21, marginTop: spacing.md, maxWidth: 360, textAlign: 'center', width: '88%' },
  message: { color: colors.primary, fontFamily: fonts.semiBold, fontSize: 12, lineHeight: 18, marginTop: spacing.md, maxWidth: 360, textAlign: 'center' },
  error: { color: colors.error },
  actions: { gap: spacing.sm, marginTop: spacing.xl, maxWidth: 420, width: '88%' },
  linkButton: { alignItems: 'center', padding: spacing.sm },
  linkText: { color: colors.blue, fontFamily: fonts.extraBold, fontSize: 14 },
  skipButton: { alignItems: 'center', padding: spacing.sm },
  skipText: { color: colors.textLight, fontFamily: fonts.bold, fontSize: 13 },
});
