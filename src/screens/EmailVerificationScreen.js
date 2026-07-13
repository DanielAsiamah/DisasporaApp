import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import PrimaryButton from '../components/PrimaryButton';
import RegionalGuide from '../components/RegionalGuide';
import { useAuth } from '../context/AuthContext';
import { getAuthErrorMessage } from '../services/auth/authErrors';
const {
  RESEND_COOLDOWN_SECONDS,
  getResendLabel,
  nextCooldown,
  shouldAutoCheck,
} = require('../services/auth/emailVerificationFlow');
import { colors, fonts, radius, spacing } from '../theme';

export default function EmailVerificationScreen({ email, verificationSent = true, guideRegion, onContinue }) {
  const { checkEmailVerification, resendVerification } = useAuth();
  const [loadingAction, setLoadingAction] = useState(null);
  const [message, setMessage] = useState(verificationSent ? '' : 'We could not send the first email. Tap resend below.');
  const [isError, setIsError] = useState(!verificationSent);
  const [verified, setVerified] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(verificationSent ? RESEND_COOLDOWN_SECONDS : 0);
  const appState = useRef(AppState.currentState);
  const loadingRef = useRef(null);
  const finishTimerRef = useRef(null);

  const checkVerification = useCallback(async ({ automatic = false } = {}) => {
    if (loadingRef.current || verified) return;
    loadingRef.current = 'check';
    setLoadingAction('check');
    setMessage('');
    setIsError(false);
    try {
      const verified = await checkEmailVerification();
      if (!verified) {
        setIsError(true);
        setMessage(automatic
          ? 'We checked, but the link has not been confirmed yet. Tap it in your inbox, then return here.'
          : 'That email is not verified yet. Open the link in your inbox, then try again.');
        return;
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setVerified(true);
      setMessage('Email verified. Your learning path is ready.');
      finishTimerRef.current = setTimeout(onContinue, 700);
    } catch (error) {
      setIsError(true);
      setMessage(getAuthErrorMessage(error));
    } finally {
      loadingRef.current = null;
      setLoadingAction(null);
    }
  }, [checkEmailVerification, onContinue, verified]);

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const timer = setInterval(() => setResendCooldown(nextCooldown), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const previousState = appState.current;
      appState.current = nextState;
      if (shouldAutoCheck({ previousState, nextState, loadingAction: loadingRef.current })) {
        checkVerification({ automatic: true });
      }
    });
    return () => subscription.remove();
  }, [checkVerification]);

  useEffect(() => () => {
    if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
  }, []);

  async function resend() {
    if (resendCooldown > 0 || loadingRef.current) return;
    loadingRef.current = 'resend';
    setLoadingAction('resend');
    setMessage('');
    setIsError(false);
    try {
      await resendVerification();
      await Haptics.selectionAsync().catch(() => {});
      setMessage('A fresh verification email has been sent.');
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      setIsError(true);
      setMessage(getAuthErrorMessage(error));
    } finally {
      loadingRef.current = null;
      setLoadingAction(null);
    }
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(360)} style={styles.mailBadge}><Text style={styles.mailEmoji}>{verified ? '✓' : '✉️'}</Text></Animated.View>
          <RegionalGuide active animated region={guideRegion} size="medium" showLabel />
          <Text style={styles.eyebrow}>ONE QUICK CHECK</Text>
          <Text style={styles.title}>Verify your email</Text>
          <Text style={styles.subtitle}>We sent a secure link to</Text>
          <Text selectable style={styles.email}>{email}</Text>
          <Text style={styles.body}>Verification protects your streak and makes account recovery easier.</Text>

          <View style={styles.stepsCard}>
            {['Open your inbox', 'Tap the secure link', 'Return to Diaspora'].map((label, index) => (
              <View key={label} style={styles.stepItem}>
                <View style={[styles.stepNumber, verified && styles.stepNumberDone]}>
                  <Text style={styles.stepNumberText}>{verified ? '✓' : index + 1}</Text>
                </View>
                <Text style={styles.stepLabel}>{label}</Text>
              </View>
            ))}
          </View>

          {message ? (
            <Animated.View accessibilityLiveRegion="polite" entering={FadeInDown.duration(240)} style={[styles.messageCard, isError && styles.messageCardError, verified && styles.messageCardSuccess]}>
              <Text style={[styles.message, isError && styles.error]}>{message}</Text>
            </Animated.View>
          ) : null}

          <View style={styles.actions}>
            {loadingAction === 'check' ? <View style={styles.checkingRow}><ActivityIndicator color={colors.primary} /><Text style={styles.checkingText}>Checking securely…</Text></View> : <PrimaryButton disabled={verified} label={verified ? 'VERIFIED' : 'I VERIFIED MY EMAIL'} onPress={() => checkVerification()} />}
            <Pressable disabled={Boolean(loadingAction) || resendCooldown > 0 || verified} onPress={resend} style={styles.linkButton}>
              {loadingAction === 'resend' ? <ActivityIndicator color={colors.blue} /> : <Text style={[styles.linkText, (resendCooldown > 0 || verified) && styles.linkTextDisabled]}>{verified ? 'Verification complete' : getResendLabel(resendCooldown)}</Text>}
            </Pressable>
            <Pressable disabled={Boolean(loadingAction) || verified} onPress={onContinue} style={styles.skipButton}>
              <Text style={styles.skipText}>Continue for now</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.skyBottom, flex: 1 },
  safeArea: { flex: 1 },
  content: { alignItems: 'center', flexGrow: 1, justifyContent: 'center', paddingBottom: spacing.xl, paddingTop: spacing.lg },
  mailBadge: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderColor: colors.border, borderRadius: radius.pill, borderWidth: 2, height: 54, justifyContent: 'center', marginBottom: spacing.sm, width: 54 },
  mailEmoji: { fontSize: 27 },
  eyebrow: { color: colors.primary, fontFamily: fonts.extraBold, fontSize: 12, letterSpacing: 1.3, marginTop: spacing.lg },
  title: { color: colors.text, fontFamily: fonts.extraBold, fontSize: 31, lineHeight: 38, marginTop: spacing.xs },
  subtitle: { color: colors.textMuted, fontFamily: fonts.medium, fontSize: 14, marginTop: spacing.sm },
  email: { color: colors.blue, fontFamily: fonts.extraBold, fontSize: 16, marginTop: spacing.xs },
  body: { color: colors.textMuted, fontFamily: fonts.medium, fontSize: 14, lineHeight: 21, marginTop: spacing.md, maxWidth: 360, textAlign: 'center', width: '88%' },
  stepsCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 2, flexDirection: 'row', gap: 6, marginTop: spacing.lg, maxWidth: 420, padding: spacing.md, width: '88%' },
  stepItem: { alignItems: 'center', flex: 1, gap: 7 },
  stepNumber: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderColor: colors.border, borderRadius: radius.pill, borderWidth: 2, height: 28, justifyContent: 'center', width: 28 },
  stepNumberDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  stepNumberText: { color: colors.text, fontFamily: fonts.extraBold, fontSize: 12 },
  stepLabel: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 10, lineHeight: 14, textAlign: 'center' },
  messageCard: { backgroundColor: colors.primaryLight, borderColor: colors.primary, borderRadius: radius.md, borderWidth: 1, marginTop: spacing.md, maxWidth: 420, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, width: '88%' },
  messageCardError: { backgroundColor: colors.surfaceMuted, borderColor: colors.error },
  messageCardSuccess: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  message: { color: colors.primary, fontFamily: fonts.semiBold, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  error: { color: colors.error },
  actions: { gap: spacing.xs, marginTop: spacing.lg, maxWidth: 420, width: '88%' },
  checkingRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', minHeight: 54 },
  checkingText: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 13 },
  linkButton: { alignItems: 'center', padding: spacing.sm },
  linkText: { color: colors.blue, fontFamily: fonts.extraBold, fontSize: 14 },
  linkTextDisabled: { color: colors.textLight },
  skipButton: { alignItems: 'center', padding: spacing.sm },
  skipText: { color: colors.textLight, fontFamily: fonts.bold, fontSize: 13 },
});
