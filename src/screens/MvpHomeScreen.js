import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
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
import { useGame } from '../context/GameContext';
import PatoisLessonModal from '../components/mvp/PatoisLessonModal';
import LearnerAccountPanel from '../components/mvp/LearnerAccountPanel';
import { useSoundPreference } from '../audio/useSoundPreference';
import CourseRoadmap from '../components/mvp/CourseRoadmap';
import ProgressDashboard from '../components/mvp/ProgressDashboard';
import { getCoursePresentation } from '../data/coursePresentationRegistry';
import { getCourseImageRegistry } from '../data/courseImageRegistry';
import { fonts } from '../theme';
import { useReducedMotion } from '../hooks/useReducedMotion';
import AnimatedGuide from '../components/mvp/AnimatedGuide';
import { guideArt } from '../data/guideArtRegistry';
import { subscribeLeaderboard, subscribeLeaderboardMembership, syncLeaderboardEntry, leaveLeaderboard } from '../services/firestore/leaderboardService';

const { getRuntimeCurriculum } = require('../data/runtimeCurriculum.cjs');
const { getCourseById } = require('../data/courseCatalog.cjs');
const { canAccessRuntimeCourse } = require('../data/courseAccessPolicy.cjs');
const { buildCourseProgressStorageKey } = require('../lessonEngine/courseProgressKey.cjs');
const { buildLiveLeaderboard } = require('../lessonEngine/liveLeaderboard.cjs');
const {
  createMutationProgressSnapshot,
  createProgressSnapshot,
  getCompletedTopicIdsForKey,
  isProgressSnapshotCurrent,
} = require('../lessonEngine/mvpProgressState.cjs');
const { buildTopicStates, mergeCompletedTopicIds } = require('../lessonEngine/topicProgress.cjs');
const { buildCoreLoopViewModel } = require('../lessonExperience/coreLoopPresentation.cjs');
const { buildProgressDashboardViewModel } = require('../lessonExperience/progressDashboardPresentation.cjs');
const { buildHeartsPresentation } = require('../lessonExperience/heartsPresentation.cjs');
const { buildCourseTopicExercises } = require('../lessonEngine/patoisLessonSteps.cjs');
const {
  buildAdaptiveReviewTopic,
  mergeMistakeQueues,
  recordPersistentMistake,
  resolveAdaptiveReview,
} = require('../lessonExperience/adaptiveMistakeReview.cjs');
const { saveProgressSnapshot } = require('../lessonEngine/progressSave.cjs');
const { readLocalProgress } = require('../lessonEngine/localProgressRead.cjs');
const { readRemoteProgress } = require('../lessonEngine/remoteProgressRead.cjs');
const { getLearningProgressPresentation, getStreakPresentation, orderPodiumEntries } = require('./mvpHomePresentation.cjs');
const { MVP_TABS } = require('../navigation/mvpNavigation.cjs');

const SKY = '#2D7668';
const SKY_TEXT = '#245F55';
const NAVY = '#1D2925';
const PALE = '#F4E9D4';
const BORDER = '#D8CDBA';
const MUTED = '#65716C';
const INACTIVE_TEXT = '#65716C';
const GREEN = '#2D7668';

