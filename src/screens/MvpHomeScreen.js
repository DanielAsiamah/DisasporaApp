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
const guideArt = {
  Kai: require('../../assets/guides/kai.png'),
  Amara: require('../../assets/guides/amara.png'),
  Sol: require('../../assets/guides/sol.png'),
};
function Cloud({ top, size, delay = 0, duration = 17000, reducedMotion }) {
  const drift = useRef(new Animated.Value(-120)).current;
  useEffect(() => {
    if (reducedMotion) {
      drift.setValue(0);
      return undefined;
    }
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(drift, { toValue: 430, duration, useNativeDriver: true }),
      Animated.timing(drift, { toValue: -120, duration: 0, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [delay, drift, duration, reducedMotion]);
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
      <Cloud top={42} size={100} duration={15000} reducedMotion={reducedMotion} />
      <Cloud top={90} size={76} delay={2800} duration={19000} reducedMotion={reducedMotion} />
      <BreathingGuide name={guideName} reducedMotion={reducedMotion} style={styles.heroGuide} />
    </View>
  );
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
  return (
    <Pressable disabled={isLocked} onPress={() => onPress(topic)} style={styles.topicWrap}>
      <Animated.View style={[
        styles.topicCircle,
        topic.state === 'active' && styles.topicCircleActive,
        isComplete && styles.topicCircleComplete,
        isLocked && styles.topicCircleLocked,
        topic.state === 'active' && { transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }] },
      ]}>
        <Text style={[styles.topicIcon, isLocked && styles.topicIconLocked]}>{isLocked ? '🔒' : isComplete ? '✓' : topic.order}</Text>
      </Animated.View>
      <Text numberOfLines={2} style={[styles.topicLabel, topic.state === 'active' && styles.topicLabelActive, isLocked && styles.topicLabelLocked]}>{topic.title}</Text>
    </Pressable>
  );
}

