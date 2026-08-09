import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import AuthScreenFrame, { AUTH_PALETTE } from '../components/AuthScreenFrame';
import PrimaryButton from '../components/PrimaryButton';
import { useAuth } from '../context/AuthContext';
import { getAuthErrorMessage } from '../services/auth/authErrors';
const {
  RESEND_COOLDOWN_SECONDS,
  getResendLabel,
  nextCooldown,
  shouldAutoCheck,
} = require('../services/auth/emailVerificationFlow');
import { fonts, radius, spacing } from '../theme';

export default function EmailVerificationScreen({
  email,
  verificationSent = true,
  guideRegion,
  onContinue,
}) {
  const { checkEmailVerification, resendVerification } = useAuth();
  const [loadingAction, setLoadingAction] = useState(null);
  const [message, setMessage] = useState(
    verificationSent ? '' : 'We could not send the first email. Tap resend below.'
  );
  const [isError, setIsError] = useState(!verificationSent);
  const [verified, setVerified] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(
    verificationSent ? RESEND_COOLDOWN_SECONDS : 0
  );
  const appState = useRef(AppState.currentState);
  const loadingRef = useRef(null);
  const finishTimerRef = useRef(null);

  const checkVerification = useCallback(
    async ({ automatic = false } = {}) => {
      if (loadingRef.current || verified) return;
      loadingRef.current = 'check';
      setLoadingAction('check');
      setMessage('');
      setIsError(false);
      try {
        const hasVerifiedEmail = await checkEmailVerification();
        if (!hasVerifiedEmail) {
          setIsError(true);
          setMessage(
            automatic
              ? 'We checked, but the link has not been confirmed yet. Tap it in your inbox, then return here.'
              : 'That email is not verified yet. Open the link in your inbox, then try again.'
          );
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
    },
    [checkEmailVerification, onContinue, verified]
  );

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

  useEffect(
    () => () => {
      if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
    },
    []
  );

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
    <AuthScreenFrame
      centerContent
      eyebrow="One quick check"
      headerLabel="Verify email"
      onBack={onContinue}
      subtitle="We sent a secure link to"
      title="Verify your email"
      hero={(
        <Animated.View entering={FadeInDown.duration(360)} style={styles.mailBadge}>
          <Text style={styles.mailEmoji}>{verified ? '✓' : '✉️'}</Text>
        </Animated.View>
      )}
    >
      <Text selectable style={styles.email}>{email}</Text>
      <Text style={styles.body}>
        Verification protects your streak and makes account recovery easier.
      </Text>

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
        <Animated.View
          accessibilityLiveRegion="polite"
          entering={FadeInDown.duration(240)}
          style={[
            styles.messageCard,
            isError && styles.messageCardError,
            verified && styles.messageCardSuccess,
          ]}
        >
          <Text style={[styles.message, isError && styles.error]}>{message}</Text>
        </Animated.View>
      ) : null}

      <View style={styles.actions}>
        {loadingAction === 'check' ? (
          <View style={styles.checkingRow}>
            <ActivityIndicator color={AUTH_PALETTE.sky} />
            <Text style={styles.checkingText}>Checking securely…</Text>
          </View>
        ) : (
          <PrimaryButton
            disabled={verified}
            label={verified ? 'VERIFIED' : 'I VERIFIED MY EMAIL'}
            onPress={() => checkVerification()}
            style={styles.button}
          />
        )}
        <Text
          onPress={verified ? undefined : resend}
          style={[styles.linkText, (resendCooldown > 0 || verified) && styles.linkTextDisabled]}
        >
          {loadingAction === 'resend'
            ? 'Sending a fresh email…'
            : verified
              ? 'Verification complete'
              : getResendLabel(resendCooldown)}
        </Text>
        <Text onPress={verified ? undefined : onContinue} style={styles.skipText}>
          Continue for now
        </Text>
      </View>
    </AuthScreenFrame>
  );
}

const styles = StyleSheet.create({
  mailBadge: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: AUTH_PALETTE.white,
    borderColor: AUTH_PALETTE.border,
    borderRadius: radius.pill,
    borderWidth: 2,
    height: 56,
    justifyContent: 'center',
    marginBottom: spacing.sm,
    width: 56,
  },
  mailEmoji: {
    fontSize: 27,
  },
  email: {
    color: AUTH_PALETTE.sky,
    fontFamily: fonts.extraBold,
    fontSize: 16,
    textAlign: 'center',
  },
  body: {
    color: AUTH_PALETTE.textMuted,
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  stepsCard: {
    backgroundColor: AUTH_PALETTE.white,
    borderColor: AUTH_PALETTE.border,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 6,
    marginTop: spacing.lg,
    padding: spacing.md,
    width: '100%',
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
    gap: 7,
  },
  stepNumber: {
    alignItems: 'center',
    backgroundColor: AUTH_PALETTE.skySoft,
    borderColor: AUTH_PALETTE.border,
    borderRadius: radius.pill,
    borderWidth: 2,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  stepNumberDone: {
    backgroundColor: AUTH_PALETTE.success,
    borderColor: AUTH_PALETTE.success,
  },
  stepNumberText: {
    color: AUTH_PALETTE.brandBlue,
    fontFamily: fonts.extraBold,
    fontSize: 12,
  },
  stepLabel: {
    color: AUTH_PALETTE.textMuted,
    fontFamily: fonts.bold,
    fontSize: 10,
    lineHeight: 14,
    textAlign: 'center',
  },
  messageCard: {
    backgroundColor: AUTH_PALETTE.skySoft,
    borderColor: AUTH_PALETTE.sky,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    width: '100%',
  },
  messageCardError: {
    backgroundColor: '#FFF2F2',
    borderColor: '#FF4B4B',
  },
  messageCardSuccess: {
    backgroundColor: '#ECFFF4',
    borderColor: AUTH_PALETTE.success,
  },
  message: {
    color: AUTH_PALETTE.brandBlue,
    fontFamily: fonts.semiBold,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  error: {
    color: '#FF4B4B',
  },
  actions: {
    gap: spacing.xs,
    marginTop: spacing.lg,
    width: '100%',
  },
  button: {
    width: '100%',
  },
  checkingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 54,
  },
  checkingText: {
    color: AUTH_PALETTE.textMuted,
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  linkText: {
    color: AUTH_PALETTE.sky,
    fontFamily: fonts.extraBold,
    fontSize: 14,
    paddingVertical: spacing.sm,
    textAlign: 'center',
  },
  linkTextDisabled: {
    color: AUTH_PALETTE.textSoft,
  },
  skipText: {
    color: AUTH_PALETTE.textSoft,
    fontFamily: fonts.bold,
    fontSize: 13,
    paddingVertical: spacing.sm,
    textAlign: 'center',
  },
});
