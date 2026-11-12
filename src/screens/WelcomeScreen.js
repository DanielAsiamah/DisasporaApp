import { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AUTH_PALETTE as palette } from '../components/AuthScreenFrame';
import PrimaryButton from '../components/PrimaryButton';
import { COURSE_CATALOG } from '../data/courseCatalog.cjs';
import { buildWelcomeCourseSummary } from '../data/welcomeCourseSummary.cjs';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { colors, fonts, radius, spacing } from '../theme';

const GUIDE_STRIP = [
  {
    id: 'amara',
    label: 'Amara',
    source: require('../../assets/guides/amara.png'),
  },
  {
    id: 'kai',
    label: 'Kai',
    source: require('../../assets/guides/kai.png'),
  },
  {
    id: 'sol',
    label: 'Sol',
    source: require('../../assets/guides/sol.png'),
  },
];

const courseSummary = buildWelcomeCourseSummary(COURSE_CATALOG);

export default function WelcomeScreen({ onGetStarted, onSignIn }) {
  const reducedMotion = useReducedMotion(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(22)).current;

  useEffect(() => {
    if (reducedMotion == null) return undefined;

    if (reducedMotion) {
      fadeAnim.stopAnimation();
      slideAnim.stopAnimation();
      fadeAnim.setValue(1);
      slideAnim.setValue(0);
      return undefined;
    }

    fadeAnim.setValue(0);
    slideAnim.setValue(22);
    const entrance = Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        speed: 12,
        bounciness: 5,
        useNativeDriver: true,
      }),
    ]);
    entrance.start();
    return () => entrance.stop();
  }, [fadeAnim, reducedMotion, slideAnim]);

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            <View style={styles.brandRow}>
              <View style={styles.logoBadge}>
                <Text style={styles.logoText}>D</Text>
              </View>
              <Text style={styles.brandName}>Diaspora</Text>
            </View>

            <View style={styles.heroCopy}>
              <View style={styles.heroPill}>
                <Text style={styles.heroPillText}>{courseSummary.headline}</Text>
              </View>
              <Text accessibilityRole="header" style={styles.title}>Languages carry us home</Text>
              <Text style={styles.subtitle}>
                {courseSummary.description}
              </Text>
            </View>

            <View style={styles.guideRow}>
              {GUIDE_STRIP.map((guide) => (
                <View key={guide.id} style={styles.guideCard}>
                  <Image resizeMode="contain" source={guide.source} style={styles.guideImage} />
                  <Text style={styles.guideName}>{guide.label}</Text>
                </View>
              ))}
            </View>

            <View style={styles.lanesSection}>
              <Text style={styles.sectionHeader}>Explore our language paths</Text>
              <View style={styles.lanesGrid}>
                {courseSummary.lanes.map((lane) => (
                  <Pressable
                    accessibilityRole="button"
                    key={lane.id}
                    onPress={onGetStarted}
                    style={({ pressed }) => [
                      styles.laneCard,
                      pressed && styles.laneCardPressed,
                    ]}
                  >
                    <Text style={styles.laneTitle}>{lane.title}</Text>
                    <Text style={styles.laneCaption}>{lane.caption}</Text>
                    <Text style={styles.laneDetail}>{lane.detail}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </Animated.View>
        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton label="START YOUR PATH" onPress={onGetStarted} />
          <Pressable accessibilityRole="button" onPress={onSignIn} style={styles.signInButton}>
            <Text style={styles.signInText}>I already have an account</Text>
          </Pressable>
          <Text style={styles.footerNote}>Lessons, review, and leaderboard — free to start.</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: palette.backgroundBottom,
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    alignSelf: 'center',
    maxWidth: 520,
    width: '100%',
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: spacing.xs,
  },
  logoBadge: {
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderRadius: radius.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  logoText: {
    color: palette.white,
    fontFamily: fonts.display,
    fontSize: 26,
  },
  brandName: {
    color: palette.brandBlue,
    fontFamily: fonts.display,
    fontSize: 28,
  },
  heroCopy: {
    alignItems: 'flex-start',
    marginTop: spacing.lg,
  },
  heroPill: {
    backgroundColor: colors.paperDeep,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  heroPillText: {
    color: palette.sky,
    fontFamily: fonts.extraBold,
    fontSize: 12,
    letterSpacing: 0.4,
  },
  title: {
    color: palette.brandBlue,
    fontFamily: fonts.display,
    fontSize: 46,
    lineHeight: 53,
    marginTop: spacing.md,
    textTransform: 'uppercase',
  },
  subtitle: {
    color: palette.textMuted,
    fontFamily: fonts.editorial,
    fontSize: 18,
    lineHeight: 26,
    marginTop: spacing.sm,
  },
  guideRow: {
    backgroundColor: colors.paperDeep,
    borderRadius: radius.xl,
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
  },
  guideCard: {
    alignItems: 'center',
    flex: 1,
  },
  guideImage: {
    height: 160,
    width: '100%',
  },
  guideName: {
    color: palette.brandBlue,
    fontFamily: fonts.extraBold,
    fontSize: 14,
    marginTop: 2,
  },
  lanesSection: {
    marginTop: spacing.lg,
  },
  sectionHeader: {
    color: palette.textSoft,
    fontFamily: fonts.black,
    fontSize: 12,
    letterSpacing: 0.8,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
  },
  lanesGrid: {
    gap: spacing.sm,
  },
  laneCard: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingVertical: spacing.md,
  },
  laneCardPressed: {
    transform: [{ translateY: 2 }],
  },
  laneTitle: {
    color: colors.ink,
    fontFamily: fonts.display,
    fontSize: 24,
  },
  laneCaption: {
    color: palette.textMuted,
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  laneDetail: {
    color: palette.brandBlue,
    fontFamily: fonts.semiBold,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 8,
  },
  footer: {
    alignSelf: 'center',
    maxWidth: 520,
    width: '100%',
    backgroundColor: palette.backgroundBottom,
    borderTopColor: palette.border,
    borderTopWidth: 1,
    gap: spacing.sm,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  signInButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  signInText: {
    color: palette.sky,
    fontFamily: fonts.extraBold,
    fontSize: 15,
  },
  footerNote: {
    color: palette.textSoft,
    fontFamily: fonts.semiBold,
    fontSize: 12,
    textAlign: 'center',
  },
});
