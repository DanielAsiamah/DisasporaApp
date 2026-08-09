import { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import AnimatedAtmosphere from '../components/AnimatedAtmosphere';
import { fonts, radius, spacing } from '../theme';

const palette = {
  backgroundTop: '#DDF4FF',
  backgroundBottom: '#FFFFFF',
  brandBlue: '#0B245B',
  sky: '#1CB0F6',
  skySoft: '#EAF8FF',
  textMuted: '#6E8194',
  textSoft: '#7F94A7',
  border: '#D7E8F4',
  white: '#FFFFFF',
};

const GUIDE_STRIP = [
  {
    id: 'amara',
    label: 'Amara',
    note: 'Heritage-first lessons',
    source: require('../../assets/guides/amara.png'),
  },
  {
    id: 'kai',
    label: 'Kai',
    note: 'Everyday conversation',
    source: require('../../assets/guides/kai.png'),
  },
  {
    id: 'sol',
    label: 'Sol',
    note: 'Practice and progress',
    source: require('../../assets/guides/sol.png'),
  },
];

const COURSE_LANES = [
  {
    id: 'english',
    title: 'English speakers',
    caption: 'Jamaican Patois · Swahili',
    detail: 'Start with live MVP lessons rooted in culture and conversation.',
    color: '#22B65D',
  },
  {
    id: 'french',
    title: 'French speakers',
    caption: 'Wolof · Haitian Creole',
    detail: 'Build from familiar French into diaspora languages step by step.',
    color: '#F4B942',
  },
  {
    id: 'arabic',
    title: 'Arabic speakers',
    caption: 'Sudanese Arabic · Nobiin',
    detail: 'Move through greetings, family words, and confidence-building practice.',
    color: palette.sky,
  },
];

export default function WelcomeScreen({ onGetStarted, onSignIn }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(22)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 650,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        speed: 12,
        bounciness: 5,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <View style={styles.root}>
      <AnimatedAtmosphere
        colors={[palette.backgroundTop, palette.backgroundBottom]}
        accent={palette.sky}
      />

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
                <Text style={styles.heroPillText}>Six live MVP courses</Text>
              </View>
              <Text style={styles.title}>Languages carry us home</Text>
              <Text style={styles.subtitle}>
                Start with six live MVP courses: Jamaican Patois, Swahili, Wolof, Haitian Creole, Sudanese Arabic, and Nobiin.
              </Text>
            </View>

            <View style={styles.guideRow}>
              {GUIDE_STRIP.map((guide) => (
                <View key={guide.id} style={styles.guideCard}>
                  <Image resizeMode="contain" source={guide.source} style={styles.guideImage} />
                  <Text style={styles.guideName}>{guide.label}</Text>
                  <Text style={styles.guideNote}>{guide.note}</Text>
                </View>
              ))}
            </View>

            <View style={styles.lanesSection}>
              <Text style={styles.sectionHeader}>Choose your lane in onboarding</Text>
              <View style={styles.lanesGrid}>
                {COURSE_LANES.map((lane) => (
                  <Pressable
                    accessibilityRole="button"
                    key={lane.id}
                    onPress={onGetStarted}
                    style={({ pressed }) => [
                      styles.laneCard,
                      { borderColor: `${lane.color}55` },
                      pressed && styles.laneCardPressed,
                    ]}
                  >
                    <Text style={[styles.laneTitle, { color: lane.color }]}>{lane.title}</Text>
                    <Text style={styles.laneCaption}>{lane.caption}</Text>
                    <Text style={styles.laneDetail}>{lane.detail}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </Animated.View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable onPress={onGetStarted} style={styles.ctaButton}>
            <Text style={styles.ctaText}>START YOUR PATH</Text>
          </Pressable>
          <Pressable onPress={onSignIn} style={styles.signInButton}>
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
    backgroundColor: palette.sky,
    borderRadius: radius.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  logoText: {
    color: palette.white,
    fontFamily: fonts.black,
    fontSize: 18,
  },
  brandName: {
    color: palette.brandBlue,
    fontFamily: fonts.black,
    fontSize: 22,
  },
  heroCopy: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  heroPill: {
    backgroundColor: palette.white,
    borderColor: palette.border,
    borderRadius: radius.pill,
    borderWidth: 1.5,
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
    fontFamily: fonts.black,
    fontSize: 32,
    lineHeight: 38,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    color: palette.textMuted,
    fontFamily: fonts.semiBold,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  guideRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  guideCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderColor: palette.border,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    flex: 1,
    minHeight: 148,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
  },
  guideImage: {
    height: 78,
    width: 78,
  },
  guideName: {
    color: palette.brandBlue,
    fontFamily: fonts.extraBold,
    fontSize: 14,
    marginTop: 2,
  },
  guideNote: {
    color: palette.textMuted,
    fontFamily: fonts.semiBold,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
    textAlign: 'center',
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
    backgroundColor: palette.white,
    borderRadius: radius.md,
    borderWidth: 1.5,
    padding: spacing.sm,
  },
  laneCardPressed: {
    transform: [{ translateY: 2 }],
  },
  laneTitle: {
    fontFamily: fonts.black,
    fontSize: 15,
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
    backgroundColor: palette.backgroundBottom,
    borderTopColor: palette.border,
    borderTopWidth: 1.5,
    gap: spacing.sm,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  ctaButton: {
    alignItems: 'center',
    backgroundColor: palette.sky,
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: 54,
  },
  ctaText: {
    color: palette.white,
    fontFamily: fonts.extraBold,
    fontSize: 16,
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
