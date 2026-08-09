import { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import AnimatedAtmosphere from '../components/AnimatedAtmosphere';
import { AUTH_PALETTE } from '../components/AuthScreenFrame';
import { colors, fonts, radius, spacing } from '../theme';

const NATIVE_LANGUAGES = [
  {
    id: 'english',
    label: 'English',
    subtitle: 'Learn from English',
    flag: '🇺🇸',
    accentColor: colors.blue,
  },
  {
    id: 'french',
    label: 'Français',
    subtitle: 'Apprendre depuis le français',
    flag: '🇫🇷',
    accentColor: colors.coral,
  },
  {
    id: 'arabic',
    label: 'العربية',
    subtitle: 'تعلم من اللغة العربية',
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
  }, []);

  return (
    <View style={styles.root}>
      <AnimatedAtmosphere
        colors={[AUTH_PALETTE.backgroundTop, AUTH_PALETTE.backgroundBottom]}
        accent={AUTH_PALETTE.sky}
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
          <Text style={styles.title}>What language do you speak best?</Text>
          <Text style={styles.subtitle}>
            Choose your base language and we’ll open the matching Diaspora course lane.
          </Text>

          <View style={styles.list}>
            {NATIVE_LANGUAGES.map((lang) => (
              <Pressable
                accessibilityState={{ disabled: Boolean(lang.disabled) }}
                disabled={lang.disabled}
                key={lang.id}
                onPress={() => onSelectLanguage(lang.id)}
                style={({ pressed }) => [
                  styles.card,
                  lang.disabled && styles.cardDisabled,
                  pressed && !lang.disabled && styles.cardPressed,
                  { borderBottomColor: lang.accentColor + '99' },
                ]}
              >
                <View style={[styles.flagBadge, { backgroundColor: lang.accentColor + '20' }]}>
                  <Text style={styles.flagEmoji}>{lang.flag}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardLabel}>{lang.label}</Text>
                  <Text style={styles.cardSubtitle}>{lang.disabled ? 'Courses coming soon' : lang.subtitle}</Text>
                </View>
                <Text style={styles.arrow}>➔</Text>
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
    flex: 1,
    backgroundColor: AUTH_PALETTE.backgroundBottom,
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
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  backText: {
    color: AUTH_PALETTE.brandBlue,
    fontFamily: fonts.black,
    fontSize: 24,
  },
  progressContainer: {
    backgroundColor: AUTH_PALETTE.border,
    borderRadius: radius.pill,
    flex: 1,
    height: 10,
    marginLeft: spacing.sm,
    overflow: 'hidden',
  },
  progressBar: {
    backgroundColor: AUTH_PALETTE.sky,
    height: '100%',
    width: '33%',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  title: {
    color: AUTH_PALETTE.brandBlue,
    fontFamily: fonts.black,
    fontSize: 28,
    lineHeight: 34,
    textAlign: 'left',
  },
  subtitle: {
    color: AUTH_PALETTE.textMuted,
    fontFamily: fonts.semiBold,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.sm,
    textAlign: 'left',
  },
  list: {
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  card: {
    alignItems: 'center',
    backgroundColor: AUTH_PALETTE.white,
    borderColor: AUTH_PALETTE.border,
    borderBottomWidth: 4,
    borderRadius: radius.lg,
    borderWidth: 2,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  cardPressed: {
    transform: [{ translateY: 2 }],
    borderBottomWidth: 2,
  },
  cardDisabled: {
    opacity: 0.58,
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
    color: AUTH_PALETTE.brandBlue,
    fontFamily: fonts.black,
    fontSize: 18,
  },
  cardSubtitle: {
    color: AUTH_PALETTE.textMuted,
    fontFamily: fonts.bold,
    fontSize: 12,
    marginTop: 2,
  },
  arrow: {
    color: AUTH_PALETTE.textSoft,
    fontFamily: fonts.black,
    fontSize: 18,
    marginRight: spacing.xs,
  },
});
