import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import PrimaryButton from '../components/PrimaryButton';
import RegionalGuide from '../components/RegionalGuide';
import { useAuth } from '../context/AuthContext';
import { coursesData } from '../data/generatedCourses';
import { getAuthErrorMessage } from '../services/auth/authErrors';
import { colors, fonts, radius, spacing } from '../theme';

const LEVEL_LABELS = {
  beginner: 'Beginner start',
  some: 'Basics refresher',
  comfortable: 'Comfortable start',
};

function formatReminderTime(value = '19:00') {
  const [rawHour, minute = '00'] = value.split(':');
  const hour = Number(rawHour);
  if (!Number.isFinite(hour)) return 'Daily reminder';
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${suffix}`;
}

export default function AccountChoiceScreen({ onboardingData, onBack, onEmail, onSuccess, onExistingAccount }) {
  const { signInWithGoogle, signInWithApple } = useAuth();
  const [loadingProvider, setLoadingProvider] = useState(null);
  const [error, setError] = useState('');
  const isExpoGo = Constants.appOwnership === 'expo';
  const googleConfigured = Boolean(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);
  const courseTitle = coursesData[onboardingData?.currentCourse]?.title || 'Your language';
  const planItems = [
    { id: 'course', emoji: '🗺️', label: 'LEARNING', value: courseTitle },
    { id: 'goal', emoji: '⏱️', label: 'DAILY GOAL', value: `${onboardingData?.dailyGoalMinutes || 10} minutes` },
    { id: 'level', emoji: '🌱', label: 'STARTING AT', value: LEVEL_LABELS[onboardingData?.proficiencyLevel] || 'Beginner start' },
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
      onSuccess(result.profile);
    } catch (providerError) {
      if (providerError?.code !== 'ERR_REQUEST_CANCELED') {
        setError(providerError?.message || getAuthErrorMessage(providerError));
      }
    } finally {
      setLoadingProvider(null);
    }
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Go back" onPress={onBack} style={styles.backButton}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <Text style={styles.headerLabel}>FINAL STEP</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <RegionalGuide active animated region={onboardingData?.guideRegion} size="large" showLabel />
          <View style={styles.copy}>
            <Text style={styles.eyebrow}>YOUR PATH IS READY</Text>
            <Text style={styles.title}>Save your progress{onboardingData?.preferredName ? `, ${onboardingData.preferredName}` : ''}</Text>
            <Text style={styles.subtitle}>Keep your daily goal, language path, XP, and streak available on every device.</Text>
          </View>

          <Animated.View entering={FadeInDown.delay(100).duration(320)} style={styles.planCard}>
            <View style={styles.planHeader}>
              <View>
                <Text style={styles.planEyebrow}>YOUR LEARNING PLAN</Text>
                <Text style={styles.planTitle}>Ready to begin</Text>
              </View>
              <View style={styles.readyBadge}><Text style={styles.readyBadgeText}>✓</Text></View>
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
              <ProviderButton dark disabled={Boolean(loadingProvider)} icon="●" label="Continue with Apple" loading={loadingProvider === 'apple'} onPress={() => continueWith('apple')} />
            ) : null}
            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.divider} />
            </View>
            <PrimaryButton label="CONTINUE WITH EMAIL" onPress={onEmail} variant="secondary" />
          </View>

          {error ? <Text selectable style={styles.error}>{error}</Text> : null}
          {__DEV__ && isExpoGo ? <Text style={styles.devNote}>Google is enabled in the native development build; email remains available in Expo Go.</Text> : null}
          {__DEV__ && !googleConfigured ? <Text style={styles.devNote}>This development build still needs its Google OAuth client ID.</Text> : null}
        </ScrollView>

        <Pressable onPress={onExistingAccount} style={styles.signInLink}>
          <Text style={styles.signInText}>Already have an account? Sign in</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

function ProviderButton({ icon, label, onPress, loading, disabled = false, dark = false }) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.providerButton, dark && styles.providerButtonDark, disabled && styles.providerDisabled, pressed && styles.providerPressed]}>
      {loading ? <ActivityIndicator color={dark ? '#FFFFFF' : colors.text} /> : <Text style={[styles.providerIcon, dark && styles.providerLabelDark]}>{icon}</Text>}
      <Text style={[styles.providerLabel, dark && styles.providerLabelDark]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.skyBottom, flex: 1 },
  safeArea: { flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', gap: 12, paddingHorizontal: spacing.lg, paddingVertical: 12 },
  backButton: { alignItems: 'center', height: 42, justifyContent: 'center', width: 34 },
  backText: { color: colors.text, fontFamily: fonts.bold, fontSize: 34, lineHeight: 36 },
  headerLabel: { color: colors.accent, fontFamily: fonts.extraBold, fontSize: 12, letterSpacing: 1.4 },
  content: { alignItems: 'center', flexGrow: 1, gap: spacing.lg, justifyContent: 'center', paddingVertical: spacing.lg },
  copy: { alignItems: 'center', gap: 8, width: '88%' },
  eyebrow: { color: colors.primary, fontFamily: fonts.extraBold, fontSize: 12, letterSpacing: 1.3 },
  title: { color: colors.text, fontFamily: fonts.extraBold, fontSize: 28, lineHeight: 35, textAlign: 'center' },
  subtitle: { color: colors.textMuted, fontFamily: fonts.medium, fontSize: 14, lineHeight: 21, maxWidth: 350, textAlign: 'center' },
  planCard: { backgroundColor: colors.surface, borderBottomColor: '#0B0908', borderBottomWidth: 4, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 2, gap: spacing.md, maxWidth: 420, padding: spacing.md, width: '88%' },
  planHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  planEyebrow: { color: colors.accent, fontFamily: fonts.extraBold, fontSize: 9, letterSpacing: 0.8 },
  planTitle: { color: colors.text, fontFamily: fonts.extraBold, fontSize: 18, marginTop: 2 },
  readyBadge: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.pill, height: 30, justifyContent: 'center', width: 30 },
  readyBadgeText: { color: colors.surface, fontFamily: fonts.extraBold, fontSize: 16 },
  planGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  planItem: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.md, flexDirection: 'row', gap: 8, minHeight: 58, padding: spacing.sm, width: '48%' },
  planEmoji: { fontSize: 19 },
  planItemCopy: { flex: 1 },
  planItemLabel: { color: colors.textLight, fontFamily: fonts.extraBold, fontSize: 8, letterSpacing: 0.5 },
  planItemValue: { color: colors.text, fontFamily: fonts.bold, fontSize: 11, lineHeight: 15, marginTop: 2 },
  providers: { gap: 12, maxWidth: 420, width: '88%' },
  providerButton: { alignItems: 'center', backgroundColor: colors.surface, borderBottomColor: '#0B0908', borderBottomWidth: 4, borderColor: colors.border, borderRadius: radius.md, borderWidth: 2, flexDirection: 'row', gap: 12, justifyContent: 'center', minHeight: 56, paddingHorizontal: spacing.md },
  providerButtonDark: { backgroundColor: '#000000', borderColor: '#2F2F2F' },
  providerPressed: { borderBottomWidth: 2, transform: [{ translateY: 2 }] },
  providerDisabled: { opacity: 0.65 },
  providerIcon: { color: colors.text, fontFamily: fonts.extraBold, fontSize: 19, width: 24 },
  providerLabel: { color: colors.text, fontFamily: fonts.extraBold, fontSize: 15 },
  providerLabelDark: { color: '#FFFFFF' },
  dividerRow: { alignItems: 'center', flexDirection: 'row', gap: 12, paddingVertical: 2 },
  divider: { backgroundColor: colors.border, flex: 1, height: 1 },
  dividerText: { color: colors.textLight, fontFamily: fonts.bold, fontSize: 11 },
  error: { color: colors.error, fontFamily: fonts.semiBold, fontSize: 12, lineHeight: 18, maxWidth: 380, textAlign: 'center' },
  devNote: { color: colors.textLight, fontFamily: fonts.medium, fontSize: 10, lineHeight: 15, maxWidth: 370, textAlign: 'center' },
  signInLink: { alignItems: 'center', padding: spacing.lg },
  signInText: { color: colors.blue, fontFamily: fonts.extraBold, fontSize: 14 },
});
