import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, fonts, radius, spacing } from '../theme';

// First course per language group is FREE, rest require premium
const FREE_COURSE_COUNT = 1;

const COURSES_BY_LANG = {
  english: [
    {
      id: 'patois',
      label: 'Jamaican Patois',
      subtitle: 'Greetings, food, family, and culture.',
      flag: '🇯🇲',
      category: 'Caribbean',
    },
    {
      id: 'belizean',
      label: 'Belizean Creole',
      subtitle: 'Central American Kriol from Belize.',
      flag: '🇧🇿',
      category: 'Caribbean',
    },
    {
      id: 'aave',
      label: 'Black American English',
      subtitle: 'AAVE history and cultural expression.',
      flag: '🇺🇸',
      category: 'USA',
    },
    {
      id: 'gullah',
      label: 'Gullah Geechee',
      subtitle: 'Sea Islands heritage creole.',
      flag: '🇺🇸',
      category: 'USA',
    },
    {
      id: 'swahili',
      label: 'Swahili',
      subtitle: 'Greetings, basics, numbers, and travel.',
      flag: '🇰🇪',
      category: 'East Africa',
    },
    {
      id: 'igbo',
      label: 'Igbo',
      subtitle: 'Greetings, family words, and expressions.',
      flag: '🇳🇬',
      category: 'West Africa',
    },
    {
      id: 'yoruba',
      label: 'Yoruba',
      subtitle: 'Yorubaland greetings and family terms.',
      flag: '🇳🇬',
      category: 'West Africa',
    },
  ],
  french: [
    {
      id: 'haitian',
      label: 'Créole Haïtien',
      subtitle: 'Les bases du créole haïtien.',
      flag: '🇭🇹',
      category: 'Caribbean',
    },
    {
      id: 'nouchi',
      label: 'Nouchi Ivoirien',
      subtitle: "Argot de la rue d'Abidjan.",
      flag: '🇨🇮',
      category: 'West Africa',
    },
    {
      id: 'wolof',
      label: 'Wolof',
      subtitle: 'Salutations et phrases de base au Sénégal.',
      flag: '🇸🇳',
      category: 'West Africa',
    },
    {
      id: 'fr-swahili',
      label: 'Swahili (fr)',
      subtitle: "La langue swahili pour francophones.",
      flag: '🇨🇩',
      category: 'East Africa',
    },
  ],
  arabic: [
    {
      id: 'sudanese',
      label: 'Sudanese Arabic',
      subtitle: 'Everyday Sudanese greetings and phrases.',
      flag: '🇸🇩',
      category: 'North Africa',
    },
    {
      id: 'nubian',
      label: 'Nubian',
      subtitle: 'Nile Valley heritage words.',
      flag: '🇪🇬',
      category: 'Nile Valley',
    },
    {
      id: 'ar-swahili',
      label: 'Swahili (ar)',
      subtitle: 'تعلم السواحيلية مع روابطها العربية.',
      flag: '🇰🇪',
      category: 'East Africa',
    },
  ],
};

export default function CourseSelectScreen({ userLanguage, onSelectCourse, onBack, userName }) {
  const [selected, setSelected] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const courses = useMemo(() => COURSES_BY_LANG[userLanguage] || COURSES_BY_LANG.english, [userLanguage]);

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
          <Text style={styles.title}>
            {userName ? `${userName}, what` : 'What'} do you{"\n"}want to learn?
          </Text>
          <Text style={styles.subtitle}>
            Pick one to start free. Unlock more with Premium.
          </Text>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.list}>
              {courses.map((course, index) => {
                const isSelected = selected === course.id;
                const isFree = index < FREE_COURSE_COUNT;
                const isLocked = !isFree;

                return (
                  <Pressable
                    key={course.id}
                    onPress={() => setSelected(course.id)}
                    style={({ pressed }) => [
                      styles.card,
                      isSelected && styles.cardSelected,
                      pressed && styles.cardPressed,
                    ]}
                  >
                    <View style={styles.flagBox}>
                      <Text style={styles.flagEmoji}>{course.flag}</Text>
                    </View>
                    <View style={styles.cardInfo}>
                      <View style={styles.labelRow}>
                        <Text style={styles.cardLabel}>{course.label}</Text>
                        {isFree ? (
                          <View style={styles.freeBadge}>
                            <Text style={styles.freeBadgeText}>FREE</Text>
                          </View>
                        ) : (
                          <View style={styles.premiumBadge}>
                            <Text style={styles.premiumBadgeText}>🔒 PRO</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.cardSubtitle}>{course.subtitle}</Text>
                      <View style={styles.tagWrapper}>
                        <Text style={styles.categoryText}>{course.category}</Text>
                      </View>
                    </View>
                    <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                      {isSelected ? <View style={styles.radioInner} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={[styles.continueButton, !selected && styles.continueButtonDisabled]}
              disabled={!selected}
              onPress={() => selected && onSelectCourse(selected)}
            >
              <Text style={[styles.continueText, !selected && styles.continueTextDisabled]}>
                CONTINUE
              </Text>
            </Pressable>
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
    width: '66%',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.extraBold,
    fontSize: 28,
    letterSpacing: -0.3,
    lineHeight: 36,
    marginTop: spacing.sm,
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  scrollView: {
    flex: 1,
    marginTop: spacing.lg,
  },
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
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
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(88, 204, 2, 0.06)',
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
  },
  flagBox: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  flagEmoji: {
    fontSize: 27,
  },
  cardInfo: {
    flex: 1,
  },
  labelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cardLabel: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 16,
  },
  freeBadge: {
    backgroundColor: colors.successBg,
    borderRadius: radius.sm,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  freeBadgeText: {
    color: colors.primary,
    fontFamily: fonts.extraBold,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  premiumBadge: {
    backgroundColor: colors.premiumBg,
    borderRadius: radius.sm,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  premiumBadgeText: {
    color: colors.premium,
    fontFamily: fonts.extraBold,
    fontSize: 9,
  },
  cardSubtitle: {
    color: colors.textMuted,
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  tagWrapper: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(244, 185, 66, 0.12)',
    borderRadius: radius.sm,
    marginTop: 7,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  categoryText: {
    color: colors.africaGold,
    fontFamily: fonts.bold,
    fontSize: 11,
  },
  radioCircle: {
    alignItems: 'center',
    borderColor: colors.borderLight,
    borderRadius: 999,
    borderWidth: 2,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  radioCircleActive: {
    borderColor: colors.primary,
  },
  radioInner: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 12,
    width: 12,
  },
  footer: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingBottom: spacing.lg,
    paddingTop: spacing.md,
  },
  continueButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
  },
  continueButtonDisabled: {
    backgroundColor: colors.locked,
  },
  continueText: {
    color: '#FFFFFF',
    fontFamily: fonts.extraBold,
    fontSize: 15,
    letterSpacing: 1,
  },
  continueTextDisabled: {
    color: colors.textLight,
  },
});
