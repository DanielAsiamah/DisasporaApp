import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import AuthScreenFrame, { AUTH_PALETTE } from '../components/AuthScreenFrame';
import PrimaryButton from '../components/PrimaryButton';
import { useAuth } from '../context/AuthContext';
import { getAuthErrorMessage } from '../services/auth/authErrors';
import { fonts, radius, spacing } from '../theme';
const { getCourseById } = require('../data/courseCatalog.cjs');
const { getStartingLevelLabel } = require('../onboarding/authHandoff');

function formatReminderTime(value = '19:00') {
  const [rawHour, minute = '00'] = value.split(':');
  const hour = Number(rawHour);
  if (!Number.isFinite(hour)) return 'Daily reminder';
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${suffix}`;
}

export default function AccountChoiceScreen({
  onboardingData,
  onBack,
  onEmail,
  onSuccess,
  onExistingAccount,
}) {
  const { signInWithGoogle, signInWithApple } = useAuth();
  const [loadingProvider, setLoadingProvider] = useState(null);
  const [error, setError] = useState('');
  const isExpoGo = Constants.appOwnership === 'expo';
  const googleConfigured = Boolean(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);
  const courseTitle = getCourseById(onboardingData?.currentCourse)?.displayName || 'Your language';
  const planItems = [
    { id: 'course', emoji: '🗺️', label: 'LEARNING', value: courseTitle },
    { id: 'goal', emoji: '⏱️', label: 'DAILY GOAL', value: `${onboardingData?.dailyGoalMinutes || 10} minutes` },
    { id: 'level', emoji: '🌱', label: 'STARTING AT', value: getStartingLevelLabel(onboardingData?.proficiencyLevel) },
    {
      id: 'reminder',
      emoji: onboardingData?.reminderEnabled ? '🔔' : '🌙',
      label: 'REMINDER',
      value: onboardingData?.reminderEnabled ? formatReminderTime(onboardingData.reminderTime) : 'Not right now',
    },
  ];

  async function continueWith(provider) {
    setError('');
    setLoadingProvider(provider);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    try {
      if (isExpoGo && provider === 'google') {
        throw new Error('Google sign-in needs the Diaspora development build. Use email while testing in Expo Go.');
      }
      const result = provider === 'google'
        ? await signInWithGoogle(onboardingData)
        : await signInWithApple(onboardingData);
      await onSuccess(result);
    } catch (providerError) {
      if (providerError?.code !== 'ERR_REQUEST_CANCELED') {
        setError(providerError?.message || getAuthErrorMessage(providerError));
      }
    } finally {
      setLoadingProvider(null);
    }
  }

  return (
    <AuthScreenFrame
      centerContent
      eyebrow="Your path is ready"
      headerLabel="Final step"
      onBack={onBack}
      subtitle={`Keep ${courseTitle}, your daily goal, and your lesson progress available on every device.`}
      title={`Save your progress${onboardingData?.preferredName ? `, ${onboardingData.preferredName}` : ''}`}
      footer={(
        <Pressable onPress={onExistingAccount} style={styles.signInLink}>
          <Text style={styles.signInText}>Already have an account? Sign in</Text>
        </Pressable>
      )}
    >
      <Animated.View entering={FadeInDown.delay(100).duration(320)} style={styles.planCard}>
        <View style={styles.planHeader}>
          <View>
            <Text style={styles.planEyebrow}>YOUR LEARNING PLAN</Text>
            <Text style={styles.planTitle}>Ready to begin</Text>
          </View>
          <View style={styles.readyBadge}>
            <Text style={styles.readyBadgeText}>✓</Text>
          </View>
        </View>
        <View style={styles.planGrid}>
          {planItems.map((item) => (
            <View
              accessibilityLabel={`${item.label}: ${item.value}`}
              key={item.id}
              style={styles.planItem}
            >
              <Text style={styles.planEmoji}>{item.emoji}</Text>
              <View style={styles.planItemCopy}>
                <Text style={styles.planItemLabel}>{item.label}</Text>
                <Text numberOfLines={2} style={styles.planItemValue}>{item.value}</Text>
              </View>
            </View>
          ))}
        </View>
      </Animated.View>

      <View style={styles.providers}>
        <ProviderButton
          disabled={Boolean(loadingProvider) || !googleConfigured || isExpoGo}
          icon="G"
          label="Continue with Google"
          loading={loadingProvider === 'google'}
          onPress={() => continueWith('google')}
        />
        {Platform.OS === 'ios' ? (
          <ProviderButton
            dark
            disabled={Boolean(loadingProvider)}
            icon="●"
            label="Continue with Apple"
            loading={loadingProvider === 'apple'}
            onPress={() => continueWith('apple')}
          />
        ) : null}
        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.divider} />
        </View>
        <PrimaryButton label="CONTINUE WITH EMAIL" onPress={onEmail} style={styles.emailButton} variant="secondary" />
      </View>

      {error ? <Text selectable style={styles.error}>{error}</Text> : null}
      {__DEV__ && isExpoGo ? (
        <Text style={styles.devNote}>
          Google is enabled in the native development build; email remains available in Expo Go.
        </Text>
      ) : null}
      {__DEV__ && !googleConfigured ? (
        <Text style={styles.devNote}>
          This development build still needs its Google OAuth client ID.
        </Text>
      ) : null}
    </AuthScreenFrame>
  );
}

function ProviderButton({ icon, label, onPress, loading, disabled = false, dark = false }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.providerButton,
        dark && styles.providerButtonDark,
        disabled && styles.providerDisabled,
        pressed && styles.providerPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={dark ? '#FFFFFF' : AUTH_PALETTE.brandBlue} />
      ) : (
        <Text style={[styles.providerIcon, dark && styles.providerLabelDark]}>{icon}</Text>
      )}
      <Text style={[styles.providerLabel, dark && styles.providerLabelDark]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  planCard: {
    backgroundColor: AUTH_PALETTE.white,
    borderColor: AUTH_PALETTE.border,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    gap: spacing.md,
    padding: spacing.md,
    width: '100%',
  },
  planHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  planEyebrow: {
    color: AUTH_PALETTE.textSoft,
    fontFamily: fonts.extraBold,
    fontSize: 9,
    letterSpacing: 0.8,
  },
  planTitle: {
    color: AUTH_PALETTE.brandBlue,
    fontFamily: fonts.extraBold,
    fontSize: 18,
    marginTop: 2,
  },
  readyBadge: {
    alignItems: 'center',
    backgroundColor: AUTH_PALETTE.success,
    borderRadius: radius.pill,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  readyBadgeText: {
    color: AUTH_PALETTE.white,
    fontFamily: fonts.extraBold,
    fontSize: 16,
  },
  planGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  planItem: {
    alignItems: 'center',
    backgroundColor: AUTH_PALETTE.skySoft,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: 8,
    minHeight: 58,
    padding: spacing.sm,
    width: '48%',
  },
  planEmoji: {
    fontSize: 19,
  },
  planItemCopy: {
    flex: 1,
  },
  planItemLabel: {
    color: AUTH_PALETTE.textSoft,
    fontFamily: fonts.extraBold,
    fontSize: 8,
    letterSpacing: 0.5,
  },
  planItemValue: {
    color: AUTH_PALETTE.brandBlue,
    fontFamily: fonts.bold,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  providers: {
    gap: 12,
    marginTop: spacing.lg,
    width: '100%',
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
    minHeight: 56,
    paddingHorizontal: spacing.md,
  },
  providerButtonDark: {
    backgroundColor: '#101113',
    borderColor: '#101113',
  },
  providerPressed: {
    transform: [{ translateY: 2 }],
  },
  providerDisabled: {
    opacity: 0.65,
  },
  providerIcon: {
    color: AUTH_PALETTE.brandBlue,
    fontFamily: fonts.extraBold,
    fontSize: 19,
    width: 24,
  },
  providerLabel: {
    color: AUTH_PALETTE.brandBlue,
    fontFamily: fonts.extraBold,
    fontSize: 15,
  },
  providerLabelDark: {
    color: '#FFFFFF',
  },
  dividerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 2,
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
  emailButton: {
    width: '100%',
  },
  error: {
    color: '#FF4B4B',
    fontFamily: fonts.semiBold,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  devNote: {
    color: AUTH_PALETTE.textSoft,
    fontFamily: fonts.medium,
    fontSize: 10,
    lineHeight: 15,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  signInLink: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  signInText: {
    color: AUTH_PALETTE.sky,
    fontFamily: fonts.extraBold,
    fontSize: 14,
  },
});
