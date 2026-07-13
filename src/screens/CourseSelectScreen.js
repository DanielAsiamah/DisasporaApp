import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import AnimatedAtmosphere from '../components/AnimatedAtmosphere';
import PrimaryButton from '../components/PrimaryButton';
import { coursesData } from '../data/generatedCourses';
import { colors, fonts, radius, spacing } from '../theme';

function courseHasLessons(courseId) {
  return coursesData[courseId]?.units?.some((unit) => unit.lessons?.length > 0) === true;
}

const COURSES_BY_LANG = {
  english: [
    {
      id: 'patois',
      label: 'Jamaican Patois',
      subtitle: 'Learn greetings, respect, and daily Patois talk.',
      flag: '🇯🇲',
      category: 'Caribbean Creole',
      isNew: false,
    },
    {
      id: 'swahili',
      label: 'Swahili',
      subtitle: 'Master Kiswahili basics, numbers, and expressions.',
      flag: '🇰🇪',
      category: 'East African Bantu',
      isNew: false,
    },
    {
      id: 'igbo',
      label: 'Igbo',
      subtitle: 'Speak traditional Igbo greetings and cultural idioms.',
      flag: '🇳🇬',
      category: 'West African Tongue',
      isNew: true,
    },
    {
      id: 'belizean',
      label: 'Belizean Creole',
      subtitle: 'Discover Central American Kriol from Belize.',
      flag: '🇧🇿',
      category: 'Central American Kriol',
      isNew: true,
    },
    {
      id: 'aave',
      label: 'Black American English',
      subtitle: 'Learn the roots and slang of African American Vernacular.',
      flag: '🇺🇸',
      category: 'Black American Vernacular',
      isNew: false,
    },
  ],
  french: [
    {
      id: 'haitian',
      label: 'Créole Haïtien',
      subtitle: 'Apprenez les bases du créole des Caraïbes.',
      flag: '🇭🇹',
      category: 'Caribbean French Creole',
      isNew: false,
    },
    {
      id: 'nouchi',
      label: 'Nouchi Ivoirien',
      subtitle: 'Parlez l\'argot populaire d\'Abidjan, Côte d\'Ivoire.',
      flag: '🇨🇮',
      category: 'Ivorian Urban Slang',
      isNew: true,
    },
    {
      id: 'wolof',
      label: 'Wolof',
      subtitle: 'Pratiquez le Wolof parlé au Sénégal et en Gambie.',
      flag: '🇸🇳',
      category: 'West African Wolof',
      isNew: false,
    },
  ],
  arabic: [
    {
      id: 'sudanese',
      label: 'العامية السودانية',
      subtitle: 'تعلم لهجة السودان اليومية والترحيب.',
      flag: '🇸🇩',
      category: 'Sudanese Arabic',
      isNew: false,
    },
    {
      id: 'nubian',
      label: 'اللغة النوبية',
      subtitle: 'اكتشف الكلمات النوبية القديمة وتراث النيل.',
      flag: '🇪🇬',
      category: 'Ancient Nubian Tongue',
      isNew: true,
    },
  ],
};

export default function CourseSelectScreen({ userLanguage, onSelectCourse, onBack }) {
  const [selected, setSelected] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const courses = COURSES_BY_LANG[userLanguage] || COURSES_BY_LANG.english;

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
        colors={[colors.splashGreen, colors.skyTop, colors.skyBottom]}
        accent={colors.caribbeanGreen}
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
          <Text style={styles.title}>What would you like to learn?</Text>
          <Text style={styles.subtitle}>
            Choose a dialect or language of the diaspora to begin your path.
          </Text>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.list}>
              <Text style={styles.sectionLabel}>
                {userLanguage === 'french'
                  ? 'Pour les francophones'
                  : userLanguage === 'arabic'
                  ? 'للمتحدثين بالعربية'
                  : 'For English speakers'}
              </Text>

              {courses.map((course) => {
                const isSelected = selected === course.id;
                const isAvailable = courseHasLessons(course.id);
                return (
                  <Pressable
                    accessibilityState={{ disabled: !isAvailable, selected: isSelected }}
                    disabled={!isAvailable}
                    key={course.id}
                    onPress={() => setSelected(course.id)}
                    style={[
                      styles.card,
                      isSelected && styles.cardSelected,
                      !isAvailable && styles.cardDisabled,
                      {
                        borderBottomColor: isSelected
                          ? colors.primaryDark
                          : colors.border,
                      },
                    ]}
                  >
                    <View style={styles.flagCircle}>
                      <Text style={styles.flagEmoji}>{course.flag}</Text>
                    </View>
                    <View style={styles.cardInfo}>
                      <View style={styles.labelRow}>
                        <Text style={styles.cardLabel}>{course.label}</Text>
                        {!isAvailable ? (
                          <View style={styles.newBadge}>
                            <Text style={styles.newBadgeText}>COMING SOON</Text>
                          </View>
                        ) : course.isNew && (
                          <View style={styles.newBadge}>
                            <Text style={styles.newBadgeText}>NEW</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.cardSubtitle}>
                        {isAvailable ? course.subtitle : 'Workbook lessons are being prepared.'}
                      </Text>
                      <View style={styles.tagWrapper}>
                        <Text style={styles.categoryText}>🏷️ {course.category}</Text>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.radioCircle,
                        isSelected && styles.radioCircleActive,
                      ]}
                    >
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <PrimaryButton
              label="Continue"
              disabled={!selected}
              onPress={() => selected && onSelectCourse(selected)}
            />
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.skyBottom,
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
    color: colors.textMuted,
    fontFamily: fonts.black,
    fontSize: 24,
  },
  progressContainer: {
    backgroundColor: colors.border,
    borderRadius: radius.pill,
    flex: 1,
    height: 10,
    marginLeft: spacing.sm,
    overflow: 'hidden',
  },
  progressBar: {
    backgroundColor: colors.primary,
    height: '100%',
    width: '66%',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  title: {
    color: colors.textDark,
    fontFamily: fonts.black,
    fontSize: 26,
    lineHeight: 32,
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: fonts.semiBold,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.xs,
  },
  scrollView: {
    flex: 1,
    marginTop: spacing.md,
  },
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  sectionLabel: {
    color: colors.textLight,
    fontFamily: fonts.black,
    fontSize: 14,
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderBottomWidth: 4,
    borderRadius: radius.lg,
    borderWidth: 2,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceMuted,
  },
  cardDisabled: {
    opacity: 0.58,
  },
  flagCircle: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    height: 48,
    justifyContent: 'center',
    width: 48,
    borderColor: colors.border,
    borderWidth: 1,
  },
  flagEmoji: {
    fontSize: 26,
  },
  cardInfo: {
    flex: 1,
  },
  labelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  cardLabel: {
    color: colors.textDark,
    fontFamily: fonts.black,
    fontSize: 17,
  },
  newBadge: {
    backgroundColor: colors.africaGold,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  newBadgeText: {
    color: colors.skyBottom,
    fontFamily: fonts.black,
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
    backgroundColor: 'rgba(244, 185, 66, 0.1)',
    borderRadius: radius.sm,
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  categoryText: {
    color: colors.africaGold,
    fontFamily: fonts.bold,
    fontSize: 11,
  },
  radioCircle: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 2,
    height: 22,
    justifyContent: 'center',
    width: 22,
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
    borderTopWidth: 1.5,
    paddingBottom: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.skyBottom,
  },
});
