import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import PrimaryButton from '../components/PrimaryButton';
import RegionalGuide from '../components/RegionalGuide';
import { useAuth } from '../context/AuthContext';
import { getAuthErrorMessage } from '../services/auth/authErrors';
import { colors, fonts, radius, spacing } from '../theme';

export default function AccountChoiceScreen({ onboardingData, onBack, onEmail, onSuccess, onExistingAccount }) {
  const { signInWithGoogle, signInWithApple } = useAuth();
  const [loadingProvider, setLoadingProvider] = useState(null);
  const [error, setError] = useState('');
  const isExpoGo = Constants.appOwnership === 'expo';

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

        <View style={styles.content}>
          <RegionalGuide region={onboardingData?.guideRegion} size="large" showLabel />
          <View style={styles.copy}>
            <Text style={styles.eyebrow}>YOUR PATH IS READY</Text>
            <Text style={styles.title}>Save your progress, {onboardingData?.preferredName}</Text>
            <Text style={styles.subtitle}>Keep your daily goal, language path, XP, and streak available on every device.</Text>
          </View>

          <View style={styles.providers}>
            <ProviderButton icon="G" label="Continue with Google" loading={loadingProvider === 'google'} onPress={() => continueWith('google')} />
            {process.env.EXPO_OS === 'ios' ? (
              <ProviderButton dark icon="●" label="Continue with Apple" loading={loadingProvider === 'apple'} onPress={() => continueWith('apple')} />
            ) : null}
            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.divider} />
            </View>
            <PrimaryButton label="CONTINUE WITH EMAIL" onPress={onEmail} variant="secondary" />
          </View>

          {error ? <Text selectable style={styles.error}>{error}</Text> : null}
          {isExpoGo ? <Text style={styles.devNote}>Google is enabled in the native development build; email remains available in Expo Go.</Text> : null}
        </View>

        <Pressable onPress={onExistingAccount} style={styles.signInLink}>
          <Text style={styles.signInText}>Already have an account? Sign in</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

function ProviderButton({ icon, label, onPress, loading, dark = false }) {
  return (
    <Pressable accessibilityRole="button" disabled={loading} onPress={onPress} style={({ pressed }) => [styles.providerButton, dark && styles.providerButtonDark, pressed && styles.providerPressed]}>
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
  content: { alignItems: 'center', flex: 1, gap: spacing.lg, justifyContent: 'center', paddingHorizontal: spacing.lg },
  copy: { alignItems: 'center', gap: 8 },
  eyebrow: { color: colors.primary, fontFamily: fonts.extraBold, fontSize: 12, letterSpacing: 1.3 },
  title: { color: colors.text, fontFamily: fonts.extraBold, fontSize: 28, lineHeight: 35, textAlign: 'center' },
  subtitle: { color: colors.textMuted, fontFamily: fonts.medium, fontSize: 14, lineHeight: 21, maxWidth: 350, textAlign: 'center' },
  providers: { gap: 12, maxWidth: 420, width: '100%' },
  providerButton: { alignItems: 'center', backgroundColor: colors.surface, borderBottomColor: '#0B0908', borderBottomWidth: 4, borderColor: colors.border, borderRadius: radius.md, borderWidth: 2, flexDirection: 'row', gap: 12, justifyContent: 'center', minHeight: 56, paddingHorizontal: spacing.md },
  providerButtonDark: { backgroundColor: '#000000', borderColor: '#2F2F2F' },
  providerPressed: { borderBottomWidth: 2, transform: [{ translateY: 2 }] },
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
