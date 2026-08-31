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
import { LinearGradient } from 'expo-linear-gradient';

import { colors, fonts, radius, spacing } from '../theme';

const GREETINGS = ['Wah gwaan!', 'Hujambo!', 'Sak pase!', 'Nanga def!', 'Kedu!'];

const FEATURES = [
  { icon: '🎧', label: 'Listen & Speak', detail: 'Hear real native audio' },
  { icon: '🧠', label: 'Practice', detail: 'Build sentences step by step' },
  { icon: '🌍', label: 'Culture', detail: 'Learn the people behind the words' },
];

export default function WelcomeScreen({ onGetStarted, onSignIn }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const [greetingIndex, setGreetingIndex] = useState(0);
  const bubbleFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        speed: 10,
        bounciness: 4,
        useNativeDriver: true,
      }),
    ]).start();

    const interval = setInterval(() => {
      Animated.timing(bubbleFade, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setGreetingIndex((prev) => (prev + 1) % GREETINGS.length);
        Animated.timing(bubbleFade, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }, 2800);

    return () => clearInterval(interval);
  }, [bubbleFade, fadeAnim, slideAnim]);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colors.skyTop, colors.splash, colors.skyBottom]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            {/* Brand */}
            <View style={styles.brandRow}>
              <View style={styles.logoBadge}>
                <Text style={styles.logoText}>D</Text>
              </View>
              <Text style={styles.brandName}>Diaspora</Text>
            </View>

            {/* Hero section */}
            <View style={styles.heroSection}>
              <Animated.View style={[styles.greetingBubble, { opacity: bubbleFade }]}>
                <Text style={styles.greetingText}>{GREETINGS[greetingIndex]}</Text>
              </Animated.View>

              <Text style={styles.title}>Learn the languages{"\n"}of your people</Text>
              <Text style={styles.subtitle}>
                Master creoles, mother tongues, and cultural speech with bite-sized daily lessons.
              </Text>
            </View>

            {/* Feature cards */}
            <View style={styles.featureGrid}>
              {FEATURES.map((item) => (
                <View key={item.label} style={styles.featureCard}>
                  <Text style={styles.featureIcon}>{item.icon}</Text>
                  <View style={styles.featureInfo}>
                    <Text style={styles.featureLabel}>{item.label}</Text>
                    <Text style={styles.featureDetail}>{item.detail}</Text>
                  </View>
                </View>
              ))}
            </View>
          </Animated.View>
        </ScrollView>

        {/* Footer CTA */}
        <View style={styles.footer}>
          <Pressable style={styles.getStartedButton} onPress={onGetStarted}>
            <Text style={styles.getStartedText}>GET STARTED</Text>
          </Pressable>
          <Pressable onPress={onSignIn} style={styles.signInButton}>
            <Text style={styles.signInText}>I ALREADY HAVE AN ACCOUNT</Text>
          </Pressable>
        </View>
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
  content: {
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: spacing.xl,
  },
  logoBadge: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  logoText: {
    color: '#FFFFFF',
    fontFamily: fonts.extraBold,
    fontSize: 20,
  },
  brandName: {
    color: colors.text,
    fontFamily: fonts.extraBold,
    fontSize: 24,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingTop: spacing.lg,
  },
  greetingBubble: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  greetingText: {
    color: '#FFFFFF',
    fontFamily: fonts.extraBold,
    fontSize: 18,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.extraBold,
    fontSize: 32,
    letterSpacing: -0.5,
    lineHeight: 40,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: fonts.medium,
    fontSize: 16,
    lineHeight: 24,
    marginTop: spacing.md,
    maxWidth: 320,
    textAlign: 'center',
  },
  featureGrid: {
    gap: spacing.sm,
  },
  featureCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  featureIcon: {
    fontSize: 28,
  },
  featureInfo: {
    flex: 1,
  },
  featureLabel: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 16,
  },
  featureDetail: {
    color: colors.textMuted,
    fontFamily: fonts.medium,
    fontSize: 13,
    marginTop: 2,
  },
  footer: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.sm,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  getStartedButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
  },
  getStartedText: {
    color: '#FFFFFF',
    fontFamily: fonts.extraBold,
    fontSize: 15,
    letterSpacing: 1,
  },
  signInButton: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 2,
    paddingVertical: spacing.md - 2,
  },
  signInText: {
    color: colors.blue,
    fontFamily: fonts.extraBold,
    fontSize: 14,
    letterSpacing: 0.5,
  },
});
