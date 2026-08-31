import { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, fonts, radius, spacing } from '../theme';

const NATIVE_LANGUAGES = [
  {
    id: 'english',
    label: 'English',
    subtitle: 'I speak English',
    flag: '🇺🇸',
    accentColor: colors.blue,
  },
  {
    id: 'french',
    label: 'Français',
    subtitle: 'Je parle français',
    flag: '🇫🇷',
    accentColor: colors.coral,
  },
  {
    id: 'arabic',
    label: 'العربية',
    subtitle: 'أتحدث العربية',
    flag: '🇸🇦',
    accentColor: colors.africaGold,
  },
];

export default function LanguageSelectScreen({ onSelectLanguage, onBack }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        speed: 12,
        bounciness: 4,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colors.skyTop, colors.splash, colors.skyBottom]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <Text style={styles.backText}>←</Text>
          </Pressable>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar} />
          </View>
        </View>

        <Animated.View
          style={[
            styles.content,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <Text style={styles.title}>What language{"\n"}do you speak?</Text>
          <Text style={styles.subtitle}>
            This is the language we'll explain things in.
          </Text>

          <View style={styles.list}>
            {NATIVE_LANGUAGES.map((lang) => (
              <Pressable
                key={lang.id}
                onPress={() => onSelectLanguage(lang.id)}
                style={({ pressed }) => [
                  styles.card,
                  pressed && styles.cardPressed,
                ]}
              >
                <View style={[styles.flagBadge, { backgroundColor: lang.accentColor + '20' }]}>
                  <Text style={styles.flagEmoji}>{lang.flag}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardLabel}>{lang.label}</Text>
                  <Text style={styles.cardSubtitle}>{lang.subtitle}</Text>
                </View>
                <Text style={styles.arrow}>›</Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.splash,
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  backText: {
    color: colors.textMuted,
    fontFamily: fonts.extraBold,
    fontSize: 24,
  },
  progressContainer: {
    backgroundColor: colors.border,
    borderRadius: radius.pill,
    flex: 1,
    height: 8,
    marginLeft: spacing.sm,
    overflow: 'hidden',
  },
  progressBar: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: '100%',
    width: '25%',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.extraBold,
    fontSize: 28,
    letterSpacing: -0.3,
    lineHeight: 36,
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  list: {
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  cardPressed: {
    backgroundColor: colors.surfaceMuted,
    transform: [{ scale: 0.98 }],
  },
  flagBadge: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  flagEmoji: {
    fontSize: 28,
  },
  cardInfo: {
    flex: 1,
  },
  cardLabel: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 18,
  },
  cardSubtitle: {
    color: colors.textMuted,
    fontFamily: fonts.medium,
    fontSize: 13,
    marginTop: 2,
  },
  arrow: {
    color: colors.textLight,
    fontFamily: fonts.extraBold,
    fontSize: 28,
  },
});
