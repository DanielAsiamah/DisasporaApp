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
import SpeechBubble from '../components/SpeechBubble';
import RegionalGuide from '../components/RegionalGuide';
import { colors, fonts, radius, spacing } from '../theme';

const GREETINGS = [
  'Wah gwaan!',
  'Hujambo!',
  'Sak pase!',
  'Nangaadef!',
];

const REGIONS = [
  {
    id: 'africa',
    title: 'Africa',
    caption: 'Swahili · Igbo · Wolof',
    color: colors.africaGold,
  },
  {
    id: 'caribbean',
    title: 'Caribbean',
    caption: 'Patois · Haitian Creole',
    color: colors.caribbeanGreen,
  },
  {
    id: 'americas',
    title: 'South America',
    caption: 'Creoles · heritage · regional speech',
    color: colors.coral,
  },
];

export default function WelcomeScreen({ onGetStarted, onSignIn }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(22)).current;
  const [greetingIndex, setGreetingIndex] = useState(0);
  const bubbleFade = useRef(new Animated.Value(1)).current;

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

    const interval = setInterval(() => {
      Animated.timing(bubbleFade, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(() => {
        setGreetingIndex((prev) => (prev + 1) % GREETINGS.length);
        Animated.timing(bubbleFade, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }).start();
      });
    }, 2600);

    return () => clearInterval(interval);
  }, [bubbleFade, fadeAnim, slideAnim]);

  return (
    <View style={styles.root}>
      <AnimatedAtmosphere
        colors={[colors.splashGreen, colors.skyTop, colors.skyBottom]}
        accent={colors.caribbeanGreen}
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

            <View style={styles.guideRow}>
              <RegionalGuide region="africa" size="small" showLabel />
              <RegionalGuide region="caribbean" size="small" showLabel />
              <RegionalGuide region="americas" size="small" showLabel />
            </View>

            <View style={styles.heroCopy}>
              <Animated.View style={{ opacity: bubbleFade }}>
                <SpeechBubble text={GREETINGS[greetingIndex]} />
              </Animated.View>
              <Text style={styles.title}>Learn the languages{'\n'}of the diaspora</Text>
              <Text style={styles.subtitle}>
                Fun, bite-sized lessons for mother tongues, creoles, and dialects that carry culture.
              </Text>
            </View>

            <View style={styles.regionsSection}>
              <Text style={styles.sectionHeader}>START YOUR PATH</Text>
              <View style={styles.regionsGrid}>
                {REGIONS.map((region) => (
                  <View
                    key={region.id}
                    style={[styles.regionCard, { borderColor: region.color + '66' }]}
                  >
                    <Text style={[styles.regionTitle, { color: region.color }]}>{region.title}</Text>
                    <Text style={styles.regionCaption}>{region.caption}</Text>
                  </View>
                ))}
              </View>
            </View>
          </Animated.View>
        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton label="GET STARTED" onPress={onGetStarted} />
          <Pressable onPress={onSignIn} style={styles.signInButton}>
            <Text style={styles.signInText}>I already have an account</Text>
          </Pressable>
          <Text style={styles.footerNote}>Free to start · learn in bite-sized lessons</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.skyBottom,
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
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  logoText: {
    color: colors.splash,
    fontFamily: fonts.black,
    fontSize: 18,
  },
  brandName: {
    color: colors.textDark,
    fontFamily: fonts.black,
    fontSize: 22,
  },
  heroCopy: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  guideRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  title: {
    color: colors.textDark,
    fontFamily: fonts.black,
    fontSize: 30,
    lineHeight: 36,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: fonts.semiBold,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  regionsSection: {
    marginTop: spacing.lg,
  },
  sectionHeader: {
    color: colors.textLight,
    fontFamily: fonts.black,
    fontSize: 12,
    letterSpacing: 0.8,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
  },
  regionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  regionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    flexGrow: 1,
    minWidth: '47%',
    padding: spacing.sm,
  },
  regionTitle: {
    fontFamily: fonts.black,
    fontSize: 15,
  },
  regionCaption: {
    color: colors.textMuted,
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  footer: {
    backgroundColor: colors.skyBottom,
    borderTopColor: colors.border,
    borderTopWidth: 1.5,
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
    color: colors.blue,
    fontFamily: fonts.extraBold,
    fontSize: 15,
  },
  footerNote: {
    color: colors.textLight,
    fontFamily: fonts.semiBold,
    fontSize: 12,
    textAlign: 'center',
  },
});
