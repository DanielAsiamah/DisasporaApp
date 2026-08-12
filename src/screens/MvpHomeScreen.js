import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

import { useAuth } from '../context/AuthContext';
import PatoisLessonModal from '../components/mvp/PatoisLessonModal';
import { getCoursePresentation } from '../data/coursePresentationRegistry';
import { fonts } from '../theme';
import { useReducedMotion } from '../hooks/useReducedMotion';

const { GENERATED_CURRICULUM } = require('../data/generatedCurriculum.cjs');
const { getCourseById } = require('../data/courseCatalog.cjs');
const { canAccessRuntimeCourse } = require('../data/courseAccessPolicy.cjs');
const { buildCourseProgressStorageKey } = require('../lessonEngine/courseProgressKey.cjs');
const { buildTopicStates, mergeCompletedTopicIds } = require('../lessonEngine/topicProgress.cjs');

const SKY = '#1CB0F6';
const NAVY = '#0B245B';
const PALE = '#EAF8FF';
const BORDER = '#D8E8F2';
const MUTED = '#718397';
const GREEN = '#22B65D';
const CLOUD_FILL = '#F4FBFF';
const CLOUD_OFFSCREEN_START = -220;
const CLOUD_DRIFT_DELTA = 14;
const CLOUD_HERO_RESTING_X = 34;
const CLOUD_HERO_SECONDARY_RESTING_X = 228;
const CLOUD_PODIUM_RESTING_X = 28;
const CLOUD_PODIUM_SECONDARY_RESTING_X = 214;
const guideArt = {
  Kai: require('../../assets/guides/kai.png'),
  Amara: require('../../assets/guides/amara.png'),
  Sol: require('../../assets/guides/sol.png'),
};
function Cloud({ top, size, delay = 0, duration = 17000, restingX = 0, reducedMotion }) {
  const drift = useRef(new Animated.Value(CLOUD_OFFSCREEN_START)).current;
  useEffect(() => {
    if (reducedMotion) {
      drift.setValue(restingX);
      return undefined;
    }
    drift.setValue(CLOUD_OFFSCREEN_START);
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(drift, { toValue: restingX, duration: 2200, useNativeDriver: true }),
      Animated.timing(drift, { toValue: restingX + CLOUD_DRIFT_DELTA, duration, useNativeDriver: true }),
      Animated.timing(drift, { toValue: restingX - CLOUD_DRIFT_DELTA, duration, useNativeDriver: true }),
      Animated.timing(drift, { toValue: restingX, duration, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [delay, drift, duration, reducedMotion, restingX]);
  return (
    <Animated.View style={[styles.cloud, { top, width: size, height: size * 0.38, transform: [{ translateX: drift }] }]}>
      <View style={[styles.cloudBubble, { width: size * 0.46, height: size * 0.46, left: size * 0.12, top: -size * 0.2 }]} />
      <View style={[styles.cloudBubble, { width: size * 0.34, height: size * 0.34, right: size * 0.1, top: -size * 0.1 }]} />
    </Animated.View>
  );
}

function BreathingGuide({ name = 'Kai', style, reducedMotion }) {
  const breathe = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reducedMotion) {
      breathe.setValue(0);
      return undefined;
    }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(breathe, { toValue: 1, duration: 1800, useNativeDriver: true }),
      Animated.timing(breathe, { toValue: 0, duration: 1800, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [breathe, reducedMotion]);
  return (
    <Animated.Image
      resizeMode="contain"
      source={guideArt[name] || guideArt.Kai}
      style={[style, { transform: [{ translateY: breathe.interpolate({ inputRange: [0, 1], outputRange: [1, -4] }) }, { scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.012] }) }] }]}
    />
  );
}

function ChapterHero({ guideName = 'Kai', heroSource, reducedMotion }) {
  const drift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reducedMotion) {
      drift.setValue(0);
      return undefined;
    }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(drift, { toValue: 1, duration: 12000, useNativeDriver: true }),
      Animated.timing(drift, { toValue: 0, duration: 12000, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [drift, reducedMotion]);

  return (
    <View style={styles.hero}>
      <Animated.Image
        resizeMode="cover"
        source={heroSource}
        style={[
          styles.heroBackground,
          {
            transform: [
              { scale: drift.interpolate({ inputRange: [0, 1], outputRange: [1.03, 1.07] }) },
              { translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) },
            ],
          },
        ]}
      />
      <View style={styles.heroWash} />
      <Cloud top={42} size={100} duration={15000} restingX={CLOUD_HERO_RESTING_X} reducedMotion={reducedMotion} />
      <Cloud top={90} size={76} delay={2800} duration={19000} restingX={CLOUD_HERO_SECONDARY_RESTING_X} reducedMotion={reducedMotion} />
      <BreathingGuide name={guideName} reducedMotion={reducedMotion} style={styles.heroGuide} />
    </View>
  );
}

