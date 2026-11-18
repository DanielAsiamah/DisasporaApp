import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, fonts } from '../../theme';
import AnimatedGuide from './AnimatedGuide';

const STEPS = [
  { icon: 'eye-outline', label: 'Recall it', detail: 'Try the phrase without a hint.' },
  { icon: 'calendar-outline', label: 'Meet it again', detail: 'Missed phrases return when review is due.' },
  { icon: 'checkmark-circle-outline', label: 'Make it stick', detail: 'Correct spaced reviews move it toward mastery.' },
];

export default function PracticeHub({
  courseName,
  guideName = 'Kai',
  onStart,
  presentation,
  reducedMotion,
}) {
  const entrance = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;

  useEffect(() => {
    if (reducedMotion) {
      entrance.setValue(1);
      return undefined;
    }
    const animation = Animated.spring(entrance, {
      damping: 16,
      mass: 0.8,
      stiffness: 120,
      toValue: 1,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [entrance, reducedMotion]);

  const guideTone = presentation.mode === 'due' ? 'prompt' : 'idle';

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.pageHeader}>
        <Text style={styles.eyebrow}>DAILY PRACTICE</Text>
        <Text accessibilityRole="header" style={styles.pageTitle}>Practice</Text>
        <Text style={styles.courseName}>{courseName || 'Your course'}</Text>
      </View>

      <Animated.View
        style={[
          styles.hero,
          {
            opacity: entrance,
            transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
          },
        ]}
      >
        <View style={styles.heroSun} />
        <View style={styles.heroRule} />
        <View accessibilityLiveRegion="polite" style={styles.heroCopy}>
          <View style={styles.countPill}>
            <Ionicons accessible={false} color={colors.ink} name="refresh-circle" size={18} />
            <Text style={styles.countLabel}>{presentation.countLabel}</Text>
          </View>
          <Text style={styles.heroTitle}>{presentation.title}</Text>
          <Text style={styles.heroBody}>{presentation.message}</Text>
        </View>
        <AnimatedGuide
          accessible={false}
          name={guideName}
          reducedMotion={reducedMotion}
          style={styles.guide}
          tone={guideTone}
        />
      </Animated.View>

      <View style={styles.memoryCard}>
        <Text style={styles.cardEyebrow}>HOW MEMORY PRACTICE WORKS</Text>
        <Text style={styles.cardTitle}>Short reviews, stronger recall</Text>
        <View style={styles.stepList}>
          {STEPS.map((step, index) => (
            <View key={step.label} style={styles.stepRow}>
              <View style={[styles.stepIcon, index === 1 && styles.stepIconAccent]}>
                <Ionicons accessible={false} color={colors.ink} name={step.icon} size={21} />
              </View>
              <View style={styles.stepCopy}>
                <Text style={styles.stepTitle}>{step.label}</Text>
                <Text style={styles.stepDetail}>{step.detail}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.truthCard}>
        <Ionicons accessible={false} color={colors.sea} name="shield-checkmark-outline" size={25} />
        <View style={styles.truthCopy}>
          <Text style={styles.truthTitle}>Built from your learning</Text>
          <Text style={styles.truthBody}>This queue uses only mistakes and lessons saved in your own progress.</Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !presentation.canStart }}
        disabled={!presentation.canStart}
        onPress={onStart}
        style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed, !presentation.canStart && styles.buttonDisabled]}
      >
        <Text style={styles.primaryButtonText}>{presentation.ctaLabel}</Text>
        <Ionicons accessible={false} color={colors.paper} name="arrow-forward" size={20} />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 112, paddingHorizontal: 18, paddingTop: 16 },
  pageHeader: { marginBottom: 18 },
  eyebrow: { color: colors.sea, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.6 },
  pageTitle: { color: colors.ink, fontFamily: fonts.display, fontSize: 44, lineHeight: 50, textTransform: 'uppercase' },
  courseName: { color: colors.inkMuted, fontFamily: fonts.editorial, fontSize: 18, marginTop: 2 },
  hero: { backgroundColor: colors.sea, borderColor: colors.ink, borderRadius: 28, borderWidth: 1.5, minHeight: 300, overflow: 'hidden', padding: 22 },
  heroSun: { backgroundColor: colors.mango, borderRadius: 90, height: 180, position: 'absolute', right: -48, top: -58, width: 180 },
  heroRule: { backgroundColor: colors.paper, bottom: 38, height: 4, opacity: 0.75, position: 'absolute', right: 28, transform: [{ rotate: '-7deg' }], width: 100 },
  heroCopy: { maxWidth: '68%', zIndex: 2 },
  countPill: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: colors.mango, borderColor: colors.ink, borderRadius: 999, borderWidth: 1, flexDirection: 'row', gap: 6, paddingHorizontal: 11, paddingVertical: 7 },
  countLabel: { color: colors.ink, fontFamily: fonts.bold, fontSize: 11 },
  heroTitle: { color: colors.paper, fontFamily: fonts.display, fontSize: 32, lineHeight: 37, marginTop: 15, textTransform: 'uppercase' },
  heroBody: { color: colors.paper, fontFamily: fonts.editorial, fontSize: 15, lineHeight: 21, marginTop: 9, opacity: 0.94 },
  guide: { bottom: -34, height: 210, position: 'absolute', right: -30, width: 210 },
  memoryCard: { backgroundColor: '#FFFFFF', borderColor: colors.ink, borderRadius: 25, borderWidth: 1.5, marginTop: 18, padding: 19 },
  cardEyebrow: { color: colors.sea, fontFamily: fonts.bold, fontSize: 9, letterSpacing: 1.3 },
  cardTitle: { color: colors.ink, fontFamily: fonts.display, fontSize: 27, lineHeight: 31, marginTop: 5, textTransform: 'uppercase' },
  stepList: { gap: 16, marginTop: 19 },
  stepRow: { alignItems: 'center', flexDirection: 'row', gap: 13 },
  stepIcon: { alignItems: 'center', backgroundColor: colors.paperDeep, borderColor: colors.border, borderRadius: 15, borderWidth: 1, height: 48, justifyContent: 'center', transform: [{ rotate: '-3deg' }], width: 48 },
  stepIconAccent: { backgroundColor: '#FFF1C9', transform: [{ rotate: '3deg' }] },
  stepCopy: { flex: 1 },
  stepTitle: { color: colors.ink, fontFamily: fonts.bold, fontSize: 14 },
  stepDetail: { color: colors.inkMuted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, marginTop: 2 },
  truthCard: { alignItems: 'center', backgroundColor: colors.paperDeep, borderColor: colors.border, borderRadius: 20, borderWidth: 1, flexDirection: 'row', gap: 13, marginTop: 14, padding: 16 },
  truthCopy: { flex: 1 },
  truthTitle: { color: colors.ink, fontFamily: fonts.bold, fontSize: 13 },
  truthBody: { color: colors.inkMuted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, marginTop: 2 },
  primaryButton: { alignItems: 'center', backgroundColor: colors.ink, borderRadius: 19, flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 18, minHeight: 60, paddingHorizontal: 18 },
  primaryButtonText: { color: colors.paper, fontFamily: fonts.bold, fontSize: 14, letterSpacing: 0.6 },
  buttonPressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  buttonDisabled: { opacity: 0.45 },
});