function BreathingGuide({ accessible = false, name = 'Kai', style, reducedMotion }) {
  return (
    <AnimatedGuide accessible={accessible} name={name} reducedMotion={reducedMotion} style={style} />
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
      {heroSource ? <Animated.Image
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
      /> : null}
      <View style={styles.heroWash} />
      <View style={styles.heroSun} />
      <View style={styles.heroRule} />
      <View style={styles.heroStamp}><Text style={styles.heroStampText}>SPEAK • CONNECT • BELONG</Text></View>
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

function TopicButton({ progressReady, topic, onPress, reducedMotion }) {
  const pulse = useRef(new Animated.Value(0)).current;
  const isActive = progressReady && topic.state === 'active';
  useEffect(() => {
    if (!isActive || reducedMotion) {
      pulse.setValue(0);
      return undefined;
    }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [isActive, pulse, reducedMotion]);
  const isLoading = !progressReady;
  const isLocked = progressReady && topic.state === 'locked';
  const isComplete = progressReady && topic.state === 'complete';
  const interactionDisabled = isLocked || !progressReady;
  const topicGlyph = getTopicDisplayGlyph(topic);
  const topicBadgeLabel = getTopicBadgeLabel(topic);
  const topicStateLabel = !progressReady ? 'progress loading' : isLocked ? 'locked' : isComplete ? 'completed' : 'ready to learn';
  return (
    <Pressable
      accessibilityLabel={`${topic.title}, ${topicStateLabel}`}
      accessibilityRole="button"
      accessibilityState={{ disabled: interactionDisabled, selected: isActive }}
      disabled={interactionDisabled}
      onPress={() => onPress(topic)}
      style={styles.topicWrap}
    >
      <Animated.View style={[
        styles.topicCircle,
        isLoading && styles.topicCircleLoading,
        isActive && styles.topicCircleActive,
        isComplete && styles.topicCircleComplete,
        isLocked && styles.topicCircleLocked,
        isActive && { transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }] },
      ]}>
        {isLoading ? (<Ionicons accessible={false} color={MUTED} name="ellipsis-horizontal" size={22} />) : isLocked ? (<Ionicons accessible={false} color="#91A1AC" name="lock-closed" size={21} />) : (<Text style={styles.topicIcon}>{isComplete ? '✓' : topicGlyph}</Text>)}
      </Animated.View>
      <Text numberOfLines={2} style={[styles.topicLabel, isLoading && styles.topicLabelLoading, isActive && styles.topicLabelActive, isLocked && styles.topicLabelLocked]}>{topic.title}</Text>
      {topicBadgeLabel ? <Text style={styles.topicBadge}>{topicBadgeLabel}</Text> : null}
    </Pressable>
  );
}

function formatLeaderboardEntryAccessibilityLabel(entry) {
  return `Rank ${entry.rank}, ${entry.name}, ${entry.xp} XP${entry.isCurrentUser ? ', your position' : ''}`;
}

function Leaderboard({ profile, reducedMotion }) {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!user?.uid) return undefined;
    let current = true;
    setLoading(true);
    setError('');
    setMember(null);
    setEntries([]);
    const failed = () => {
      if (!current) return;
      setLoading(false);
      setError('The leaderboard could not connect. Your lesson progress is safe.');
    };
    const stopRows = subscribeLeaderboard((rows) => {
      if (!current) return;
      setEntries(rows);
      setLoading(false);
    }, failed);
    const stopMember = subscribeLeaderboardMembership(user.uid, (value) => {
      if (current) setMember(value);
    }, failed);
    syncLeaderboardEntry(user.uid).catch(failed);
    return () => { current = false; stopRows(); stopMember(); };
  }, [user?.uid, profile?.xp, profile?.preferredName, revision]);
  const changeMembership = async () => {
    if (busy || member === null) return;
    setBusy(true);
    setError('');
    try {
      if (member) await leaveLeaderboard(user.uid);
      else await syncLeaderboardEntry(user.uid, { join: true });
    } catch {
      setError('Your leaderboard preference could not be saved. Please retry.');
    } finally { setBusy(false); }
  };
  const { learner, progressCopy, rows } = buildLiveLeaderboard(entries, user?.uid);
  const podiumRows = orderPodiumEntries(rows);
  const rankRows = rows.slice(3);
  return (
    <ScrollView contentContainerStyle={styles.leaderboardContent} showsVerticalScrollIndicator={false}>
      <Text accessibilityRole="header" style={styles.pageTitle}>Diaspora League</Text>
      <Text style={styles.pageSubtitle}>The top 50 learners, ranked by shared saved XP.</Text>
      <View style={styles.rankCard}>
        <Text style={styles.rankCardBody}>{member
          ? 'Your display name and saved XP are shared with signed-in learners. Leave whenever you like.'
          : 'Join to share your display name and saved XP with other learners. Your email stays private.'}</Text>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy || member === null }} disabled={busy || member === null} onPress={changeMembership} style={styles.leagueButton}>
          <Text style={styles.leagueButtonText}>{busy ? 'Saving...' : member ? 'Leave leaderboard' : 'Join leaderboard'}</Text>
        </Pressable>
      </View>
      {loading ? <Text accessibilityLiveRegion="polite" style={styles.pageSubtitle}>Loading leaderboard...</Text> : null}
      {error ? <View accessibilityLiveRegion="polite"><Text style={styles.rankCardBody}>{error}</Text><Pressable accessibilityRole="button" onPress={() => setRevision((value) => value + 1)} style={styles.leagueButton}><Text style={styles.leagueButtonText}>Retry connection</Text></Pressable></View> : null}
      {!loading && !error && rows.length === 0 ? <Text style={styles.pageSubtitle}>Be the first learner to join.</Text> : null}
      <View style={styles.leaderboardSummaryRow}>
        <View style={styles.leaderboardSummaryPill}>
          <Text style={styles.leaderboardSummaryLabel}>LEAGUE</Text>
          <Text style={styles.leaderboardSummaryValue}>Diaspora</Text>
        </View>
        <View style={styles.leaderboardSummaryPill}>
          <Text style={styles.leaderboardSummaryLabel}>YOUR RANK</Text>
          <Text style={styles.leaderboardSummaryValue}>{learner ? `#${learner.rank}` : 'Unranked'}</Text>
        </View>
      </View>
      {rows.length > 0 ? <LinearGradient colors={['#F7D681', '#FFF3D1']} style={styles.podiumCard}>
        <View style={styles.podiumSun} />
        <View style={styles.podiumGlow} />
        <View style={styles.podiumStage}>
          {podiumRows.map((entry) => (
            <View
              accessible
              accessibilityLabel={formatLeaderboardEntryAccessibilityLabel(entry)}
              key={entry.id}
              style={styles.podiumColumn}
            >
              <BreathingGuide accessible={false} name={entry.guide} reducedMotion={reducedMotion} style={styles.podiumGuide} />
              <Text style={styles.podiumRank}>{entry.rank}</Text>
              <View style={styles.podiumCopy}>
                <Text numberOfLines={1} style={styles.podiumName}>{entry.name}</Text>
                <Text style={styles.podiumXp}>{entry.xp} XP</Text>
              </View>
              <View
                style={[
                  styles.podiumTier,
                  entry.rank === 1 && styles.podiumTierFirst,
                  entry.rank === 2 && styles.podiumTierSecond,
                  entry.rank === 3 && styles.podiumTierThird,
                ]}
              />
            </View>
          ))}
        </View>
      </LinearGradient> : null}
      <View style={styles.rankCard}>
        <Text accessibilityRole="header" style={styles.rankCardTitle}>Your position</Text>
        <Text style={styles.rankCardBody}>{progressCopy}</Text>
        <View style={styles.rankList}>
          {rankRows.map((entry) => (
            <View
              accessible
              accessibilityLabel={formatLeaderboardEntryAccessibilityLabel(entry)}
              key={entry.id}
              style={[styles.rankRow, entry.isCurrentUser && styles.rankRowYou]}
            >
              <Text style={styles.rankNumber}>{entry.rank}</Text>
              <Image accessible={false} resizeMode="contain" source={guideArt[entry.guide]} style={styles.rankAvatar} />
              <Text style={styles.rankName}>{entry.name}</Text>
              <Text style={styles.rankXp}>{entry.xp} XP</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

export default function MvpHomeScreen({ courseId = 'jamaican-patois', previewCourseId = null, onSignedOut, onChooseCourse }) {
  const { user } = useAuth();
  const requestedCourseId = courseId === 'patois' ? 'jamaican-patois' : courseId;
  const requestedCourse = getCourseById(requestedCourseId);
  const storageCourseId = canAccessRuntimeCourse(requestedCourse, previewCourseId)
    ? requestedCourse.id
    : 'jamaican-patois';
  const storageKey = buildCourseProgressStorageKey(user?.uid, storageCourseId);

  return (
    <MvpHomeCourseShell
      key={storageKey}
      previewCourseId={previewCourseId}
      storageCourseId={storageCourseId}
      storageKey={storageKey}
      onSignedOut={onSignedOut}
      onChooseCourse={onChooseCourse}
    />
  );
}

function MvpHomeCourseShell({ previewCourseId, storageCourseId, storageKey, onSignedOut, onChooseCourse }) {
  const { awardCorrectAnswerXp, loadLanguageProgress, profile, recordDailyLearning, signOut, syncLanguageProgress, syncProgress, user } = useAuth();
  const game = useGame();
  const heartsPresentation = buildHeartsPresentation(game);
  const soundPreference = useSoundPreference({ savedValue: profile?.soundEffectsEnabled, save: syncProgress });
  const [accountOpen, setAccountOpen] = useState(false);
  const reducedMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState('learn');
  const [progressSnapshot, setProgressSnapshot] = useState(() => createProgressSnapshot(null));
  const [progressRetry, setProgressRetry] = useState(0);
  const [progressReadError, setProgressReadError] = useState(false);
  const [saveRetry, setSaveRetry] = useState(0);
  const [saveStatus, setSaveStatus] = useState({ local: 'not-required', remote: 'not-required' });
  const [streakSaveStatus, setStreakSaveStatus] = useState('idle');
  const [activeTopic, setActiveTopic] = useState(null);
  const [mistakeQueue, setMistakeQueue] = useState(null);
  const runtimeCourse = getCourseById(storageCourseId);
  const courseReviewPending = runtimeCourse?.published !== true;
  const courseConfig = getCoursePresentation(storageCourseId) || {};
  const curriculum = getRuntimeCurriculum(storageCourseId);
  const courseImageRegistry = useMemo(() => getCourseImageRegistry(storageCourseId), [storageCourseId]);
  const courseChapter = useMemo(() => (
    curriculum.chapters.find((chapter) => chapter.courseId === storageCourseId) || null
  ), [curriculum, storageCourseId]);
  const topics = useMemo(() => (
    curriculum.topics
      .filter((topic) => topic.courseId === storageCourseId)
      .sort((left, right) => left.order - right.order)
  ), [curriculum, storageCourseId]);
  const progressReady = isProgressSnapshotCurrent(progressSnapshot, storageKey);
  const completedTopicIds = getCompletedTopicIdsForKey(progressSnapshot, storageKey);
  const topicStates = useMemo(() => buildTopicStates(topics, completedTopicIds), [completedTopicIds, topics]);
  const coreLoopView = useMemo(() => buildCoreLoopViewModel({
    activeTopicId: topicStates.find((topic) => topic.state === 'active')?.id || null,
    completedTopicIds,
    course: {
      ...runtimeCourse,
      category: courseConfig.category || runtimeCourse?.category,
      displayName: courseConfig.name || runtimeCourse?.displayName,
      flag: courseConfig.flag || runtimeCourse?.flag,
    },
    topics,
  }), [completedTopicIds, courseConfig.category, courseConfig.flag, courseConfig.name, runtimeCourse, topicStates, topics]);
  const exercisesByTopic = useMemo(() => new Map(topics.map((topic) => [
    topic.id,
    buildCourseTopicExercises(storageCourseId, topic.id, {
      concepts: curriculum.concepts,
      lessonSteps: curriculum.lessonSteps,
      vocabulary: curriculum.courseVocabulary.filter((row) => row.courseId === storageCourseId),
      hasImage: conceptId => Boolean(courseImageRegistry[conceptId]),
    }),
  ])), [courseImageRegistry, curriculum, storageCourseId, topics]);
  const adaptiveReviewTopic = useMemo(() => buildAdaptiveReviewTopic({
    courseId: storageCourseId,
    exercisesByTopic,
    mistakeQueue: mistakeQueue || [],
    resumeTopicId: coreLoopView.activeCard?.id || null,
    topics,
  }), [coreLoopView.activeCard?.id, exercisesByTopic, mistakeQueue, storageCourseId, topics]);
  const topicCardsById = useMemo(() => new Map(coreLoopView.lessonCards.map((card) => [card.id, card])), [coreLoopView.lessonCards]);
  const chapterComplete = coreLoopView.chapterComplete;
  const hasAdaptiveReview = Boolean(adaptiveReviewTopic);
  const featuredGuide = (hasAdaptiveReview ? adaptiveReviewTopic?.guide : null)
    || topicStates.find((topic) => topic.id === coreLoopView.activeCard?.id)?.guide
    || topics[0]?.guide
    || 'Kai';
  const activeLearnTopic = (hasAdaptiveReview ? adaptiveReviewTopic : null)
    || topicStates.find((topic) => topic.id === coreLoopView.activeCard?.id)
    || topicStates.find((topic) => topic.state === 'active')
    || topicStates[0]
    || null;
  const activeTopicIndex = activeLearnTopic ? topicStates.findIndex((topic) => topic.id === activeLearnTopic.id) + 1 : 1;
  const completedTopicCount = coreLoopView.progress.completed;
  const hasMorePlannedLessons = courseChapter?.plannedTopicCount > courseChapter?.topicCount;
  const completionLabel = hasMorePlannedLessons ? 'Available drafts complete' : 'Chapter complete';
  const nextUpTopic = topicStates.find((topic) => topic.state === 'active') || null;
  const chapterProgressLabel = !progressReady
    ? 'Loading saved progress'
    : `${coreLoopView.progress.completed} of ${coreLoopView.progress.total} topics complete`;
  const nextUpLabel = !progressReady
    ? 'Checking your topics…'
    : hasAdaptiveReview
      ? `${adaptiveReviewTopic.reviewExerciseIds.length} weak ${adaptiveReviewTopic.reviewExerciseIds.length === 1 ? 'exercise' : 'exercises'} ready`
    : completedTopicCount >= topicStates.length
      ? completionLabel
      : `Next up: ${nextUpTopic?.title || 'Getting Started'}`;
  const currentFocusTitle = !progressReady
    ? 'Loading your learning path'
    : hasAdaptiveReview ? adaptiveReviewTopic.title
    : chapterComplete ? completionLabel : activeLearnTopic?.title || 'Getting Started';
  const currentFocusBody = !progressReady
    ? 'Syncing your saved topics before the next lesson opens.'
    : hasAdaptiveReview
      ? 'Your guide picked due phrases from past mistakes. Recall them correctly across three spaced reviews to master them.'
    : chapterComplete ? hasMorePlannedLessons
      ? 'You finished the available drafts. Replay a lesson while the rest of the chapter is being prepared.'
      : 'You finished this chapter — replay any topic below whenever you want a refresher.' : getTopicFocusDescription(activeLearnTopic);
  const currentFocusMetaLabel = !progressReady
    ? 'Progress syncing'
    : hasAdaptiveReview ? `${adaptiveReviewTopic.reviewExerciseIds.length} due from your practice queue`
    : chapterComplete ? `${coreLoopView.progress.total} topics complete` : `${coreLoopView.activeCard?.modeLabel || 'Lesson'} ${activeTopicIndex} of ${topicStates.length}`;
  const currentFocusHint = !progressReady
    ? 'Wait while saved progress loads'
    : hasAdaptiveReview
    ? 'Opens your personalised mistake review'
    : chapterComplete
    ? `Opens ${activeLearnTopic?.title || 'the first topic'} for review`
    : 'Opens your current lesson';
  const currentFocusCtaLabel = !progressReady
    ? 'Please wait'
    : hasAdaptiveReview ? 'Practice now →'
    : `${coreLoopView.activeCard?.ctaLabel || 'Start lesson'} →`;
  const learningPresentation = getLearningProgressPresentation({ ready: progressReady, completed: completedTopicCount, total: topicStates.length, hasMorePlannedLessons });
  const streakPresentation = getStreakPresentation({ streak: profile?.streak, dailyGoalMinutes: profile?.dailyGoalMinutes });
  const progressDashboard = useMemo(() => buildProgressDashboardViewModel({
    completedTopicIds,
    courseName: runtimeCourse?.displayName,
    dailyGoalMinutes: profile?.dailyGoalMinutes,
    duePracticeCount: adaptiveReviewTopic?.dueCount,
    ready: progressReady,
    streak: profile?.streak,
    topics,
    totalWords: courseChapter?.wordCount,
    xp: profile?.xp,
  }), [
    adaptiveReviewTopic?.dueCount,
    completedTopicIds,
    courseChapter?.wordCount,
    profile?.dailyGoalMinutes,
    profile?.streak,
    profile?.xp,
    progressReady,
    runtimeCourse?.displayName,
    topics,
  ]);
  const practiceTopic = adaptiveReviewTopic
    || [...topicStates].reverse().find((topic) => topic.state === 'complete')
    || topicStates[0]
    || null;

  useEffect(() => {
    setActiveTopic(null);
    setMistakeQueue(null);
  }, [storageCourseId, user?.uid]);

  useEffect(() => {
    let cancelled = false;
    setProgressSnapshot(createProgressSnapshot(null));
    setProgressReadError(false);

    async function hydrateProgress() {
      let localIds;
      let localMistakes;
      try {
        localIds = await readLocalProgress(() => AsyncStorage.getItem(storageKey));
        const rawMistakes = await AsyncStorage.getItem(`${storageKey}:mistakes`);
        localMistakes = rawMistakes === null ? [] : JSON.parse(rawMistakes);
        if (!Array.isArray(localMistakes)) throw new Error('Saved mistake review is unreadable.');
      } catch {
        if (!cancelled) setProgressReadError(true);
        return;
      }
      if (cancelled) return;
      const remoteResult = user?.uid
        ? await readRemoteProgress(() => loadLanguageProgress?.(storageCourseId))
        : { status: 'not-required', value: null };
      if (cancelled) return;
      const remoteIds = Array.isArray(remoteResult.value?.completedTopicIds)
        ? remoteResult.value.completedTopicIds
        : [];
      const merged = mergeCompletedTopicIds(
        topics,
        Array.isArray(localIds) ? localIds : [],
        remoteIds
      );
      setProgressSnapshot(createProgressSnapshot(storageKey, merged, {
        remoteReadStatus: remoteResult.status,
        shouldSyncRemote: remoteResult.status === 'success'
          && merged.some((topicId) => !remoteIds.includes(topicId)),
      }));
      setMistakeQueue(mergeMistakeQueues(localMistakes, remoteResult.value?.mistakes));
    }

    hydrateProgress();
    return () => {
      cancelled = true;
    };
  }, [loadLanguageProgress, storageCourseId, storageKey, topics, user?.uid, progressRetry]);

  useEffect(() => {
    if (!progressReady || mistakeQueue === null) return;
    AsyncStorage.setItem(`${storageKey}:mistakes`, JSON.stringify(mistakeQueue)).catch(() => {});
    if (user?.uid && syncLanguageProgress && progressSnapshot.remoteReadStatus === 'success') {
      syncLanguageProgress(storageCourseId, { mistakes: mistakeQueue }).catch(() => {});
    }
  }, [mistakeQueue, progressReady, progressSnapshot.remoteReadStatus, storageCourseId, storageKey, syncLanguageProgress, user?.uid]);

  useEffect(() => {
    if (!isProgressSnapshotCurrent(progressSnapshot, storageKey)) return;
    let current = true;
    setSaveStatus({ local: 'saving', remote: progressSnapshot.shouldSyncRemote ? 'saving' : 'not-required' });
    saveProgressSnapshot({
      snapshot: progressSnapshot,
      storageKey,
      onUpdate: (result) => { if (current) setSaveStatus(result); },
      saveLocal: () => AsyncStorage.setItem(storageKey, JSON.stringify(progressSnapshot.completedTopicIds)),
      saveRemote: user?.uid && syncLanguageProgress ? () => syncLanguageProgress?.(storageCourseId, {
        completedTopicIds: progressSnapshot.completedTopicIds,
        updatedAt: Date.now(),
      }) : null,
    }).then((result) => { if (current) setSaveStatus(result); });
    return () => { current = false; };
  }, [progressSnapshot, storageCourseId, storageKey, syncLanguageProgress, user?.uid, saveRetry]);

  const saveDailyStreak = useCallback(() => {
    setStreakSaveStatus('saving');
    return recordDailyLearning()
      .then(() => setStreakSaveStatus('saved'))
      .catch(() => setStreakSaveStatus('error'));
  }, [recordDailyLearning]);

  const completeTopic = useCallback((topicId, result = {}) => {
    if (!progressReady) return;
    saveDailyStreak();
    if (topicId === adaptiveReviewTopic?.id) {
      setMistakeQueue((current) => resolveAdaptiveReview(
        current || [],
        adaptiveReviewTopic.reviewExerciseIds,
        result.mistakeExerciseIds
      ));
      return;
    }
    setProgressSnapshot((current) => {
      if (!isProgressSnapshotCurrent(current, storageKey)) return current;
      const merged = mergeCompletedTopicIds(topics, current.completedTopicIds, [topicId]);
      return createMutationProgressSnapshot(current, storageKey, merged);
    });
  }, [adaptiveReviewTopic, progressReady, saveDailyStreak, storageKey, topics]);

  const recordLessonMistake = useCallback((mistake) => {
    setMistakeQueue((current) => recordPersistentMistake(current || [], mistake));
  }, []);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.content}>
        {activeTab === 'learn' ? (
          <ScrollView contentContainerStyle={styles.learnContent} showsVerticalScrollIndicator={false}>
            {progressReadError ? (
              <View style={styles.progressNotice} accessibilityLiveRegion="polite">
                <Text style={styles.rankCardBody}>Saved progress on this device could not be read. Lessons are paused to protect it; no replacement progress has been saved.</Text>
                <Pressable accessibilityRole="button" style={styles.leagueButton} onPress={() => setProgressRetry((value) => value + 1)}>
                  <Text style={styles.leagueButtonText}>Retry loading progress</Text>
                </Pressable>
              </View>
            ) : null}
            {progressReady && (saveStatus.local === 'error' || saveStatus.remote === 'error' || progressSnapshot.remoteReadStatus === 'error') ? (
              <View style={styles.progressNotice} accessibilityLiveRegion="polite">
                <Text style={styles.rankCardBody}>{saveStatus.local === 'error'
                  ? 'Progress could not be saved on this device. Keep the app open and retry.'
                  : progressSnapshot.remoteReadStatus === 'error'
                    ? 'Cloud progress could not be loaded. Your current progress will be kept on this device when its save finishes.'
                    : saveStatus.local === 'saved'
                      ? 'Cloud sync failed. Your progress is saved on this device.'
                      : 'Cloud sync failed. The device save is still pending.'}</Text>
                <Pressable accessibilityRole="button" style={styles.leagueButton} onPress={() => {
                  if (saveStatus.local === 'error') setSaveRetry((value) => value + 1);
                  else if (progressSnapshot.remoteReadStatus === 'error' && saveStatus.local === 'saved') setProgressRetry((value) => value + 1);
                  else setSaveRetry((value) => value + 1);
                }}>
                  <Text style={styles.leagueButtonText}>Retry progress save</Text>
                </Pressable>
              </View>
            ) : null}
            {streakSaveStatus === 'error' ? (
              <View style={styles.progressNotice} accessibilityLiveRegion="polite">
                <Text style={styles.rankCardBody}>Your lesson progress is safe, but the daily streak could not sync.</Text>
                <Pressable accessibilityRole="button" style={styles.leagueButton} onPress={saveDailyStreak}>
                  <Text style={styles.leagueButtonText}>Retry streak save</Text>
                </Pressable>
              </View>
            ) : null}
            <View style={styles.brandRow}>
              <View style={styles.flagBadge}><Text style={styles.flag}>{coreLoopView.courseIdentity.flag}</Text></View>
              <Text style={styles.brand}>Diaspora</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Account" accessibilityState={{ expanded: accountOpen }} onPress={() => setAccountOpen(open => !open)} style={styles.accountButton}>
                <Ionicons accessible={false} color={NAVY} name="person-circle-outline" size={27} />
              </Pressable>
              <View accessible accessibilityLabel={heartsPresentation.accessibilityLabel} style={styles.statPill}>
                <Ionicons accessible={false} color="#FF5D66" name="heart" size={18} />
                <Text style={styles.statText}>{heartsPresentation.countLabel}</Text>
              </View>
              <View accessible accessibilityLabel={`${profile?.xp || 0} experience points`} style={styles.statPill}>
                <Ionicons accessible={false} color="#FFC928" name="star" size={18} />
                <Text style={styles.statText}>{profile?.xp || 0}</Text>
              </View>
            </View>
            {onChooseCourse ? (
              <Pressable accessibilityRole="button" accessibilityLabel={`Change language, current course ${runtimeCourse.displayName}`} onPress={onChooseCourse} style={styles.courseSwitch}>
                <Text style={styles.courseSwitchName}>{runtimeCourse.displayName}</Text>
                <Text style={styles.courseSwitchAction}>Change</Text>
                <Ionicons accessible={false} name="chevron-down" size={18} color={SKY_TEXT} />
              </Pressable>
            ) : null}
            {accountOpen ? <LearnerAccountPanel user={user} profile={profile} soundPreference={soundPreference} saveStatus={{ ...saveStatus, remoteReadStatus: progressSnapshot.remoteReadStatus }} signOut={signOut} onSignedOut={onSignedOut} onClose={() => setAccountOpen(false)} /> : null}
            <View style={styles.streakCopy}>
              <View style={styles.streakTextColumn}>
                <Text accessible accessibilityLabel={streakPresentation.accessibilityLabel} accessibilityRole="header" style={styles.streakTitle}>{streakPresentation.title}</Text>
                <Text style={styles.streakSubtitle}>{streakPresentation.subtitle}</Text>
              </View>
              <View style={styles.streakBadge}>
                <Ionicons accessible={false} color="#FF8A00" name="flame" size={28} />
                <Text style={styles.streakCount}>{streakPresentation.countLabel}</Text>
              </View>
            </View>
            <Text accessible accessibilityLabel={learningPresentation.accessibilityLabel} style={styles.progressSummary}>{learningPresentation.subtitle}</Text>
            <ChapterHero guideName={featuredGuide} heroSource={courseConfig.hero} reducedMotion={reducedMotion} />
            <View style={styles.chapterCard}>
                <View style={styles.chapterHeader}>
                  <Text style={styles.courseKicker}>{coreLoopView.courseIdentity.category}</Text>
                  <Text accessibilityRole="header" style={styles.chapterTitle}>{courseChapter?.title || `${coreLoopView.courseIdentity.title} foundations`}</Text>
                  <Text style={styles.chapterMeta}>{`${courseChapter?.topicCount ?? coreLoopView.progress.total} topics • ${courseChapter?.wordCount ?? 39} words`}</Text>
                  {courseChapter?.coverageNote ? <Text testID="master-preview-coverage" style={styles.reviewBannerBody}>{courseChapter.coverageNote}</Text> : null}
                      <View
                        accessible
                        accessibilityLabel={`Course progress ${coreLoopView.progress.percent} percent`}
                        accessibilityRole="progressbar"
                        accessibilityValue={{ min: 0, max: 100, now: coreLoopView.progress.percent }}
                        style={styles.pathProgressTrack}
                      >
                        <View style={[styles.pathProgressFill, { width: `${progressReady ? coreLoopView.progress.percent : 0}%` }]} />
                      </View>
                      <View style={styles.chapterSummaryRow}>
                        <View style={styles.chapterSummaryPill}><Text style={styles.chapterSummaryText}>{chapterProgressLabel}</Text></View>
                        <View style={styles.chapterSummaryPill}><Text style={styles.chapterSummaryText}>{nextUpLabel}</Text></View>
                      </View>
                      <Pressable
                        accessibilityHint={currentFocusHint}
                        accessibilityLabel={`${currentFocusTitle}. ${currentFocusMetaLabel}`}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: !progressReady || !activeLearnTopic }}
                        disabled={!progressReady || !activeLearnTopic}
                        onPress={() => progressReady && activeLearnTopic && setActiveTopic(activeLearnTopic)}
                        style={styles.currentFocusCard}
                      >
                        <Text style={styles.currentFocusEyebrow}>CURRENT FOCUS</Text>
                        <Text style={styles.currentFocusTitle}>{currentFocusTitle}</Text>
                        <Text style={styles.currentFocusBody}>{currentFocusBody}</Text>
                        <View style={styles.currentFocusFooter}>
                          <Text style={styles.currentFocusMeta}>{currentFocusMetaLabel}</Text>
                          <Text style={styles.currentFocusCta}>{currentFocusCtaLabel}</Text>
                        </View>
                      </Pressable>
                      {!progressReady ? <Text accessibilityLiveRegion="polite" style={styles.progressLoading}>Loading your saved progress…</Text> : null}
                      {courseReviewPending ? (
                        <View style={styles.reviewBanner}>
                          <Text style={styles.reviewBannerTitle}>{coreLoopView.courseIdentity.reviewLabel}</Text>
                      <Text style={styles.reviewBannerBody}>
                        This preview content is still awaiting native-speaker approval.
                      </Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.topicGrid}>
              {topicStates.map((topic) => (
                <TopicButton
                  key={topic.id}
                  onPress={setActiveTopic}
                  progressReady={progressReady}
                  reducedMotion={reducedMotion}
                  topic={{ ...topic, ...topicCardsById.get(topic.id), state: topic.state }}
                />
              ))}
            </View>
            </View>
            <CourseRoadmap courseId={storageCourseId} topics={topicStates} progressReady={progressReady} onOpenTopic={setActiveTopic} />
          </ScrollView>
        ) : activeTab === 'progress' ? (
          <ProgressDashboard
            guideName={featuredGuide}
            onContinue={() => setActiveTab('learn')}
            onPractice={() => progressReady && practiceTopic && setActiveTopic(practiceTopic)}
            presentation={progressDashboard}
            reducedMotion={reducedMotion}
          />
        ) : <Leaderboard profile={profile} reducedMotion={reducedMotion} />}
      </View>
      <View style={styles.tabBar}>
        {MVP_TABS.map(({ activeIcon, icon, id, label }, index) => (
          <Pressable
            accessibilityLabel={`${label}, ${index + 1} of ${MVP_TABS.length}, main navigation`}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === id }}
            key={id}
            onPress={() => setActiveTab(id)}
            style={styles.tabButton}
          >
            <Ionicons accessible={false} color={activeTab === id ? SKY_TEXT : INACTIVE_TEXT} name={activeTab === id ? activeIcon : icon} size={24} />
            <Text style={[styles.tabLabel, activeTab === id && styles.tabActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <PatoisLessonModal
        courseId={storageCourseId}
        heartsPresentation={heartsPresentation}
        key={`${storageKey}:${activeTopic?.id || 'closed'}`}
        onAdvance={setActiveTopic}
        onAwardCorrectAnswerXp={awardCorrectAnswerXp}
        onClose={() => setActiveTopic(null)}
        onCloseOutOfHearts={game.closeOutOfHearts}
        onComplete={completeTopic}
        onMistake={recordLessonMistake}
        onRefillHearts={game.refillHearts}
        onWrongAnswer={game.loseHeart}
        previewCourseId={previewCourseId}
        showOutOfHearts={game.showOutOfHearts}
        soundEffectsEnabled={soundPreference.enabled}
        timeUntilNextHeartMs={game.timeUntilNextHeartMs}
        topic={activeTopic}
        visible={Boolean(activeTopic) && progressReady}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  progressNotice: { backgroundColor: '#FFF1C9', borderColor: '#D7A93E', borderWidth: 1, borderRadius: 18, padding: 14, marginBottom: 12 },
  leagueButton: { backgroundColor: NAVY, borderRadius: 20, minHeight: 54, justifyContent: 'center', alignItems: 'center', padding: 12, marginVertical: 12 },
  leagueButtonText: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 15 },
  root: { backgroundColor: '#FFF9ED', flex: 1 }, content: { flex: 1 }, learnContent: { paddingBottom: 132 },
  brandRow: { alignItems: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 18, paddingTop: 12 },
  courseSwitch: { alignItems: 'center', flexDirection: 'row', gap: 8, minHeight: 52, backgroundColor: '#F4E9D4', borderColor: BORDER, borderRadius: 18, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, marginHorizontal: 18, marginTop: 14 },
  courseSwitchName: { color: NAVY, fontFamily: fonts.extraBold, fontSize: 15, flex: 1 },
  courseSwitchAction: { color: SKY_TEXT, fontFamily: fonts.bold, fontSize: 13 },
  accountButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: '#FFF9ED', borderColor: NAVY, borderWidth: 1.5 },
  brand: { color: NAVY, flex: 1, fontFamily: fonts.display, fontSize: 24, letterSpacing: 0.4, textAlign: 'center', textTransform: 'uppercase' },
  flagBadge: { alignItems: 'center', backgroundColor: '#FFF9ED', borderColor: BORDER, borderRadius: 14, borderWidth: 1, height: 42, justifyContent: 'center', width: 48 }, flag: { fontSize: 28 },
  statPill: { alignItems: 'center', backgroundColor: '#FFF9ED', borderColor: BORDER, borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 4, paddingHorizontal: 10, paddingVertical: 7 }, statText: { color: NAVY, fontFamily: fonts.bold, fontSize: 13 },
  streakCopy: { alignItems: 'center', flexDirection: 'row', gap: 12, justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 8, paddingTop: 20 }, streakTextColumn: { flex: 1 }, streakTitle: { color: NAVY, fontFamily: fonts.display, fontSize: 29, letterSpacing: 0.2, textTransform: 'uppercase' }, streakSubtitle: { color: MUTED, fontFamily: fonts.editorial, fontSize: 16, marginTop: 3 }, streakBadge: { alignItems: 'center', backgroundColor: '#FFF1C9', borderColor: '#D7A93E', borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 4, minWidth: 68, paddingHorizontal: 12, paddingVertical: 9 }, streakCount: { color: '#9A4F13', fontFamily: fonts.display, fontSize: 24 }, progressSummary: { color: MUTED, fontFamily: fonts.regular, fontSize: 12, paddingBottom: 14, paddingHorizontal: 20 },
  hero: { backgroundColor: '#2D7668', height: 236, overflow: 'hidden' }, heroBackground: { bottom: -8, left: -8, opacity: 0.3, position: 'absolute', right: -8, top: -8 }, heroWash: { backgroundColor: 'rgba(45,118,104,0.42)', bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 }, heroSun: { backgroundColor: '#F2B84B', borderRadius: 74, height: 148, position: 'absolute', right: -20, top: -28, width: 148 }, heroRule: { backgroundColor: '#FFF9ED', height: 4, opacity: 0.85, position: 'absolute', right: 28, top: 150, transform: [{ rotate: '-8deg' }], width: 118 }, heroStamp: { borderColor: '#FFF9ED', borderRadius: 999, borderWidth: 1.5, bottom: 24, paddingHorizontal: 13, paddingVertical: 7, position: 'absolute', right: 18, transform: [{ rotate: '-3deg' }] }, heroStampText: { color: '#FFF9ED', fontFamily: fonts.bold, fontSize: 8, letterSpacing: 1.1 }, heroGuide: { bottom: -30, height: 276, left: 2, position: 'absolute', width: 276, zIndex: 3 },
  chapterCard: { backgroundColor: '#FFF9ED', borderTopLeftRadius: 30, borderTopRightRadius: 30, marginTop: -24, paddingTop: 28 },
  chapterHeader: { alignItems: 'center', paddingHorizontal: 20 }, courseKicker: { color: SKY_TEXT, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.4, marginBottom: 7, textTransform: 'uppercase' }, chapterTitle: { color: NAVY, fontFamily: fonts.display, fontSize: 29, lineHeight: 35, textAlign: 'center', textTransform: 'uppercase' }, chapterMeta: { color: MUTED, fontFamily: fonts.semiBold, fontSize: 14, marginTop: 6 },
  pathProgressTrack: { backgroundColor: '#E4EEF4', borderRadius: 999, height: 13, marginTop: 14, overflow: 'hidden', width: '100%' }, pathProgressFill: { backgroundColor: GREEN, borderRadius: 999, height: 13 },
  chapterSummaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 12 }, chapterSummaryPill: { backgroundColor: PALE, borderColor: BORDER, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 }, chapterSummaryText: { color: NAVY, fontFamily: fonts.bold, fontSize: 12 },
  currentFocusCard: { backgroundColor: '#FFFFFF', borderColor: NAVY, borderRadius: 22, borderWidth: 1.5, marginTop: 16, paddingHorizontal: 18, paddingVertical: 18, width: '100%' }, currentFocusEyebrow: { color: SKY_TEXT, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.2 }, currentFocusTitle: { color: NAVY, fontFamily: fonts.display, fontSize: 27, marginTop: 7, textTransform: 'uppercase' }, currentFocusBody: { color: MUTED, fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, marginTop: 6 }, currentFocusFooter: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', marginTop: 14 }, currentFocusMeta: { color: NAVY, flexShrink: 1, fontFamily: fonts.semiBold, fontSize: 12 }, currentFocusCta: { color: SKY_TEXT, flexShrink: 1, fontFamily: fonts.bold, fontSize: 12, textAlign: 'right' }, progressLoading: { color: MUTED, fontFamily: fonts.semiBold, fontSize: 12, marginTop: 10, textAlign: 'center' },
  reviewBanner: { backgroundColor: '#FFF7E8', borderColor: '#FFD38A', borderRadius: 16, borderWidth: 1, marginTop: 14, paddingHorizontal: 14, paddingVertical: 12, width: '100%' }, reviewBannerTitle: { color: NAVY, fontFamily: fonts.extraBold, fontSize: 13, textAlign: 'center' }, reviewBannerBody: { color: '#6E5A22', fontFamily: fonts.medium, fontSize: 12, lineHeight: 17, marginTop: 4, textAlign: 'center' },
  topicGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-evenly', paddingBottom: 24, paddingHorizontal: 16, paddingTop: 22 }, topicWrap: { alignItems: 'center', marginBottom: 28, width: '30%' }, topicCircle: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: BORDER, borderRadius: 24, borderWidth: 2, height: 82, justifyContent: 'center', width: 82 }, topicCircleLoading: { backgroundColor: PALE, borderColor: BORDER }, topicCircleActive: { backgroundColor: '#F2B84B', borderColor: NAVY, borderWidth: 3, transform: [{ rotate: '-3deg' }] }, topicCircleComplete: { backgroundColor: GREEN, borderColor: NAVY }, topicCircleLocked: { backgroundColor: '#E9E3D8', borderColor: '#D3CCC0' }, topicIcon: { color: NAVY, fontFamily: fonts.display, fontSize: 28 }, topicLabel: { color: '#4F5B57', fontFamily: fonts.semiBold, fontSize: 12, lineHeight: 17, marginTop: 9, paddingHorizontal: 3, textAlign: 'center' }, topicLabelLoading: { color: MUTED }, topicLabelActive: { color: SKY_TEXT }, topicLabelLocked: { color: '#8D958F' }, topicBadge: { color: SKY_TEXT, fontFamily: fonts.bold, fontSize: 9, letterSpacing: 1, marginTop: 4, textAlign: 'center' },
  tabBar: { backgroundColor: '#FFF9ED', borderTopColor: NAVY, borderTopWidth: 1, flexDirection: 'row', minHeight: 72, paddingBottom: 5 }, tabButton: { alignItems: 'center', flex: 1, justifyContent: 'center', minHeight: 52 }, tabLabel: { color: INACTIVE_TEXT, fontFamily: fonts.semiBold, fontSize: 11, marginTop: 2 }, tabActive: { color: SKY_TEXT },
  leaderboardContent: { padding: 20, paddingBottom: 36 }, pageTitle: { color: NAVY, fontFamily: fonts.display, fontSize: 36, marginTop: 8, textTransform: 'uppercase' }, pageSubtitle: { color: MUTED, fontFamily: fonts.editorial, fontSize: 16, marginBottom: 20, marginTop: 4 }, leaderboardSummaryRow: { flexDirection: 'row', gap: 10, marginBottom: 16 }, leaderboardSummaryPill: { backgroundColor: PALE, borderColor: BORDER, borderRadius: 18, borderWidth: 1, flex: 1, paddingHorizontal: 14, paddingVertical: 12 }, leaderboardSummaryLabel: { color: SKY_TEXT, fontFamily: fonts.bold, fontSize: 9, letterSpacing: 1 }, leaderboardSummaryValue: { color: NAVY, fontFamily: fonts.display, fontSize: 23, marginTop: 4 }, podiumCard: { borderColor: NAVY, borderRadius: 24, borderWidth: 1.5, minHeight: 260, overflow: 'hidden', paddingHorizontal: 14, paddingTop: 18 }, podiumGlow: { backgroundColor: 'rgba(255,255,255,0.42)', borderRadius: 130, height: 130, position: 'absolute', right: -14, top: -28, width: 130 }, podiumSun: { backgroundColor: '#E76F51', borderRadius: 70, height: 140, left: -42, opacity: 0.7, position: 'absolute', top: -52, width: 140 }, podiumStage: { alignItems: 'flex-end', flex: 1, flexDirection: 'row', justifyContent: 'space-between' }, podiumColumn: { alignItems: 'center', width: '31%' }, podiumGuide: { aspectRatio: 1, marginBottom: -4, maxWidth: 96, width: '100%', zIndex: 3 }, podiumRank: { backgroundColor: '#FFF9ED', borderColor: NAVY, borderRadius: 12, borderWidth: 1, color: NAVY, fontFamily: fonts.display, fontSize: 18, marginBottom: 8, paddingHorizontal: 9, paddingVertical: 4, zIndex: 4 }, podiumCopy: { alignItems: 'center', marginBottom: 10, width: '100%' }, podiumName: { color: NAVY, fontFamily: fonts.bold, marginTop: 3, maxWidth: '100%' }, podiumXp: { color: MUTED, fontFamily: fonts.semiBold, fontSize: 11 }, podiumTier: { backgroundColor: '#FFF9ED', borderColor: NAVY, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, width: '100%' }, podiumTierFirst: { height: 108 }, podiumTierSecond: { height: 76 }, podiumTierThird: { height: 60 }, rankCard: { backgroundColor: '#FFF9ED', borderColor: BORDER, borderRadius: 22, borderWidth: 1, marginTop: 18, padding: 18 }, rankCardTitle: { color: NAVY, fontFamily: fonts.display, fontSize: 25, textTransform: 'uppercase' }, rankCardBody: { color: MUTED, fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, marginTop: 4 }, rankList: { gap: 9, marginTop: 18 }, rankRow: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: BORDER, borderRadius: 16, borderWidth: 1, flexDirection: 'row', padding: 11 }, rankRowYou: { backgroundColor: PALE, borderColor: SKY, borderWidth: 2 }, rankNumber: { color: MUTED, fontFamily: fonts.bold, textAlign: 'center', width: 28 }, rankAvatar: { height: 42, marginHorizontal: 8, width: 42 }, rankName: { color: NAVY, flex: 1, fontFamily: fonts.bold }, rankXp: { color: MUTED, fontFamily: fonts.bold },
});
