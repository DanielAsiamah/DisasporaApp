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

const STAT_COLORS = {
  xp: colors.mango,
  streak: colors.coral,
  topics: colors.sea,
  words: '#4D76B8',
};

export default function ProgressDashboard({
  guideName = 'Kai',
  onContinue,
  onPractice,
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

  const practiceButtonLabel = presentation.practice.dueCount > 0
    ? 'START REVIEW'
    : 'REVIEW A TOPIC';

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.pageHeader}>
        <Text style={styles.eyebrow}>YOUR JOURNEY</Text>
        <Text accessibilityRole="header" style={styles.pageTitle}>Progress</Text>
        <Text style={styles.courseName}>{presentation.courseName}</Text>
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
        <View style={styles.heroCopy}>
          <Text style={styles.heroKicker}>{presentation.progress.percent}% COMPLETE</Text>
          <Text style={styles.heroTitle}>{presentation.title}</Text>
          <Text style={styles.heroSubtitle}>{presentation.subtitle}</Text>
        </View>
        <AnimatedGuide
          accessible={false}
          name={guideName}
          reducedMotion={reducedMotion}
          style={styles.guide}
          tone={presentation.progress.percent === 100 ? 'success' : 'idle'}
        />
      </Animated.View>

      <View
        accessible
        accessibilityLabel={presentation.progress.accessibilityLabel}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: presentation.progress.percent }}
        style={styles.progressTrack}
      >
        <View style={[styles.progressFill, { width: `${presentation.progress.percent}%` }]} />
      </View>

      <View style={styles.statGrid}>
        {presentation.stats.map((stat) => (
          <View accessible accessibilityLabel={`${stat.label}: ${stat.value}`} key={stat.id} style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: STAT_COLORS[stat.id] }]}>
              <Ionicons accessible={false} color={colors.ink} name={stat.icon} size={20} />
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.rhythmCard}>
        <View style={styles.rhythmIcon}>
          <Ionicons accessible={false} color={colors.paper} name="sunny" size={24} />
        </View>
        <View style={styles.rhythmCopy}>
          <Text style={styles.cardEyebrow}>DAILY RHYTHM</Text>
          <Text style={styles.cardTitle}>{presentation.dailyGoal.label}</Text>
          <Text style={styles.cardBody}>Small, steady sessions keep new phrases close.</Text>
        </View>
      </View>

      <View style={styles.practiceCard}>
        <View style={styles.practiceTopRow}>
          <View style={styles.practiceCopy}>
            <Text style={styles.cardEyebrow}>MEMORY PRACTICE</Text>
            <Text style={styles.practiceTitle}>{presentation.practice.label}</Text>
          </View>
          <Ionicons accessible={false} color={colors.sea} name="refresh-circle" size={44} />
        </View>
        <Text style={styles.cardBody}>{presentation.practice.message}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !presentation.ready }}
          disabled={!presentation.ready}
          onPress={onPractice}
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed, !presentation.ready && styles.buttonDisabled]}
        >
          <Text style={styles.secondaryButtonText}>{practiceButtonLabel}</Text>
        </Pressable>
      </View>

      <View style={styles.milestoneSection}>
        <Text style={styles.sectionEyebrow}>CHAPTER MILESTONES</Text>
        <Text style={styles.sectionTitle}>Marks along the way</Text>
        <Text style={styles.sectionIntro}>Every step is part of a bigger language story.</Text>
        <View style={styles.milestoneList}>
          {presentation.milestones.map((milestone, index) => {
            const complete = milestone.state === 'complete';
            const current = milestone.state === 'current';
            return (
              <View
                accessible
                accessibilityLabel={`${milestone.label}, ${milestone.state}. ${milestone.detail}`}
                key={milestone.id}
                style={styles.milestoneRow}
              >
                <View style={styles.milestoneRail}>
                  <View style={[styles.milestoneNode, complete && styles.milestoneComplete, current && styles.milestoneCurrent]}>
                    <Ionicons
                      accessible={false}
                      color={complete || current ? colors.paper : colors.inkMuted}
                      name={complete ? 'checkmark' : current ? 'sparkles' : 'lock-closed'}
                      size={17}
                    />
                  </View>
                  {index < presentation.milestones.length - 1 ? (
                    <View style={[styles.milestoneLine, complete && styles.milestoneLineComplete]} />
                  ) : null}
                </View>
                <View style={[styles.milestoneCopy, current && styles.milestoneCopyCurrent]}>
                  <Text style={[styles.milestoneTitle, milestone.state === 'locked' && styles.milestoneTitleLocked]}>{milestone.label}</Text>
                  <Text style={styles.milestoneDetail}>{milestone.detail}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !presentation.ready }}
        disabled={!presentation.ready}
        onPress={onContinue}
        style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed, !presentation.ready && styles.buttonDisabled]}
      >
        <Text style={styles.primaryButtonText}>CONTINUE LEARNING</Text>
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
  hero: { backgroundColor: colors.sea, borderColor: colors.ink, borderRadius: 28, borderWidth: 1.5, minHeight: 238, overflow: 'hidden', padding: 22 },
  heroSun: { backgroundColor: colors.mango, borderRadius: 75, height: 150, position: 'absolute', right: -38, top: -44, width: 150 },
  heroCopy: { maxWidth: '62%', zIndex: 2 },
  heroKicker: { color: colors.mango, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.3 },
  heroTitle: { color: colors.paper, fontFamily: fonts.display, fontSize: 32, lineHeight: 37, marginTop: 7, textTransform: 'uppercase' },
  heroSubtitle: { color: colors.paper, fontFamily: fonts.editorial, fontSize: 15, lineHeight: 20, marginTop: 8, opacity: 0.92 },
  guide: { bottom: -28, height: 218, position: 'absolute', right: -24, width: 218 },
  progressTrack: { backgroundColor: colors.paperDeep, borderRadius: 999, height: 14, marginHorizontal: 6, marginTop: -7, overflow: 'hidden', zIndex: 3 },
  progressFill: { backgroundColor: colors.mango, borderRadius: 999, height: 14 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 20 },
  statCard: { backgroundColor: '#FFFFFF', borderColor: colors.border, borderRadius: 20, borderWidth: 1, minHeight: 126, padding: 15, width: '48.4%' },
  statIcon: { alignItems: 'center', borderRadius: 12, height: 36, justifyContent: 'center', width: 36 },
  statValue: { color: colors.ink, fontFamily: fonts.display, fontSize: 29, marginTop: 9 },
  statLabel: { color: colors.inkMuted, fontFamily: fonts.semiBold, fontSize: 11, marginTop: 1 },
  rhythmCard: { alignItems: 'center', backgroundColor: '#FFF1C9', borderColor: '#D7A93E', borderRadius: 22, borderWidth: 1, flexDirection: 'row', gap: 14, marginTop: 18, padding: 17 },
  rhythmIcon: { alignItems: 'center', backgroundColor: colors.coral, borderRadius: 18, height: 54, justifyContent: 'center', transform: [{ rotate: '-4deg' }], width: 54 },
  rhythmCopy: { flex: 1 },
  cardEyebrow: { color: colors.sea, fontFamily: fonts.bold, fontSize: 9, letterSpacing: 1.2 },
  cardTitle: { color: colors.ink, fontFamily: fonts.display, fontSize: 23, marginTop: 3, textTransform: 'uppercase' },
  cardBody: { color: colors.inkMuted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, marginTop: 5 },
  practiceCard: { backgroundColor: '#FFFFFF', borderColor: colors.ink, borderRadius: 24, borderWidth: 1.5, marginTop: 16, padding: 18 },
  practiceTopRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  practiceCopy: { flex: 1 },
  practiceTitle: { color: colors.ink, fontFamily: fonts.display, fontSize: 28, marginTop: 3, textTransform: 'uppercase' },
  secondaryButton: { alignItems: 'center', borderColor: colors.ink, borderRadius: 17, borderWidth: 1.5, justifyContent: 'center', marginTop: 16, minHeight: 50 },
  secondaryButtonText: { color: colors.ink, fontFamily: fonts.bold, fontSize: 13, letterSpacing: 0.5 },
  milestoneSection: { marginTop: 30 },
  sectionEyebrow: { color: colors.sea, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.4 },
  sectionTitle: { color: colors.ink, fontFamily: fonts.display, fontSize: 31, marginTop: 4, textTransform: 'uppercase' },
  sectionIntro: { color: colors.inkMuted, fontFamily: fonts.editorial, fontSize: 16, marginTop: 3 },
  milestoneList: { marginTop: 18 },
  milestoneRow: { flexDirection: 'row', minHeight: 84 },
  milestoneRail: { alignItems: 'center', marginRight: 14, width: 42 },
  milestoneNode: { alignItems: 'center', backgroundColor: colors.locked, borderColor: colors.border, borderRadius: 16, borderWidth: 1, height: 38, justifyContent: 'center', width: 38, zIndex: 2 },
  milestoneComplete: { backgroundColor: colors.sea, borderColor: colors.ink },
  milestoneCurrent: { backgroundColor: colors.coral, borderColor: colors.ink, transform: [{ rotate: '-4deg' }] },
  milestoneLine: { backgroundColor: colors.border, flex: 1, marginVertical: -1, width: 2 },
  milestoneLineComplete: { backgroundColor: colors.sea },
  milestoneCopy: { flex: 1, paddingBottom: 18, paddingTop: 4 },
  milestoneCopyCurrent: { backgroundColor: colors.paperDeep, borderRadius: 16, marginBottom: 12, paddingHorizontal: 13, paddingTop: 11 },
  milestoneTitle: { color: colors.ink, fontFamily: fonts.bold, fontSize: 15 },
  milestoneTitleLocked: { color: colors.inkMuted },
  milestoneDetail: { color: colors.inkMuted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, marginTop: 3 },
  primaryButton: { alignItems: 'center', backgroundColor: colors.ink, borderRadius: 19, flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 12, minHeight: 58, paddingHorizontal: 18 },
  primaryButtonText: { color: colors.paper, fontFamily: fonts.bold, fontSize: 14, letterSpacing: 0.6 },
  buttonPressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  buttonDisabled: { opacity: 0.45 },
});