function Leaderboard({ profile }) {
  const learner = profile?.preferredName || profile?.username || 'You';
  const rows = [
    ['Aisha', 1250, 'Amara'], ['Kwame', 1050, 'Kai'], ['Maya', 950, 'Sol'], ['Dina', 800, 'Amara'], ['Malik', 650, 'Kai'], [learner, 600, 'Sol'], ['Zuri', 450, 'Amara'],
  ];
  return (
    <ScrollView contentContainerStyle={styles.leaderboardContent}>
      <Text style={styles.pageTitle}>Weekly League</Text>
      <Text style={styles.pageSubtitle}>Keep learning to climb before Sunday.</Text>
      <LinearGradient colors={['#DDF5FF', '#F6FCFF']} style={styles.podiumCard}>
        {rows.slice(0, 3).map(([name, xp, guide], index) => (
          <View key={name} style={[styles.podiumPerson, index === 0 && styles.podiumFirst]}>
            <Image resizeMode="contain" source={guideArt[guide]} style={styles.podiumAvatar} />
            <Text style={styles.podiumRank}>{index + 1}</Text>
            <Text style={styles.podiumName}>{name}</Text>
            <Text style={styles.podiumXp}>{xp} XP</Text>
          </View>
        ))}
      </LinearGradient>
      <View style={styles.rankList}>
        {rows.slice(3).map(([name, xp, guide], index) => {
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
  const courseConfig = getCoursePresentation(storageCourseId);
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
            <View style={styles.chapterHeader}>
              <Text style={styles.chapterTitle}>Greetings & basic conversations</Text>
              <Text style={styles.chapterMeta}>9 topics • 39 words</Text>
            </View>
            <View style={styles.topicGrid}>
              {topicStates.map((topic) => <TopicButton key={topic.id} onPress={setActiveTopic} reducedMotion={reducedMotion} topic={topic} />)}
            </View>
          </ScrollView>
        ) : <Leaderboard profile={profile} />}
      </View>
      <View style={styles.tabBar}>
        {[['learn', '▣', 'Learn'], ['leaderboard', '♜', 'Leaderboard']].map(([id, icon, label]) => (
          <Pressable key={id} onPress={() => setActiveTab(id)} style={styles.tabButton}>
            <Text style={[styles.tabIcon, activeTab === id && styles.tabActive]}>{icon}</Text>
            <Text style={[styles.tabLabel, activeTab === id && styles.tabActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <PatoisLessonModal courseId={storageCourseId} onClose={() => setActiveTopic(null)} onComplete={completeTopic} previewCourseId={previewCourseId} topic={activeTopic} visible={Boolean(activeTopic)} />
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
  chapterHeader: { alignItems: 'center', backgroundColor: '#FFFFFF', marginTop: -1, paddingHorizontal: 20, paddingTop: 24 }, chapterTitle: { color: '#0E1B2E', fontFamily: fonts.extraBold, fontSize: 23, textAlign: 'center' }, chapterMeta: { color: MUTED, fontFamily: fonts.bold, fontSize: 15, marginTop: 6 },
  topicGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingTop: 22 }, topicWrap: { alignItems: 'center', marginBottom: 25, width: '33.333%' }, topicCircle: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: BORDER, borderRadius: 50, borderWidth: 3, height: 82, justifyContent: 'center', width: 82 }, topicCircleActive: { backgroundColor: SKY, borderColor: '#8DDEFF', borderWidth: 6 }, topicCircleComplete: { backgroundColor: GREEN, borderColor: '#9AE6B7' }, topicCircleLocked: { backgroundColor: '#EDF3F6', borderColor: '#EDF3F6' }, topicIcon: { color: '#FFFFFF', fontFamily: fonts.extraBold, fontSize: 25 }, topicIconLocked: { color: '#91A1AC', fontSize: 21 }, topicLabel: { color: '#4F6170', fontFamily: fonts.bold, fontSize: 12, lineHeight: 17, marginTop: 9, paddingHorizontal: 3, textAlign: 'center' }, topicLabelActive: { color: SKY }, topicLabelLocked: { color: '#95A4AE' },
  tabBar: { backgroundColor: '#FFFFFF', borderTopColor: BORDER, borderTopWidth: 1, flexDirection: 'row', minHeight: 70, paddingBottom: 5 }, tabButton: { alignItems: 'center', flex: 1, justifyContent: 'center' }, tabIcon: { color: '#8294A2', fontSize: 24 }, tabLabel: { color: '#8294A2', fontFamily: fonts.bold, fontSize: 11, marginTop: 2 }, tabActive: { color: SKY },
  leaderboardContent: { padding: 20, paddingBottom: 36 }, pageTitle: { color: NAVY, fontFamily: fonts.extraBold, fontSize: 27, marginTop: 8 }, pageSubtitle: { color: MUTED, fontFamily: fonts.medium, fontSize: 14, marginBottom: 20, marginTop: 4 }, podiumCard: { alignItems: 'flex-end', borderRadius: 24, flexDirection: 'row', justifyContent: 'space-around', minHeight: 230, padding: 14 }, podiumPerson: { alignItems: 'center', width: '31%' }, podiumFirst: { alignSelf: 'flex-start' }, podiumAvatar: { height: 85, width: 85 }, podiumRank: { backgroundColor: '#FFD34D', borderRadius: 15, color: NAVY, fontFamily: fonts.extraBold, marginTop: -8, paddingHorizontal: 9, paddingVertical: 4 }, podiumName: { color: NAVY, fontFamily: fonts.bold, marginTop: 5 }, podiumXp: { color: MUTED, fontFamily: fonts.semiBold, fontSize: 11 }, rankList: { gap: 9, marginTop: 18 }, rankRow: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: BORDER, borderRadius: 16, borderWidth: 1, flexDirection: 'row', padding: 11 }, rankRowYou: { backgroundColor: PALE, borderColor: SKY, borderWidth: 2 }, rankNumber: { color: MUTED, fontFamily: fonts.bold, textAlign: 'center', width: 28 }, rankAvatar: { height: 42, marginHorizontal: 8, width: 42 }, rankName: { color: NAVY, flex: 1, fontFamily: fonts.bold }, rankXp: { color: MUTED, fontFamily: fonts.bold },
});
