import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AnimatedAtmosphere from '../components/AnimatedAtmosphere';
import PrimaryButton from '../components/PrimaryButton';
import { colors, fonts, radius, spacing } from '../theme';

const { getOnboardingCourses } = require('../data/courseCatalog.cjs');

const LANGUAGE_SECTION_LABELS = Object.freeze({
  english: 'For English speakers',
  french: 'Pour les francophones',
  arabic: '\u0644\u0644\u0645\u062a\u062d\u062f\u062b\u064a\u0646 \u0628\u0627\u0644\u0639\u0631\u0628\u064a\u0629',
});

export default function CourseSelectScreen({ userLanguage, onSelectCourse, onBack }) {
  const [selected, setSelected] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const courses = getOnboardingCourses(userLanguage);

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
      <AnimatedAtmosphere
        accent={colors.caribbeanGreen}
        colors={[colors.splashGreen, colors.skyTop, colors.skyBottom]}
      />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Go back" onPress={onBack} style={styles.backButton}>
            <Text style={styles.backText}>\u2039</Text>
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
            Choose one of the six MVP language paths. New paths unlock only after their
            lessons, artwork, and audio are approved.
          </Text>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
            <View style={styles.list}>
              <Text style={styles.sectionLabel}>
                {LANGUAGE_SECTION_LABELS[userLanguage] || LANGUAGE_SECTION_LABELS.english}
              </Text>

              {courses.map((course) => {
                const isSelected = selected === course.id;
                const isAvailable = course.available && course.published;

                return (
                  <Pressable
                    accessibilityLabel={`${course.displayName}${isAvailable ? '' : ', coming soon'}`}
                    accessibilityRole="radio"
                    accessibilityState={{
                      checked: isSelected,
                      disabled: !isAvailable,
                    }}
                    disabled={!isAvailable}
                    key={course.id}
                    onPress={() => setSelected(course.id)}
                    style={({ pressed }) => [
                      styles.card,
                      isSelected && styles.cardSelected,
                      !isAvailable && styles.cardDisabled,
                      pressed && isAvailable && styles.cardPressed,
                    ]}
                  >
                    <View style={styles.flagCircle}>
                      <Text style={styles.flagEmoji}>{course.flag}</Text>
                    </View>
                    <View style={styles.cardInfo}>
                      <View style={styles.labelRow}>
                        <Text style={styles.cardLabel}>{course.displayName}</Text>
                        {!isAvailable ? (
                          <View style={styles.badge}>
                            <Text style={styles.badgeText}>COMING SOON</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.cardSubtitle}>
                        {isAvailable ? course.subtitle : 'This complete course is being prepared.'}
                      </Text>
                      <Text style={styles.categoryText}>{course.category}</Text>
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
            <PrimaryButton
              disabled={!selected}
              label="Continue"
              onPress={() => selected && onSelectCourse(selected)}
            />
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.skyBottom, flex: 1 },
  safeArea: { flex: 1 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: { alignItems: 'center', height: 40, justifyContent: 'center', width: 40 },
  backText: { color: colors.textMuted, fontFamily: fonts.black, fontSize: 34, lineHeight: 38 },
  progressContainer: {
    backgroundColor: colors.border,
    borderRadius: radius.pill,
    flex: 1,
    height: 10,
    marginLeft: spacing.sm,
    overflow: 'hidden',
  },
  progressBar: { backgroundColor: colors.primary, height: '100%', width: '66%' },
  content: { flex: 1, paddingHorizontal: spacing.lg },
  title: {
    color: colors.textDark,
    fontFamily: fonts.black,
    fontSize: 26,
    lineHeight: 32,
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: fonts.semiBold,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.xs,
  },
  scrollView: { flex: 1, marginTop: spacing.md },
  list: { gap: spacing.sm, paddingBottom: spacing.xl },
  sectionLabel: {
    color: colors.textLight,
    fontFamily: fonts.black,
    fontSize: 13,
    letterSpacing: 0.7,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 4,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 2,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  cardSelected: { backgroundColor: colors.surfaceMuted, borderColor: colors.primary },
  cardDisabled: { opacity: 0.58 },
  cardPressed: { opacity: 0.85, transform: [{ translateY: 1 }] },
  flagCircle: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  flagEmoji: { fontSize: 26 },
  cardInfo: { flex: 1, gap: 4 },
  labelRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cardLabel: { color: colors.textDark, fontFamily: fonts.black, fontSize: 17 },
  badge: {
    backgroundColor: colors.africaGold,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { color: colors.skyBottom, fontFamily: fonts.black, fontSize: 9 },
  cardSubtitle: {
    color: colors.textMuted,
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
  },
  categoryText: { color: colors.africaGold, fontFamily: fonts.bold, fontSize: 11 },
  radioCircle: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 2,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  radioCircleActive: { borderColor: colors.primary },
  radioInner: { backgroundColor: colors.primary, borderRadius: 999, height: 12, width: 12 },
  footer: {
    backgroundColor: colors.skyBottom,
    borderTopColor: colors.border,
    borderTopWidth: 1.5,
    paddingBottom: spacing.lg,
    paddingTop: spacing.md,
  },
});