function getTopicDisplayGlyph(topic) {
  if (topic.type === 'review') return 'Aa';
  if (topic.type === 'challenge') return '★';
  return topic.order;
}

function getTopicBadgeLabel(topic) {
  if (topic.type === 'review') return 'REVIEW';
  if (topic.type === 'challenge') return 'CHALLENGE';
  return '';
}

function getTopicFocusDescription(topic) {
  if (!topic) return 'Pick up where you left off in the chapter below.';
  if (topic.type === 'review') return 'Revisit the words you already learned before the final challenge.';
  if (topic.type === 'challenge') return 'Put the whole chapter together in one final lesson run.';
  return 'Keep building momentum with the next conversation lesson in your chapter.';
}

function TopicButton({ topic, onPress, reducedMotion }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (topic.state !== 'active' || reducedMotion) {
      pulse.setValue(0);
      return undefined;
    }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse, reducedMotion, topic.state]);
  const isLocked = topic.state === 'locked';
  const isComplete = topic.state === 'complete';
  const topicGlyph = getTopicDisplayGlyph(topic);
  const topicBadgeLabel = getTopicBadgeLabel(topic);
  return (
    <Pressable disabled={isLocked} onPress={() => onPress(topic)} style={styles.topicWrap}>
      <Animated.View style={[
        styles.topicCircle,
        topic.state === 'active' && styles.topicCircleActive,
        isComplete && styles.topicCircleComplete,
        isLocked && styles.topicCircleLocked,
        topic.state === 'active' && { transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }] },
      ]}>
        <Text style={[styles.topicIcon, isLocked && styles.topicIconLocked]}>{isLocked ? '🔒' : isComplete ? '✓' : topicGlyph}</Text>
      </Animated.View>
      <Text numberOfLines={2} style={[styles.topicLabel, topic.state === 'active' && styles.topicLabelActive, isLocked && styles.topicLabelLocked]}>{topic.title}</Text>
      {topicBadgeLabel ? <Text style={styles.topicBadge}>{topicBadgeLabel}</Text> : null}
    </Pressable>
  );
}

function Leaderboard({ profile, reducedMotion }) {
  const learner = profile?.preferredName || profile?.username || 'You';
  const rows = [
    ['Aisha', 1250, 'Amara'], ['Kwame', 1050, 'Kai'], ['Maya', 950, 'Sol'], ['Dina', 800, 'Amara'], ['Malik', 650, 'Kai'], [learner, 600, 'Sol'], ['Zuri', 450, 'Amara'],
  ];
  const podiumRows = rows.slice(0, 3);
  const rankRows = rows.slice(3);
  return (
    <ScrollView contentContainerStyle={styles.leaderboardContent}>
      <Text style={styles.pageTitle}>Weekly League</Text>
      <Text style={styles.pageSubtitle}>Keep learning to climb before Sunday.</Text>
      <LinearGradient colors={['#DDF5FF', '#F6FCFF']} style={styles.podiumCard}>
        <Cloud top={26} size={82} duration={16000} restingX={CLOUD_PODIUM_RESTING_X} reducedMotion={reducedMotion} />
        <Cloud top={76} size={60} delay={2400} duration={19000} restingX={CLOUD_PODIUM_SECONDARY_RESTING_X} reducedMotion={reducedMotion} />
        <View style={styles.podiumGlow} />
        <View style={styles.podiumStage}>
          {podiumRows.map(([name, xp, guide], index) => (
            <View key={name} style={styles.podiumColumn}>
              <BreathingGuide name={guide} reducedMotion={reducedMotion} style={styles.podiumGuide} />
              <Text style={styles.podiumRank}>{index + 1}</Text>
              <View style={styles.podiumCopy}>
                <Text style={styles.podiumName}>{name}</Text>
                <Text style={styles.podiumXp}>{xp} XP</Text>
              </View>
              <View
                style={[
                  styles.podiumTier,
                  index === 0 && styles.podiumTierFirst,
                  index === 1 && styles.podiumTierSecond,
                  index === 2 && styles.podiumTierThird,
                ]}
              />
            </View>
          ))}
        </View>
      </LinearGradient>
      <View style={styles.rankCard}>
        <Text style={styles.rankCardTitle}>Your position</Text>
        <Text style={styles.rankCardBody}>Keep one more lesson streak going to move up this week.</Text>
        <View style={styles.rankList}>
          {rankRows.map(([name, xp, guide], index) => {
            const isYou = name === learner;
            return (
              <View key={`${name}-${index}`} style={[styles.rankRow, isYou && styles.rankRowYou]}>
                <Text style={styles.rankNumber}>{index + 4}</Text>
                <Image resizeMode="contain" source={guideArt[guide]} style={styles.rankAvatar} />
                <Text style={styles.rankName}>{name}</Text>
                <Text style={styles.rankXp}>{xp} XP</Text>
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

export default function MvpHomeScreen({ courseId = 'jamaican-patois', previewCourseId = null }) {
  const { loadLanguageProgress, profile, syncLanguageProgress, user } = useAuth();
  const reducedMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState('learn');
  const [completedTopicIds, setCompletedTopicIds] = useState([]);
  const [progressHydrated, setProgressHydrated] = useState(false);
  const [activeTopic, setActiveTopic] = useState(null);
  const requestedCourseId = courseId === 'patois' ? 'jamaican-patois' : courseId;
  const requestedCourse = getCourseById(requestedCourseId);
  const storageCourseId = canAccessRuntimeCourse(requestedCourse, previewCourseId)
    ? requestedCourse.id
    : 'jamaican-patois';
  const runtimeCourse = getCourseById(storageCourseId);
  const courseReviewPending = runtimeCourse?.published !== true;
  const courseConfig = getCoursePresentation(storageCourseId);
  const courseChapter = useMemo(() => (
    GENERATED_CURRICULUM.chapters.find((chapter) => chapter.courseId === storageCourseId) || null
  ), [storageCourseId]);
  const topics = useMemo(() => (
    GENERATED_CURRICULUM.topics
      .filter((topic) => topic.courseId === storageCourseId)
      .sort((left, right) => left.order - right.order)
  ), [storageCourseId]);
  const storageKey = buildCourseProgressStorageKey(user?.uid, storageCourseId);
  const topicStates = useMemo(() => buildTopicStates(topics, completedTopicIds), [completedTopicIds, topics]);
  const featuredGuide = topicStates.find((topic) => topic.state === 'active')?.guide
    || topics[0]?.guide
    || 'Kai';
  const activeLearnTopic = topicStates.find((topic) => topic.state === 'active') || topicStates[0] || null;
  const activeTopicIndex = activeLearnTopic ? topicStates.findIndex((topic) => topic.id === activeLearnTopic.id) + 1 : 1;
  const completedTopicCount = topicStates.filter((topic) => topic.state === 'complete').length;
  const chapterComplete = completedTopicCount >= topicStates.length && topicStates.length > 0;
  const nextUpTopic = topicStates.find((topic) => topic.state === 'active') || null;
  const chapterProgressLabel = `${completedTopicCount} of ${topicStates.length} topics complete`;
  const nextUpLabel = completedTopicCount >= topicStates.length
    ? 'Chapter complete'
    : `Next up: ${nextUpTopic?.title || 'Getting Started'}`;
  const currentFocusTitle = chapterComplete ? 'Chapter complete' : activeLearnTopic?.title || 'Getting Started';
  const currentFocusBody = chapterComplete ? 'You finished this chapter — replay any topic below whenever you want a refresher.' : getTopicFocusDescription(activeLearnTopic);
  const currentFocusMetaLabel = chapterComplete ? '9 topics complete' : `Lesson ${activeTopicIndex} of ${topicStates.length}`;
  const currentFocusCtaLabel = chapterComplete ? 'Review chapter ↓' : 'Tap to continue →';

  useEffect(() => {
    let cancelled = false;
    setProgressHydrated(false);
    setCompletedTopicIds([]);

    async function hydrateProgress() {
      const [localRaw, remoteProgress] = await Promise.all([
        AsyncStorage.getItem(storageKey).catch(() => null),
        user?.uid
          ? loadLanguageProgress?.(storageCourseId).catch(() => null)
          : Promise.resolve(null),
      ]);
      if (cancelled) return;

      let localIds = [];
      try {
        localIds = localRaw ? JSON.parse(localRaw) : [];
      } catch {
        localIds = [];
      }
      const merged = mergeCompletedTopicIds(
        topics,
        Array.isArray(localIds) ? localIds : [],
        Array.isArray(remoteProgress?.completedTopicIds) ? remoteProgress.completedTopicIds : []
      );
      setCompletedTopicIds(merged);
      setProgressHydrated(true);
    }

    hydrateProgress();
    return () => {
      cancelled = true;
    };
  }, [loadLanguageProgress, storageCourseId, storageKey, topics, user?.uid]);

  useEffect(() => {
    if (!progressHydrated) return;
    AsyncStorage.setItem(storageKey, JSON.stringify(completedTopicIds)).catch(() => {});
    if (user?.uid) {
      syncLanguageProgress?.(storageCourseId, {
        completedTopicIds,
        updatedAt: Date.now(),
      }).catch(() => {});
    }
  }, [completedTopicIds, progressHydrated, storageCourseId, storageKey, syncLanguageProgress, user?.uid]);

  const completeTopic = useCallback((topicId) => {
    setCompletedTopicIds((current) => mergeCompletedTopicIds(topics, current, [topicId]));
  }, [topics]);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.content}>
        {activeTab === 'learn' ? (
          <ScrollView contentContainerStyle={styles.learnContent} showsVerticalScrollIndicator={false}>
            <View style={styles.brandRow}>
              <View style={styles.flagBadge}><Text style={styles.flag}>{courseConfig.flag}</Text></View>
              <Text style={styles.brand}>Diaspora</Text>
              <View style={styles.statPill}><Text>🔥</Text><Text style={styles.statText}>{profile?.streak || 0}</Text></View>
              <View style={styles.statPill}><Text>⭐</Text><Text style={styles.statText}>{profile?.xp || 0}</Text></View>
            </View>
            <View style={styles.streakCopy}>
              <View><Text style={styles.streakTitle}>Start your streak!</Text><Text style={styles.streakSubtitle}>Do a lesson to start your day.</Text></View>
              <Text style={styles.bigFlame}>🔥</Text>
            </View>
            <ChapterHero guideName={featuredGuide} heroSource={courseConfig.hero} reducedMotion={reducedMotion} />
            <View style={styles.chapterCard}>
                <View style={styles.chapterHeader}>
                  <Text style={styles.chapterTitle}>{courseChapter?.title || 'Greetings & basic conversations'}</Text>
                  <Text style={styles.chapterMeta}>{`${courseChapter?.topicCount ?? 9} topics • ${courseChapter?.wordCount ?? 39} words`}</Text>
                      <View style={styles.chapterSummaryRow}>
                        <View style={styles.chapterSummaryPill}><Text style={styles.chapterSummaryText}>{chapterProgressLabel}</Text></View>
                        <View style={styles.chapterSummaryPill}><Text style={styles.chapterSummaryText}>{nextUpLabel}</Text></View>
                      </View>
                      <Pressable disabled={!activeLearnTopic} onPress={() => activeLearnTopic && setActiveTopic(activeLearnTopic)} style={styles.currentFocusCard}>
                        <Text style={styles.currentFocusEyebrow}>CURRENT FOCUS</Text>
                        <Text style={styles.currentFocusTitle}>{currentFocusTitle}</Text>
                        <Text style={styles.currentFocusBody}>{currentFocusBody}</Text>
                        <View style={styles.currentFocusFooter}>
                          <Text style={styles.currentFocusMeta}>{currentFocusMetaLabel}</Text>
                          <Text style={styles.currentFocusCta}>{currentFocusCtaLabel}</Text>
                        </View>
                      </Pressable>
                      {courseReviewPending ? (
                        <View style={styles.reviewBanner}>
                          <Text style={styles.reviewBannerTitle}>Native review pending</Text>
                      <Text style={styles.reviewBannerBody}>
                        This preview content is still awaiting native-speaker approval.
                      </Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.topicGrid}>
              {topicStates.map((topic) => <TopicButton key={topic.id} onPress={setActiveTopic} reducedMotion={reducedMotion} topic={topic} />)}
            </View>
            </View>
          </ScrollView>
        ) : <Leaderboard profile={profile} reducedMotion={reducedMotion} />}
      </View>
      <View style={styles.tabBar}>
        {[['learn', '▣', 'Learn'], ['leaderboard', '♜', 'Leaderboard']].map(([id, icon, label]) => (
          <Pressable key={id} onPress={() => setActiveTab(id)} style={styles.tabButton}>
            <Text style={[styles.tabIcon, activeTab === id && styles.tabActive]}>{icon}</Text>
            <Text style={[styles.tabLabel, activeTab === id && styles.tabActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <PatoisLessonModal courseId={storageCourseId} onAdvance={setActiveTopic} onClose={() => setActiveTopic(null)} onComplete={completeTopic} previewCourseId={previewCourseId} topic={activeTopic} visible={Boolean(activeTopic)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: '#FFFFFF', flex: 1 }, content: { flex: 1 }, learnContent: { paddingBottom: 132 },
  brandRow: { alignItems: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 18, paddingTop: 10 },
  brand: { color: NAVY, flex: 1, fontFamily: fonts.extraBold, fontSize: 19, textAlign: 'center' },
  flagBadge: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: BORDER, borderRadius: 13, borderWidth: 1, height: 42, justifyContent: 'center', width: 48 }, flag: { fontSize: 28 },
  statPill: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: BORDER, borderRadius: 20, borderWidth: 1, flexDirection: 'row', gap: 4, paddingHorizontal: 10, paddingVertical: 7 }, statText: { color: NAVY, fontFamily: fonts.bold, fontSize: 13 },
  streakCopy: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 18 }, streakTitle: { color: '#0E1B2E', fontFamily: fonts.extraBold, fontSize: 23 }, streakSubtitle: { color: MUTED, fontFamily: fonts.semiBold, fontSize: 14, marginTop: 3 }, bigFlame: { fontSize: 35 },
  hero: { backgroundColor: '#BFEAFF', height: 208, overflow: 'hidden' }, heroBackground: { bottom: -8, left: -8, position: 'absolute', right: -8, top: -8 }, heroWash: { backgroundColor: 'rgba(222,247,255,0.16)', bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 }, heroGuide: { bottom: -24, height: 230, left: 22, position: 'absolute', width: 230, zIndex: 3 },
  cloud: { backgroundColor: CLOUD_FILL, borderRadius: 99, position: 'absolute', zIndex: 2 }, cloudBubble: { backgroundColor: CLOUD_FILL, borderRadius: 99, position: 'absolute' },
  chapterCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 34, borderTopRightRadius: 34, marginTop: -30, paddingTop: 24 },
  chapterHeader: { alignItems: 'center', paddingHorizontal: 20 }, chapterTitle: { color: '#0E1B2E', fontFamily: fonts.extraBold, fontSize: 23, textAlign: 'center' }, chapterMeta: { color: MUTED, fontFamily: fonts.bold, fontSize: 15, marginTop: 6 },
  chapterSummaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 12 }, chapterSummaryPill: { backgroundColor: PALE, borderColor: BORDER, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 }, chapterSummaryText: { color: NAVY, fontFamily: fonts.bold, fontSize: 12 },
  currentFocusCard: { backgroundColor: PALE, borderColor: BORDER, borderRadius: 22, borderWidth: 1, marginTop: 16, paddingHorizontal: 18, paddingVertical: 16, width: '100%' }, currentFocusEyebrow: { color: SKY, fontFamily: fonts.extraBold, fontSize: 11, letterSpacing: 0.8 }, currentFocusTitle: { color: NAVY, fontFamily: fonts.extraBold, fontSize: 22, marginTop: 6 }, currentFocusBody: { color: MUTED, fontFamily: fonts.medium, fontSize: 13, lineHeight: 19, marginTop: 6 }, currentFocusFooter: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }, currentFocusMeta: { color: NAVY, fontFamily: fonts.bold, fontSize: 12 }, currentFocusCta: { color: SKY, fontFamily: fonts.extraBold, fontSize: 12 },
  reviewBanner: { backgroundColor: '#FFF7E8', borderColor: '#FFD38A', borderRadius: 16, borderWidth: 1, marginTop: 14, paddingHorizontal: 14, paddingVertical: 12, width: '100%' }, reviewBannerTitle: { color: NAVY, fontFamily: fonts.extraBold, fontSize: 13, textAlign: 'center' }, reviewBannerBody: { color: '#6E5A22', fontFamily: fonts.medium, fontSize: 12, lineHeight: 17, marginTop: 4, textAlign: 'center' },
  topicGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-evenly', paddingBottom: 24, paddingHorizontal: 16, paddingTop: 22 }, topicWrap: { alignItems: 'center', marginBottom: 28, width: '30%' }, topicCircle: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: BORDER, borderRadius: 50, borderWidth: 3, height: 82, justifyContent: 'center', width: 82 }, topicCircleActive: { backgroundColor: SKY, borderColor: '#8DDEFF', borderWidth: 6 }, topicCircleComplete: { backgroundColor: GREEN, borderColor: '#9AE6B7' }, topicCircleLocked: { backgroundColor: '#EDF3F6', borderColor: '#EDF3F6' }, topicIcon: { color: '#FFFFFF', fontFamily: fonts.extraBold, fontSize: 25 }, topicIconLocked: { color: '#91A1AC', fontSize: 21 }, topicLabel: { color: '#4F6170', fontFamily: fonts.bold, fontSize: 12, lineHeight: 17, marginTop: 9, paddingHorizontal: 3, textAlign: 'center' }, topicLabelActive: { color: SKY }, topicLabelLocked: { color: '#95A4AE' }, topicBadge: { color: SKY, fontFamily: fonts.extraBold, fontSize: 10, letterSpacing: 0.8, marginTop: 4, textAlign: 'center' },
  tabBar: { backgroundColor: '#FFFFFF', borderTopColor: BORDER, borderTopWidth: 1, flexDirection: 'row', minHeight: 70, paddingBottom: 5 }, tabButton: { alignItems: 'center', flex: 1, justifyContent: 'center' }, tabIcon: { color: '#8294A2', fontSize: 24 }, tabLabel: { color: '#8294A2', fontFamily: fonts.bold, fontSize: 11, marginTop: 2 }, tabActive: { color: SKY },
  leaderboardContent: { padding: 20, paddingBottom: 36 }, pageTitle: { color: NAVY, fontFamily: fonts.extraBold, fontSize: 27, marginTop: 8 }, pageSubtitle: { color: MUTED, fontFamily: fonts.medium, fontSize: 14, marginBottom: 20, marginTop: 4 }, podiumCard: { borderRadius: 24, minHeight: 260, overflow: 'hidden', paddingHorizontal: 14, paddingTop: 18 }, podiumGlow: { backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 130, height: 130, position: 'absolute', right: -14, top: -28, width: 130 }, podiumStage: { alignItems: 'flex-end', flex: 1, flexDirection: 'row', justifyContent: 'space-between' }, podiumColumn: { alignItems: 'center', width: '31%' }, podiumGuide: { height: 96, marginBottom: -4, width: 96, zIndex: 3 }, podiumRank: { backgroundColor: '#FFD34D', borderRadius: 15, color: NAVY, fontFamily: fonts.extraBold, marginBottom: 8, paddingHorizontal: 9, paddingVertical: 4, zIndex: 4 }, podiumCopy: { alignItems: 'center', marginBottom: 10 }, podiumName: { color: NAVY, fontFamily: fonts.bold, marginTop: 3 }, podiumXp: { color: MUTED, fontFamily: fonts.semiBold, fontSize: 11 }, podiumTier: { backgroundColor: '#FFFFFF', borderColor: '#D4EAF5', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, width: '100%' }, podiumTierFirst: { height: 108 }, podiumTierSecond: { height: 76 }, podiumTierThird: { height: 60 }, rankCard: { backgroundColor: '#FFFFFF', borderColor: BORDER, borderRadius: 24, borderWidth: 1, marginTop: 18, padding: 18 }, rankCardTitle: { color: NAVY, fontFamily: fonts.extraBold, fontSize: 20 }, rankCardBody: { color: MUTED, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, marginTop: 4 }, rankList: { gap: 9, marginTop: 18 }, rankRow: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: BORDER, borderRadius: 16, borderWidth: 1, flexDirection: 'row', padding: 11 }, rankRowYou: { backgroundColor: PALE, borderColor: SKY, borderWidth: 2 }, rankNumber: { color: MUTED, fontFamily: fonts.bold, textAlign: 'center', width: 28 }, rankAvatar: { height: 42, marginHorizontal: 8, width: 42 }, rankName: { color: NAVY, flex: 1, fontFamily: fonts.bold }, rankXp: { color: MUTED, fontFamily: fonts.bold },
});
