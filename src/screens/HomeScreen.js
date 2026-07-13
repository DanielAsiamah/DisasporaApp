import { LinearGradient } from 'expo-linear-gradient';
import { useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState, useEffect, useRef } from 'react';
import Animated, { BounceIn, FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import {
  AppState,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  Vibration,
  View,
} from 'react-native';

import HeartsBar from '../components/HeartsBar';
import OutOfHeartsModal from '../components/OutOfHeartsModal';
import PrimaryButton from '../components/PrimaryButton';
import RegionalGuide from '../components/RegionalGuide';
import LessonCutscene from '../components/lesson/LessonCutscene';
import LessonStepRenderer from '../components/lesson/LessonStepRenderer';
import TeachingSlide from '../components/lesson/TeachingSlide';
import VocabularyCard from '../components/lesson/VocabularyCard';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import { getCourseById, loadCourseById } from '../data/curriculumRepository';
import { getLessonAudioSource, getLessonAudioSourceByText } from '../data/generatedAudioRegistry';
import { getVocabImageSource } from '../data/generatedImageRegistry';
import {
  cancelDailyReminder,
  formatReminderTime,
  scheduleDailyReminder,
} from '../services/reminderService';
import {
  createLessonSteps,
  createMistakeStep,
  getCorrectCutsceneStep,
  getPracticeSteps,
  normaliseStepAnswer,
  shouldShowCutsceneAfterStep,
} from '../lessonEngine/buildLessonSteps';
import {
  buildAdaptiveReviewLesson,
  calculateReviewResult,
  getMistakeKey,
  resolveReviewedMistakes,
} from '../lessonEngine/adaptiveReview';
import { getDailyGoalSnapshot, recordDailyGoalSession } from '../lessonEngine/dailyGoal';
import { calculateStreakAfterCompletion } from '../lessonEngine/streaks';
import { colors, fonts, radius, shadows, spacing, type, ui } from '../theme';

const getMarginLeft = (index) => {
  const cycle = index % 8;
  if (cycle === 0) return 0;
  if (cycle === 1) return 44;
  if (cycle === 2) return 76;
  if (cycle === 3) return 44;
  if (cycle === 4) return 0;
  if (cycle === 5) return -44;
  if (cycle === 6) return -76;
  return -44;
};

const guideRegionForCourse = (courseId) => {
  if (['patois', 'haitian'].includes(courseId)) return 'caribbean';
  if (['belizean', 'aave'].includes(courseId)) return 'americas';
  return 'africa';
};

const isNodeCompleted = (node, completedIds = []) => (
  completedIds.includes(node?.id)
  || (
    node?.legacyLessonIds?.length > 0
    && node.legacyLessonIds.every((id) => completedIds.includes(id))
  )
);

const shuffle = (items) => [...items].sort(() => Math.random() - 0.5);

function normaliseAnswer(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9' ]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordsFromAnswer(answer) {
  return answer
    .replace(/[?!.,/]/g, '')
    .split(/\s+/)
    .filter(Boolean);
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function choiceSet(answer, alternatives) {
  return shuffle(uniqueValues([answer, ...alternatives]).slice(0, 3));
}

function wordBank(answer, alternatives) {
  const answerWords = wordsFromAnswer(answer);
  const answerKeys = answerWords.map((word) => word.toLowerCase());
  const extras = alternatives
    .flatMap(wordsFromAnswer)
    .filter((word) => !answerKeys.includes(word.toLowerCase()));
  return shuffle([...answerWords, ...uniqueValues(extras).slice(0, Math.max(2, 7 - answerWords.length))]);
}

function createTeachingItems(lesson, phrasePool = []) {
  if (!lesson) return [];

  const usablePool = phrasePool.filter((item) => item.type !== 'chest' && item.phrase && item.meaning);
  const sourcePool = usablePool.length ? usablePool : [lesson];
  const startIndex = Math.max(0, sourcePool.findIndex((item) => item.id === lesson.id));

  return [0, 1, 2]
    .map((offset) => sourcePool[(startIndex + offset) % sourcePool.length])
    .filter(Boolean);
}

const languageCultureFacts = {
  patois: [
    'Jamaican Patois grew from contact between English and West African languages, then kept changing through everyday Jamaican life.',
    'Jamaica has given the world reggae, dancehall, sprinting legends, bold food culture and everyday phrases people recognise far beyond the island.',
    'In casual Jamaican speech, greetings can carry warmth, respect and relationship. Tone matters as much as the words.',
  ],
  swahili: [
    'Swahili is spoken across East Africa and carries influences from African languages, Arabic and Indian Ocean trade.',
    'A greeting can be more than hello in Swahili. It often opens a polite social exchange.',
  ],
  igbo: [
    'Igbo is a major language of southeastern Nigeria, with many dialects and strong oral storytelling traditions.',
    'In Igbo culture, greetings can show respect, age awareness and community connection.',
  ],
  wolof: [
    'Wolof is widely spoken in Senegal and The Gambia, and greetings are an important part of everyday politeness.',
    'A Wolof greeting can turn into a short conversation because checking on people matters.',
  ],
  haitian: [
    'Haitian Creole is a full language with French influence and deep African language roots.',
    'Haitian Creole carries history, identity and everyday creativity in the way people speak.',
  ],
  belizean: [
    'Belizean Creole reflects Belize history, Caribbean culture and contact between many communities.',
    'Belize is multilingual, so many speakers move naturally between Creole, English and other languages.',
  ],
  aave: [
    'AAVE has its own grammar, sound patterns and history. It is not broken English.',
    'AAVE has shaped music, comedy, internet language and global pop culture in powerful ways.',
  ],
};

function pronunciationFromNote(note) {
  if (!note) return '';
  return note.replace(/^Pronounced:\s*/i, '').trim();
}

function getCultureFact(languageId, index) {
  const facts = languageCultureFacts[languageId] || [
    'Every language carries culture, history and identity. Learning the phrase also means learning the people behind it.',
  ];
  return facts[index % facts.length];
}

function createLessonCutscene(lesson, phrasePool = [], languageId, completedStep) {
  const teachingItems = createTeachingItems(lesson, phrasePool);
  const item = teachingItems[completedStep % Math.max(teachingItems.length, 1)] || lesson;

  if (completedStep === 0) {
    return {
      variant: 'fact',
      title: 'Did you know?',
      body: getCultureFact(languageId, completedStep),
    };
  }

  if (completedStep === 1 && item) {
    return {
      variant: 'vocab',
      eyebrow: 'Phrase check',
      phrase: item.phrase,
      pronunciation: pronunciationFromNote(item.note) || 'Listen and repeat',
      body: `${item.phrase} means "${item.meaning}". Try saying it once before the next challenge.`,
      audioKey: item.audioKey,
    };
  }

  if (completedStep === 3) {
    return {
      variant: 'coach',
      eyebrow: 'Tutor tip',
      title: 'You are building real recall.',
      body: 'First you recognise the phrase. Then you build it yourself. That is how it starts to stick.',
    };
  }

  return {
    variant: 'fact',
    title: 'Culture note',
    body: getCultureFact(languageId, completedStep),
  };
}

function createMistakeCutscene(exercise, selectedAnswerValue) {
  if (exercise?.type === 'build') {
    return {
      variant: 'coach',
      eyebrow: 'Mistake clinic',
      title: 'Let us rebuild it together.',
      body: `Your answer was "${selectedAnswerValue}". The stronger answer is "${exercise.answer}". Word order matters here, so try reading it once before moving on.`,
    };
  }

  if (exercise?.id === 'listen-choice') {
    return {
      variant: 'fact',
      title: 'Listening tip',
      body: `If you cannot listen right now, use the small arrow under the speaker to reveal the phrase. The correct answer is "${exercise.answer}".`,
    };
  }

  return {
    variant: 'coach',
    eyebrow: 'Tutor correction',
    title: 'Good miss. Now you know.',
    body: `You chose "${selectedAnswerValue}". The correct answer is "${exercise.answer}". Mistakes help your brain notice the difference next time.`,
  };
}

function createLessonExercises(lesson, phrasePool = []) {
  if (!lesson) return [];

  const usablePool = phrasePool.filter((item) => item.type !== 'chest' && item.phrase && item.meaning);
  const sourcePool = usablePool.length ? usablePool : [lesson];
  const startIndex = Math.max(0, sourcePool.findIndex((item) => item.id === lesson.id));
  const pick = (offset) => sourcePool[(startIndex + offset) % sourcePool.length];
  const meanings = sourcePool.map((item) => item.meaning);
  const phrases = sourcePool.map((item) => item.phrase);
  const first = pick(0);
  const second = pick(1);
  const third = pick(2);
  const fourth = pick(3);

  return [
    {
      id: 'meaning-choice',
      type: 'choice',
      title: 'Choose the correct meaning',
      prompt: first.phrase,
      answer: first.meaning,
      choices: choiceSet(first.meaning, meanings.filter((value) => value !== first.meaning)),
      audioKey: first.audioKey,
      note: first.note,
    },
    {
      id: 'reverse-choice',
      type: 'choice',
      title: `How do you say “${second.meaning}”?`,
      prompt: second.meaning,
      answer: second.phrase,
      choices: choiceSet(second.phrase, phrases.filter((value) => value !== second.phrase)),
      note: second.note,
    },
    {
      id: 'listen-choice',
      type: 'choice',
      title: 'Listen and choose the meaning',
      prompt: 'Tap the speaker to hear the phrase',
      answer: third.meaning,
      choices: choiceSet(third.meaning, meanings.filter((value) => value !== third.meaning)),
      audioKey: third.audioKey,
      audioLabel: 'Play the phrase',
      note: third.note,
    },
    {
      id: 'build-meaning',
      type: 'build',
      title: 'Build the English meaning',
      prompt: fourth.phrase,
      answer: fourth.meaning,
      wordBank: wordBank(fourth.meaning, meanings),
      audioKey: fourth.audioKey,
      note: fourth.note,
    },
    {
      id: 'build-phrase',
      type: 'build',
      title: 'Build the Patois phrase',
      prompt: first.meaning,
      answer: first.phrase,
      wordBank: wordBank(first.phrase, phrases),
      note: first.note,
    },
    {
      id: 'final-challenge',
      type: 'choice',
      title: 'Final challenge',
      prompt: second.phrase,
      answer: second.meaning,
      choices: choiceSet(second.meaning, meanings.filter((value) => value !== second.meaning)),
      audioKey: second.audioKey,
      note: second.note,
    },
  ];
}

function PathNode({ node, index, isCompleted, isActive, isLocked, themeColor, accentColor, onPress }) {
  const isChest = node.type === 'chest';
  const isTrophy = node.type === 'trophy';
  const marginLeft = getMarginLeft(index);

  return (
    <View style={[styles.nodeRow, { transform: [{ translateX: marginLeft }] }]}>
      {index > 0 ? <View style={styles.pathLine} /> : null}
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.nodeCircle,
          isCompleted && [styles.nodeCompleted, { backgroundColor: themeColor, borderColor: themeColor }],
          isActive && [styles.nodeActive, { borderColor: accentColor }],
          isLocked && styles.nodeLocked,
          isChest && styles.nodeChest,
          isTrophy && styles.nodeTrophy,
          pressed && !isLocked && { transform: [{ scale: 0.95 }] },
        ]}
      >
        {isChest ? (
          <Text style={styles.nodeEmoji}>🎁</Text>
        ) : isTrophy ? (
          <Text style={styles.nodeEmoji}>🏆</Text>
        ) : (
          <Text style={[styles.nodeText, isCompleted && styles.nodeTextCompleted]}>
            {isCompleted ? '✓' : index + 1}
          </Text>
        )}
      </Pressable>
      {isActive ? <View style={[styles.activeRing, { borderColor: accentColor }]} /> : null}
    </View>
  );
}

function PathGuide({ region, wearHat = false }) {
  return (
    <Animated.View entering={FadeInDown.delay(220).springify()} style={styles.pathGuide}>
      <View style={styles.pathGuideBubble}>
        <Text style={styles.pathGuideBubbleEyebrow}>YOUR GUIDE</Text>
        <Text style={styles.pathGuideBubbleText}>Your next lesson is ready.</Text>
      </View>
      <RegionalGuide region={region} size="medium" showLabel wearHat={wearHat} />
    </Animated.View>
  );
}

function LessonPlayer({
  lesson,
  phrasePool,
  courseId,
  guideRegion,
  hearts,
  maxHearts,
  currentStreak,
  lastLessonCompletedAt,
  hasStreakFreeze,
  soundEffectsEnabled,
  wearHat,
  hasNextLesson,
  onExit,
  onMistake,
  onComplete,
  onSessionStart,
  onAnswer,
}) {
  const lessonSteps = useMemo(() => {
    if (Array.isArray(lesson?.steps) && lesson.steps.length > 0) {
      return lesson.steps;
    }

    return createLessonSteps(lesson, phrasePool, courseId);
  }, [lesson, phrasePool, courseId]);
  const practiceSteps = useMemo(() => getPracticeSteps(lessonSteps), [lessonSteps]);
  const introStep = lessonSteps.find((item) => item.id === 'lesson-intro');
  const sessionStartedAtRef = useRef(Date.now());
  const correctSound = useAudioPlayer(require('../../assets/sounds/correct.mp3'));
  const wrongSound = useAudioPlayer(require('../../assets/sounds/wrong.mp3'));
  const [lessonStage, setLessonStage] = useState('teaching');
  const [step, setStep] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [builtWords, setBuiltWords] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [activeCutscene, setActiveCutscene] = useState(null);
  const [audioHelperText, setAudioHelperText] = useState(null);
  const [sessionComplete, setSessionComplete] = useState(false);
  const advanceTimerRef = useRef(null);
  const lastSoundAtRef = useRef(0);
  const sessionIdRef = useRef(null);

  const exercise = practiceSteps[step];
  const lessonAudioSource = getLessonAudioSource(courseId, exercise?.audioKey);
  const lessonProgressUnits = practiceSteps.length + 1;
  const reviewItems = introStep?.items || [];
  const correctAttemptCount = attempts.filter((attempt) => attempt.correct).length;
  const mistakeAttemptCount = attempts.filter((attempt) => !attempt.correct).length;
  const adaptiveResult = lesson.type === 'review'
    ? calculateReviewResult({ totalQuestions: practiceSteps.length, correctCount: correctAttemptCount })
    : null;
  const displayedRewardXp = adaptiveResult?.xpEarned ?? lesson.xp ?? 10;
  const completionLabel = lesson.type === 'review'
    ? adaptiveResult?.mastered ? 'REVIEW MASTERED' : 'REVIEW COMPLETE'
    : mistakeAttemptCount === 0 ? 'PERFECT LESSON' : 'LESSON COMPLETE';
  const projectedStreak = calculateStreakAfterCompletion(
    currentStreak,
    lastLessonCompletedAt,
    Date.now(),
    { hasStreakFreeze }
  ).streak;
  const progress = sessionComplete ? 1 : lessonStage === 'review'
    ? 0.95
    : lessonStage === 'teaching'
    ? 1 / lessonProgressUnits
    : lessonStage === 'cutscene'
      ? (step + 2) / lessonProgressUnits
    : (step + 1 + (feedback?.correct ? 1 : 0)) / lessonProgressUnits;

  useEffect(() => () => {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function startSession() {
      const sessionId = await onSessionStart?.({
        languageId: courseId,
        lessonId: lesson.id,
        lessonTitle: lesson.title || lesson.meaning || null,
        unitId: lesson.unitId || null,
        unitTitle: lesson.unitTitle || null,
        startedAtMs: sessionStartedAtRef.current,
        totalQuestions: practiceSteps.length,
      });

      if (!cancelled) {
        sessionIdRef.current = sessionId || null;
      }
    }

    startSession();

    return () => {
      cancelled = true;
    };
  }, [courseId, lesson.id, lesson.meaning, lesson.title, lesson.unitId, lesson.unitTitle, onSessionStart, practiceSteps.length]);

  function selectedAnswer() {
    if (exercise?.type === 'match_pairs') return selectedChoice;
    if (exercise?.choices) return selectedChoice;
    return builtWords.join(' ');
  }

  function canCheck() {
    if (exercise?.type === 'match_pairs') return selectedChoice === '__matched__';
    return exercise?.choices ? Boolean(selectedChoice) : builtWords.length > 0;
  }

  function playFeedbackSound(soundPlayer) {
    if (!soundEffectsEnabled) return;
    const now = Date.now();
    if (now - lastSoundAtRef.current < 500) {
      return;
    }
    lastSoundAtRef.current = now;

    try {
      const seekResult = soundPlayer.seekTo(0);
      if (seekResult?.then) {
        seekResult.then(() => soundPlayer.play()).catch(() => {});
        return;
      }
      soundPlayer.play();
    } catch {
      // Feedback sound should never interrupt the lesson flow.
    }
  }

  function checkAnswer() {
    const answer = selectedAnswer();
    const correct = normaliseStepAnswer(answer) === normaliseStepAnswer(exercise.answer);
    const attempt = {
      stepIndex: step,
      stepId: exercise.id,
      type: exercise.type,
      prompt: exercise.prompt,
      answer,
      correctAnswer: exercise.answer,
      correct,
      answeredAt: Date.now(),
      timeTakenMs: Date.now() - sessionStartedAtRef.current,
      xp: correct ? exercise.xp || 5 : 0,
    };
    setAttempts((current) => [...current, attempt]);
    onAnswer?.(sessionIdRef.current, attempt)?.catch(() => {});
    playFeedbackSound(correct ? correctSound : wrongSound);
    Haptics.notificationAsync(
      correct
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Error
    ).catch(() => Vibration.vibrate(correct ? 35 : [0, 80, 70, 120]));
    if (!correct) {
      onMistake({
        lessonId: lesson.id,
        stepId: exercise.id,
        prompt: exercise.prompt,
        answer,
        correctAnswer: exercise.answer,
        occurredAt: Date.now(),
      });
    }
    setFeedback({ correct, answer });
    if (correct) {
      advanceTimerRef.current = setTimeout(showCutsceneOrAdvance, 650);
    }
  }

  function createSessionSummary() {
    const completedAt = Date.now();
    const correctCount = attempts.filter((attempt) => attempt.correct).length;
    const teachingItems = (introStep?.items || []).map((item) => ({
      id: item.id || null,
      phrase: item.phrase || null,
      meaning: item.meaning || null,
      audioKey: item.audioKey || null,
    }));

    return {
      languageId: courseId,
      lessonId: lesson.id,
      lessonTitle: lesson.title || lesson.meaning || null,
      unitId: lesson.unitId || null,
      unitTitle: lesson.unitTitle || null,
      startedAt: sessionStartedAtRef.current,
      completedAt,
      durationMs: completedAt - sessionStartedAtRef.current,
      totalQuestions: practiceSteps.length,
      correctCount,
      mistakeCount: Math.max(attempts.length - correctCount, 0),
      attempts,
      teachingItems,
    };
  }

  function advanceLessonStep() {
    if (step === practiceSteps.length - 1) {
      setLessonStage('review');
      setFeedback(null);
      return;
    }
    setStep((current) => current + 1);
    setSelectedChoice(null);
    setBuiltWords([]);
    setFeedback(null);
    setAudioHelperText(null);
  }

  function showMistakeCutsceneOrAdvance() {
    setActiveCutscene(exercise?.wrongFeedback || createMistakeStep(exercise, feedback?.answer || selectedAnswer()));
    setFeedback(null);
    setLessonStage('cutscene');
  }

  function showCutsceneOrAdvance() {
    if (exercise?.correctCutscene) {
      setActiveCutscene(exercise.correctCutscene);
      setFeedback(null);
      setLessonStage('cutscene');
      return;
    }

    if (shouldShowCutsceneAfterStep(step, practiceSteps)) {
      setActiveCutscene(getCorrectCutsceneStep(lesson, phrasePool, courseId, step));
      setFeedback(null);
      setLessonStage('cutscene');
      return;
    }
    advanceLessonStep();
  }

  function continueFromCutscene() {
    setLessonStage('practice');
    setActiveCutscene(null);
    setAudioHelperText(null);
    advanceLessonStep();
  }

  function claimReward() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setSessionComplete(true);
  }

  if (lessonStage === 'teaching') {
    return (
      <SafeAreaView style={styles.lessonSafeArea}>
        <StatusBar style="light" />
        <TeachingSlide
          languageId={courseId}
          topic={introStep?.topic || lesson?.title || lesson?.meaning}
          items={introStep?.items || []}
          progress={progress}
          onExit={onExit}
          onContinue={() => setLessonStage('practice')}
          getAudioSource={(item) => getLessonAudioSource(courseId, item?.audioKey)}
          getNarrationSource={(text) => getLessonAudioSourceByText(courseId, text)}
          getImageSource={(item) => getVocabImageSource(item?.imageKey, item?.category)}
          characterState="neutral"
        />
      </SafeAreaView>
    );
  }

  if (lessonStage === 'cutscene') {
    return (
      <SafeAreaView style={styles.lessonSafeArea}>
        <StatusBar style="light" />
        <LessonCutscene
          languageId={courseId}
          cutscene={activeCutscene}
          progress={progress}
          onExit={onExit}
          onContinue={continueFromCutscene}
          audioSource={getLessonAudioSource(courseId, activeCutscene?.audioKey)}
          narrationSource={getLessonAudioSourceByText(courseId, activeCutscene?.body)}
          characterState={activeCutscene?.type === 'wrong_answer_feedback' ? 'sad' : 'happy'}
        />
      </SafeAreaView>
    );
  }

  if (lessonStage === 'review' && !sessionComplete) {
    return (
      <SafeAreaView style={styles.lessonSafeArea}>
        <StatusBar style="light" />
        <View style={styles.lessonTopBar}>
          <Pressable
            accessibilityLabel="Exit lesson"
            accessibilityRole="button"
            hitSlop={12}
            onPress={onExit}
            style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
          >
            <Text style={styles.closeButtonText}>Ã—</Text>
          </Pressable>
          <View style={styles.lessonProgressTrack}>
            <View style={[styles.lessonProgressFill, { width: `${Math.max(progress * 100, 12)}%` }]} />
          </View>
          <HeartsBar hearts={hearts} maxHearts={maxHearts} />
        </View>

        <ScrollView contentContainerStyle={styles.lessonReviewScreen}>
          <Text style={styles.lessonReviewEyebrow}>QUICK REVIEW</Text>
          <Text style={styles.lessonReviewTitle}>Lock these phrases in.</Text>
          <Text style={styles.lessonReviewBody}>
            Read them once, replay the audio if you want, then claim your reward.
          </Text>

          <View style={styles.lessonReviewList}>
            {reviewItems.map((item, index) => (
              <VocabularyCard
                key={`${item.id || item.phrase}-${index}`}
                item={item}
                index={index}
                audioSource={getLessonAudioSource(courseId, item?.audioKey)}
                imageSource={getVocabImageSource(item?.imageKey, item?.category)}
              />
            ))}
          </View>
        </ScrollView>

        <View style={styles.lessonFooter}>
          <PrimaryButton
            label="CLAIM REWARD"
            onPress={claimReward}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (sessionComplete) {
    return (
      <SafeAreaView style={styles.lessonSafeArea}>
        <StatusBar style="light" />
        <Animated.View entering={FadeIn.duration(260)} style={styles.lessonCompleteScreen}>
          <View pointerEvents="none" style={styles.confettiLayer}>
            {[
              ['★', '12%', 24, colors.accent],
              ['●', '80%', 48, colors.primary],
              ['◆', '22%', 112, colors.blue],
              ['★', '72%', 142, colors.coral],
              ['●', '8%', 206, colors.primary],
              ['◆', '88%', 230, colors.accent],
            ].map(([symbol, left, top, color], index) => (
              <Animated.Text
                entering={ZoomIn.delay(80 + index * 65).springify()}
                key={`${symbol}-${left}`}
                style={[styles.confettiPiece, { color, left, top, transform: [{ rotate: `${index * 23}deg` }] }]}
              >
                {symbol}
              </Animated.Text>
            ))}
          </View>

          <Animated.View entering={BounceIn.delay(100)} style={styles.lessonCompleteGuide}>
            <RegionalGuide region={guideRegion} size="medium" wearHat={wearHat} />
            <View style={styles.lessonCompleteCheck}>
              <Text style={styles.lessonCompleteCheckText}>✓</Text>
            </View>
          </Animated.View>
          <Animated.Text entering={FadeInDown.delay(220).duration(300)} style={styles.lessonCompleteEyebrow}>
            {completionLabel}
          </Animated.Text>
          <Animated.Text entering={FadeInDown.delay(290).duration(320)} style={styles.lessonCompleteTitle}>
            {lesson.type === 'review' ? 'Your weak spots are stronger.' : 'You earned this one.'}
          </Animated.Text>
          <Animated.Text entering={FadeInDown.delay(350).duration(320)} style={styles.lessonCompleteBody}>
            {lesson.type === 'review'
              ? adaptiveResult?.mastered
                ? 'Review mastered. These phrases are leaving your practice queue.'
                : 'Good practice. These phrases will return so they can become automatic.'
              : attempts.some((attempt) => !attempt.correct)
              ? 'You finished the lesson and turned mistakes into progress. That is real learning.'
              : 'Clean run. Keep the rhythm going while the phrases are fresh.'}
          </Animated.Text>
          <Animated.View entering={FadeInDown.delay(430).springify()} style={styles.lessonCompleteReward}>
            <Text style={styles.lessonCompleteRewardValue}>+{displayedRewardXp} XP</Text>
            <Text style={styles.lessonCompleteRewardLabel}>
              {lesson.type === 'review' ? 'Mastery reward' : 'Lesson reward'}
            </Text>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(520).duration(300)} style={styles.lessonCompleteStats}>
            <Text style={styles.lessonCompleteStat}>
              {correctAttemptCount}/{practiceSteps.length} correct
            </Text>
            <Text style={styles.lessonCompleteStat}>
              {lesson.type === 'review'
                ? `${Math.round((adaptiveResult?.accuracy || 0) * 100)}% mastery`
                : `${Math.max(mistakeAttemptCount, 0)} mistakes saved`}
            </Text>
            <Text style={styles.lessonCompleteStat}>🔥 {Math.max(projectedStreak, 1)} day streak</Text>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(600).duration(300)}>
            <PrimaryButton
              label={hasNextLesson ? 'CONTINUE TO NEXT LESSON' : 'BACK TO THE PATH'}
              onPress={() => {
                onComplete({
                  ...createSessionSummary(),
                  sessionId: sessionIdRef.current,
                });
              }}
            />
          </Animated.View>
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.lessonSafeArea}>
      <StatusBar style="light" />
      <View style={styles.lessonTopBar}>
        <Pressable
          accessibilityLabel="Exit lesson"
          accessibilityRole="button"
          hitSlop={12}
          onPress={onExit}
          style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
        >
          <Text style={styles.closeButtonText}>×</Text>
        </Pressable>
        <View style={styles.lessonProgressTrack}>
          <View style={[styles.lessonProgressFill, { width: `${Math.max(progress * 100, 12)}%` }]} />
        </View>
        <HeartsBar hearts={hearts} maxHearts={maxHearts} />
      </View>

      <LessonStepRenderer
        step={exercise}
        guideRegion={guideRegion}
        styles={styles}
        selectedChoice={selectedChoice}
        setSelectedChoice={setSelectedChoice}
        builtWords={builtWords}
        setBuiltWords={setBuiltWords}
        feedback={feedback}
        audioHelperText={audioHelperText}
        normaliseAnswer={normaliseStepAnswer}
        lessonAudioSource={lessonAudioSource}
        getAudioForText={(text) => getLessonAudioSourceByText(courseId, text)}
        getImageForKey={(imageKey, category) => getVocabImageSource(imageKey, category)}
        onAudioFallbackPress={(text) => setAudioHelperText((current) => current === text ? null : text)}
      />

      <View
        style={[
          styles.lessonFooter,
          feedback?.correct && styles.correctFooter,
          feedback && !feedback.correct && styles.wrongFooter,
        ]}
      >
        {feedback ? (
          <View style={styles.feedbackCopy}>
            <Text style={[styles.feedbackTitle, !feedback.correct && styles.feedbackTitleWrong]}>
              {feedback.correct ? 'Correct!' : 'Incorrect'}
            </Text>
            <Text style={styles.feedbackBody}>
              {feedback.correct ? '+10 XP — next challenge.' : `Correct answer: ${exercise.answer}`}
            </Text>
            {!feedback.correct && exercise.note ? (
              <Text style={styles.feedbackHint}>{exercise.note}</Text>
            ) : null}
          </View>
        ) : null}
        <PrimaryButton
          label={feedback?.correct ? 'NICE!' : feedback ? 'GOT IT' : 'CHECK'}
          disabled={Boolean(feedback?.correct) || (!feedback && !canCheck())}
          onPress={feedback ? showMistakeCutsceneOrAdvance : checkAnswer}
        />
      </View>
    </SafeAreaView>
  );
}

export default function HomeScreen({ courseId = 'patois', userLanguage, onBack, onSignedOut }) {
  const {
    profile,
    syncProgress,
    isAuthenticated,
    loadLanguageProgress,
    recordLessonSession,
    recordLessonAnswer,
    finishLessonSession,
    syncLanguageProgress,
    signOut,
  } = useAuth();
  const {
    hearts,
    maxHearts,
    hasHearts,
    timeUntilNextHeartMs,
    showOutOfHearts,
    loseHeart,
    refillHearts,
    closeOutOfHearts,
  } = useGame();

  const [activeTab, setActiveTab] = useState('path');
  const [completed, setCompleted] = useState([]);
  const [xp, setXp] = useState(profile?.xp ?? 0);
  const [gems, setGems] = useState(profile?.gems ?? 100);
  const [streak, setStreak] = useState(profile?.streak ?? 0);
  const [selectedNode, setSelectedNode] = useState(null);
  const [activeLesson, setActiveLesson] = useState(null);
  const [purchasedItems, setPurchasedItems] = useState([]);
  const [languageProgress, setLanguageProgress] = useState(null);
  const [isProgressReady, setIsProgressReady] = useState(false);
  const [course, setCourse] = useState(() => getCourseById(courseId));
  const [notice, setNotice] = useState(null);
  const [reminderEnabled, setReminderEnabled] = useState(Boolean(profile?.reminderEnabled));
  const [reminderBusy, setReminderBusy] = useState(false);
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(
    profile?.soundEffectsEnabled !== false
  );
  const [goalClock, setGoalClock] = useState(Date.now());
  const activeGuideRegion = profile?.guideRegion || guideRegionForCourse(courseId);

  function showNotice(title, body, tone = 'info') {
    setNotice({ title, body, tone });
  }

  useEffect(() => {
    if (profile) {
      setXp(profile.xp ?? 0);
      setStreak(profile.streak ?? 0);
      setGems(profile.gems ?? 100);
      setPurchasedItems(profile.purchasedItems || []);
      setReminderEnabled(Boolean(profile.reminderEnabled));
      setSoundEffectsEnabled(profile.soundEffectsEnabled !== false);
    }
  }, [
    profile?.xp,
    profile?.streak,
    profile?.gems,
    profile?.purchasedItems,
    profile?.reminderEnabled,
    profile?.soundEffectsEnabled,
  ]);

  useEffect(() => {
    if (!isAuthenticated || profile?.reminderEnabled == null) return;
    let cancelled = false;

    async function restoreReminderPreference() {
      const result = profile.reminderEnabled
        ? await scheduleDailyReminder({
          time: profile.reminderTime || '19:00',
          preferredName: profile.preferredName || profile.username || '',
          requestPermission: false,
        })
        : await cancelDailyReminder();
      if (!cancelled) setReminderEnabled(Boolean(result.enabled));
    }

    restoreReminderPreference().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, profile?.preferredName, profile?.reminderEnabled, profile?.reminderTime, profile?.username]);

  useEffect(() => {
    const interval = setInterval(() => setGoalClock(Date.now()), 60 * 1000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setGoalClock(Date.now());
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function hydrateProgress() {
      setIsProgressReady(false);

      if (!isAuthenticated) {
        setCompleted([]);
        setLanguageProgress(null);
        setIsProgressReady(true);
        return;
      }

      try {
        const progress = await loadLanguageProgress(courseId);
        if (cancelled) return;

        setLanguageProgress(progress);
        setCompleted(progress?.completedLessons || []);
      } catch {
        if (cancelled) return;

        setLanguageProgress(null);
        setCompleted([]);
      } finally {
        if (!cancelled) {
          setIsProgressReady(true);
        }
      }
    }

    hydrateProgress();

    return () => {
      cancelled = true;
    };
  }, [courseId, isAuthenticated, loadLanguageProgress]);

  useEffect(() => {
    let cancelled = false;
    setCourse(getCourseById(courseId));

    async function hydrateCourse() {
      const loadedCourse = await loadCourseById(courseId);
      if (!cancelled) {
        setCourse(loadedCourse);
      }
    }

    hydrateCourse();

    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const lessons = useMemo(
    () => (course.units || []).flatMap((unit) => unit.lessons || []),
    [course]
  );
  const playableLessons = useMemo(
    () => lessons.filter((lesson) => lesson.type !== 'chest'),
    [lessons]
  );
  const activeLessonPool = useMemo(() => {
    if (!activeLesson) return [];
    if (activeLesson.type === 'review') {
      return course.units.flatMap((unit) => unit.vocabulary || []);
    }
    const unit = course.units.find((item) => item.lessons.some((lesson) => lesson.id === activeLesson.id));
    return unit?.vocabulary?.length
      ? unit.vocabulary
      : unit?.lessons.filter((lesson) => lesson.type !== 'chest') || [];
  }, [activeLesson, course.units]);
  const nextLesson = useMemo(() => {
    if (!activeLesson || activeLesson.type === 'review') return null;
    const currentIndex = playableLessons.findIndex((lesson) => lesson.id === activeLesson.id);
    return currentIndex >= 0 ? playableLessons[currentIndex + 1] || null : null;
  }, [activeLesson, playableLessons]);
  const adaptiveReviewLesson = useMemo(
    () => buildAdaptiveReviewLesson(course, languageProgress?.mistakes || []),
    [course, languageProgress?.mistakes]
  );
  const dailyGoal = useMemo(
    () => getDailyGoalSnapshot(
      languageProgress?.dailyActivity,
      profile?.dailyGoalMinutes || 10,
      goalClock
    ),
    [goalClock, languageProgress?.dailyActivity, profile?.dailyGoalMinutes]
  );

  const activeNodeId = useMemo(() => {
    const next = lessons.find((lesson, index) => {
      const previousComplete = index === 0 || isNodeCompleted(lessons[index - 1], completed);
      return previousComplete && !isNodeCompleted(lesson, completed) && lesson.type !== 'chest';
    });
    return next?.id;
  }, [completed, lessons]);

  function handleNodePress(node, index) {
    if (!isProgressReady) {
      return;
    }

    const isLocked = index > 0 && !isNodeCompleted(lessons[index - 1], completed);
    if (isLocked) {
      showNotice('Lesson locked', 'Finish the previous step first to unlock this lesson.');
      return;
    }

    if (node.type === 'chest') {
      if (isNodeCompleted(node, completed)) {
        showNotice('Already opened', 'You claimed this reward already.');
        return;
      }
      const nextCompleted = [...completed, node.id];
      const nextOpenedChests = [...(languageProgress?.openedChests || []), node.id];
      const nextXp = xp + node.xp;
      const nextGems = gems + 25;

      setGems(nextGems);
      setXp(nextXp);
      setCompleted(nextCompleted);
      setLanguageProgress((current) => current ? {
        ...current,
        completedLessons: nextCompleted,
        openedChests: nextOpenedChests,
      } : current);
      if (isAuthenticated) {
        syncProgress({ xp: nextXp, gems: nextGems });
        syncLanguageProgress(courseId, {
          completedLessons: nextCompleted,
          openedChests: nextOpenedChests,
          currentLesson: activeNodeId,
          lastPlayedAt: Date.now(),
        });
      }
      showNotice('Chest opened', `You earned ${node.xp} XP and 25 gems.`, 'success');
      return;
    }

    setSelectedNode({ ...node, index });
  }

  function startLesson() {
    if (!hasHearts) {
      showNotice('No hearts left', 'Refill hearts from the shop or wait before starting another lesson.', 'warning');
      return;
    }
    setActiveLesson(selectedNode);
    setSelectedNode(null);
  }

  function startAdaptiveReview() {
    if (!adaptiveReviewLesson) return;
    if (!hasHearts) {
      showNotice('No hearts left', 'Refill hearts before starting your personalised review.', 'warning');
      return;
    }

    setActiveLesson({
      ...adaptiveReviewLesson,
      reviewStartedAt: Date.now(),
    });
  }

  async function completeLesson(sessionSummary) {
    if (!activeLesson) {
      return;
    }

    const completionTime = sessionSummary?.completedAt || Date.now();
    const streakResult = calculateStreakAfterCompletion(
      streak,
      languageProgress?.lastLessonCompletedAt,
      completionTime,
      { hasStreakFreeze: purchasedItems.includes('freeze') }
    );
    const nextStreak = streakResult.streak;
    if (streakResult.freezeUsed) {
      const nextPurchasedItems = purchasedItems.filter((item) => item !== 'freeze');
      setPurchasedItems(nextPurchasedItems);
      if (isAuthenticated) syncProgress({ purchasedItems: nextPurchasedItems }).catch(() => {});
    }

    if (activeLesson.type === 'review') {
      const result = calculateReviewResult(sessionSummary);
      const dailyGoalResult = recordDailyGoalSession(
        languageProgress?.dailyActivity,
        { ...sessionSummary, xpEarned: result.xpEarned },
        profile?.dailyGoalMinutes || 10
      );
      const totalGemsEarned = result.gemsEarned + dailyGoalResult.rewardGems;
      const nextXp = xp + result.xpEarned;
      const nextGems = gems + totalGemsEarned;
      const nextMistakes = resolveReviewedMistakes(
        languageProgress?.mistakes || [],
        activeLesson.reviewMistakeIds,
        result.mastered
      );
      const previousReviewStats = languageProgress?.reviewStats || {};
      const reviewStats = {
        sessionsCompleted: (previousReviewStats.sessionsCompleted || 0) + 1,
        phrasesMastered: (previousReviewStats.phrasesMastered || 0)
          + (result.mastered ? activeLesson.items?.length || 0 : 0),
        lastAccuracy: Math.round(result.accuracy * 100),
        lastReviewedAt: Date.now(),
      };

      if (isAuthenticated && sessionSummary?.sessionId) {
        finishLessonSession(sessionSummary.sessionId, {
          ...sessionSummary,
          xpEarned: result.xpEarned,
          gemsEarned: totalGemsEarned,
          wasFirstCompletion: false,
          isAdaptiveReview: true,
          reviewMistakeKeys: activeLesson.reviewMistakeKeys,
          mastered: result.mastered,
          dailyGoalCompleted: dailyGoalResult.justCompleted,
        }).catch(() => {});
      }

      setXp(nextXp);
      setGems(nextGems);
      setStreak(nextStreak);
      setLanguageProgress((current) => current ? {
        ...current,
        mistakes: nextMistakes,
        reviewStats,
        dailyActivity: dailyGoalResult.activity,
        lastLessonCompletedAt: completionTime,
        lastPlayedAt: completionTime,
      } : current);

      if (isAuthenticated) {
        syncProgress({ xp: nextXp, gems: nextGems, streak: nextStreak });
        syncLanguageProgress(courseId, {
          mistakes: nextMistakes,
          reviewStats,
          dailyActivity: dailyGoalResult.activity,
          currentLesson: activeNodeId || null,
          lastLessonCompletedAt: completionTime,
          lastPlayedAt: completionTime,
        });
      }

      setActiveLesson(null);
      showNotice(
        dailyGoalResult.justCompleted
          ? 'Daily goal complete'
          : streakResult.freezeUsed
            ? 'Streak saved'
            : result.mastered
              ? 'Review mastered'
              : 'Good practice',
        dailyGoalResult.justCompleted
          ? `You reached ${dailyGoalResult.goalMinutes} minutes and earned ${dailyGoalResult.rewardGems} bonus gems.`
          : streakResult.freezeUsed
            ? `Your Streak Freeze covered yesterday. You are now on a ${nextStreak}-day streak.`
          : result.mastered
          ? `${activeLesson.items?.length || 0} weak phrases strengthened. +${result.xpEarned} XP.`
          : `You earned ${result.xpEarned} XP. The phrases will stay in review for another pass.`,
        dailyGoalResult.justCompleted || result.mastered ? 'success' : 'info'
      );
      return;
    }

    const wasFirstCompletion = !isNodeCompleted(activeLesson, completed);
    const xpEarned = wasFirstCompletion ? activeLesson.xp : 0;
    const gemsEarned = wasFirstCompletion ? 5 : 0;
    const dailyGoalResult = recordDailyGoalSession(
      languageProgress?.dailyActivity,
      { ...sessionSummary, xpEarned },
      profile?.dailyGoalMinutes || 10
    );
    const totalGemsEarned = gemsEarned + dailyGoalResult.rewardGems;

    if (isAuthenticated && sessionSummary?.sessionId) {
      finishLessonSession(sessionSummary.sessionId, {
        ...sessionSummary,
        xpEarned,
        gemsEarned: totalGemsEarned,
        wasFirstCompletion,
        nextLessonId: nextLesson?.id || null,
        dailyGoalCompleted: dailyGoalResult.justCompleted,
      }).catch(() => {});
    }

    if (wasFirstCompletion) {
      const nextXp = xp + activeLesson.xp;
      const nextGems = gems + totalGemsEarned;
      const nextCompleted = [...completed, activeLesson.id];

      setCompleted(nextCompleted);
      setXp(nextXp);
      setGems(nextGems);
      setStreak(nextStreak);
      setLanguageProgress((current) => current ? {
        ...current,
        completedLessons: nextCompleted,
        currentLesson: nextLesson?.id || activeLesson.id,
        dailyActivity: dailyGoalResult.activity,
        lastLessonCompletedAt: completionTime,
        lastPlayedAt: completionTime,
      } : current);

      if (isAuthenticated) {
        syncProgress({
          xp: nextXp,
          streak: nextStreak,
          gems: nextGems,
          currentCourse: courseId,
          currentLesson: activeLesson.id,
        });
        syncLanguageProgress(courseId, {
          completedLessons: nextCompleted,
          currentLesson: nextLesson?.id || activeLesson.id,
          dailyActivity: dailyGoalResult.activity,
          lastLessonCompletedAt: completionTime,
          lastPlayedAt: completionTime,
        });
      }
    } else {
      const nextGems = gems + dailyGoalResult.rewardGems;
      setGems(nextGems);
      setStreak(nextStreak);
      setLanguageProgress((current) => current ? {
        ...current,
        currentLesson: nextLesson?.id || activeLesson.id,
        dailyActivity: dailyGoalResult.activity,
        lastLessonCompletedAt: completionTime,
        lastPlayedAt: completionTime,
      } : current);
      if (isAuthenticated) {
        syncProgress({ gems: nextGems, streak: nextStreak, currentCourse: courseId, currentLesson: activeLesson.id });
        syncLanguageProgress(courseId, {
          currentLesson: nextLesson?.id || activeLesson.id,
          dailyActivity: dailyGoalResult.activity,
          lastLessonCompletedAt: completionTime,
          lastPlayedAt: completionTime,
        });
      }
    }
    if (dailyGoalResult.justCompleted) {
      showNotice(
        'Daily goal complete',
        `You reached ${dailyGoalResult.goalMinutes} minutes and earned ${dailyGoalResult.rewardGems} bonus gems.`,
        'success'
      );
    } else if (streakResult.freezeUsed) {
      showNotice(
        'Streak saved',
        `Your Streak Freeze covered yesterday. You are now on a ${nextStreak}-day streak.`,
        'success'
      );
    }
    setActiveLesson(nextLesson);
  }

  function handleMistake(mistake) {
    loseHeart();

    const recordedMistake = {
      ...mistake,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      mistakeKey: getMistakeKey(mistake),
    };

    const nextMistakes = [
      ...(languageProgress?.mistakes || []),
      recordedMistake,
    ].slice(-50);

    setLanguageProgress((current) => current ? {
      ...current,
      mistakes: nextMistakes,
      lastPlayedAt: Date.now(),
    } : current);

    if (isAuthenticated) {
      syncLanguageProgress(courseId, {
        mistakes: nextMistakes,
        currentLesson: activeLesson?.id || null,
        lastPlayedAt: Date.now(),
      });
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
      onSignedOut?.();
    } catch {
      showNotice('Could not sign out', 'Check your connection and try again.', 'warning');
    }
  }

  async function toggleDailyReminder() {
    if (reminderBusy) return;
    setReminderBusy(true);

    try {
      if (reminderEnabled) {
        await cancelDailyReminder();
        setReminderEnabled(false);
        if (isAuthenticated) await syncProgress({ reminderEnabled: false });
        showNotice('Reminders paused', 'You can turn your daily practice reminder back on anytime.', 'success');
        return;
      }

      const reminderTime = profile?.reminderTime || '19:00';
      const result = await scheduleDailyReminder({
        time: reminderTime,
        preferredName: profile?.preferredName || profile?.username || '',
        requestPermission: true,
      });
      if (!result.supported) {
        showNotice('Use the mobile app', 'Daily notifications are available on iPhone and Android.', 'info');
        return;
      }
      if (!result.enabled) {
        setReminderEnabled(false);
        if (isAuthenticated) await syncProgress({ reminderEnabled: false });
        showNotice('Notifications are blocked', 'Allow notifications for Diaspora in your device settings, then try again.', 'warning');
        return;
      }

      setReminderEnabled(true);
      if (isAuthenticated) {
        await syncProgress({ reminderEnabled: true, reminderTime: result.time || reminderTime });
      }
      showNotice('Reminder scheduled', `We’ll nudge you every day at ${formatReminderTime(result.time || reminderTime)}.`, 'success');
    } catch {
      showNotice('Could not update reminders', 'Check your device notification settings and try again.', 'warning');
    } finally {
      setReminderBusy(false);
    }
  }

  function buyItem(itemId, cost) {
    if (gems < cost) {
      showNotice('Not enough gems', 'Complete lessons and open chests to earn more.', 'warning');
      return;
    }

    const nextGems = gems - cost;
    const nextPurchasedItems = itemId === 'refill'
      ? purchasedItems
      : [...new Set([...purchasedItems, itemId])];

    setGems(nextGems);
    setPurchasedItems(nextPurchasedItems);
    if (isAuthenticated) {
      syncProgress({
        gems: nextGems,
        purchasedItems: nextPurchasedItems,
      });
    }
    if (itemId === 'refill') {
      refillHearts();
      showNotice('Hearts refilled', 'You are ready for more lessons.', 'success');
    } else {
      showNotice('Purchased', 'This boost is now active.', 'success');
    }
  }

  if (activeLesson) {
    return (
      <LessonPlayer
        key={activeLesson.id}
        lesson={activeLesson}
        phrasePool={activeLessonPool}
        courseId={courseId}
        guideRegion={activeGuideRegion}
        hearts={hearts}
        maxHearts={maxHearts}
        currentStreak={streak}
        lastLessonCompletedAt={languageProgress?.lastLessonCompletedAt}
        hasStreakFreeze={purchasedItems.includes('freeze')}
        soundEffectsEnabled={soundEffectsEnabled}
        wearHat={purchasedItems.includes('hat')}
        hasNextLesson={Boolean(nextLesson)}
        onExit={() => setActiveLesson(null)}
        onMistake={handleMistake}
        onComplete={completeLesson}
        onSessionStart={recordLessonSession}
        onAnswer={recordLessonAnswer}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.topBar}>
        <Pressable onPress={onBack} style={styles.courseSelectButton}>
          <Text style={styles.courseFlag}>D</Text>
          <Text style={styles.courseChevron}>v</Text>
        </Pressable>
        <View style={styles.statsContainer}>
          <View style={styles.statPill}>
            <Text style={styles.statIcon}>S</Text>
            <Text style={styles.statText}>{streak}</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statIcon}>G</Text>
            <Text style={styles.statText}>{gems}</Text>
          </View>
          <HeartsBar hearts={hearts} maxHearts={maxHearts} />
        </View>
      </View>

      <View style={styles.mainContainer}>
        {activeTab === 'path' ? (
          <ScrollView contentContainerStyle={styles.pathContent} showsVerticalScrollIndicator={false}>
            <LinearGradient
              colors={dailyGoal.completed ? ['#123B27', '#172C25'] : ['#2C2118', '#201A17']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.dailyGoalCard, dailyGoal.completed && styles.dailyGoalCardComplete]}
            >
              <View style={styles.dailyGoalHeader}>
                <View style={styles.dailyGoalIconWrap}>
                  <Text style={styles.dailyGoalIcon}>{dailyGoal.completed ? '✓' : '🔥'}</Text>
                </View>
                <View style={styles.dailyGoalCopy}>
                  <Text style={styles.dailyGoalEyebrow}>TODAY’S GOAL</Text>
                  <Text style={styles.dailyGoalTitle}>
                    {dailyGoal.completed ? 'Daily goal complete!' : `${dailyGoal.creditedMinutes} of ${dailyGoal.goalMinutes} minutes`}
                  </Text>
                  <Text style={styles.dailyGoalBody}>
                    {dailyGoal.completed
                      ? `${dailyGoal.activity.lessonsCompleted} ${dailyGoal.activity.lessonsCompleted === 1 ? 'lesson' : 'lessons'} today · reward claimed`
                      : 'Complete lessons or reviews to earn 10 bonus gems.'}
                  </Text>
                </View>
                <Text style={styles.dailyGoalPercent}>{Math.round(dailyGoal.progress * 100)}%</Text>
              </View>
              <View style={styles.dailyGoalTrack}>
                <View style={[styles.dailyGoalFill, { width: `${Math.max(dailyGoal.progress * 100, dailyGoal.progress ? 7 : 0)}%` }]} />
              </View>
            </LinearGradient>
            {adaptiveReviewLesson ? (
              <Pressable
                accessibilityLabel={`Practice ${adaptiveReviewLesson.items.length} weak phrases`}
                accessibilityRole="button"
                onPress={startAdaptiveReview}
                style={({ pressed }) => [styles.reviewCardPressable, pressed && styles.reviewCardPressed]}
              >
                <LinearGradient
                  colors={['#2D1D46', '#172B35']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.reviewCard}
                >
                  <View style={styles.reviewIconWrap}>
                    <Text style={styles.reviewIcon}>🧠</Text>
                  </View>
                  <View style={styles.reviewCopy}>
                    <Text style={styles.reviewEyebrow}>PERSONALISED REVIEW</Text>
                    <Text style={styles.reviewTitle}>Practice your weak phrases</Text>
                    <Text style={styles.reviewBody}>
                      {adaptiveReviewLesson.reviewCount} recent {adaptiveReviewLesson.reviewCount === 1 ? 'mistake' : 'mistakes'} · up to 20 XP
                    </Text>
                  </View>
                  <View style={styles.reviewAction}>
                    <Text style={styles.reviewActionText}>PRACTICE</Text>
                  </View>
                </LinearGradient>
              </Pressable>
            ) : null}
            {course.units.map((unit) => {
              const unitColor = unit.themeColor || course.themeColor;
              const firstGlobalIndex = lessons.findIndex((lesson) => lesson.id === unit.lessons[0]?.id);
              const playableInUnit = unit.lessons.filter((lesson) => lesson.type !== 'chest');
              const completedInUnit = playableInUnit.filter((lesson) => isNodeCompleted(lesson, completed)).length;
              const unitProgress = playableInUnit.length ? completedInUnit / playableInUnit.length : 0;
              const containsActiveLesson = unit.lessons.some((lesson) => lesson.id === activeNodeId);

              return (
                <View key={unit.id} style={styles.unitSection}>
                  <LinearGradient
                    colors={[unitColor, colors.splashWarm]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.unitHeaderCard}
                  >
                    <View style={styles.unitCopy}>
                      <Text style={styles.unitEyebrow}>{unit.title}</Text>
                      <Text style={styles.unitTitle}>{unit.description}</Text>
                      <Text style={styles.unitSubcopy}>{unit.goal}</Text>
                    </View>
                    <View style={styles.unitBook}>
                      <Text style={styles.unitBookIcon}>D</Text>
                    </View>
                  </LinearGradient>

                  <View style={styles.progressCard}>
                    <Text style={styles.progressLabel}>Unit progress</Text>
                    <Text style={styles.progressValue}>{Math.round(unitProgress * 100)}%</Text>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${Math.round(unitProgress * 100)}%`,
                            backgroundColor: unitColor,
                          },
                        ]}
                      />
                    </View>
                  </View>

                  <View style={styles.pathMapContainer}>
                    {unit.lessons.map((node, unitIndex) => {
                      const globalIndex = firstGlobalIndex + unitIndex;
                      const isCompleted = isNodeCompleted(node, completed);
                      const isLocked = globalIndex > 0 && !isNodeCompleted(lessons[globalIndex - 1], completed);
                      const isActive = node.id === activeNodeId && !isLocked && !isCompleted;

                      return (
                        <PathNode
                          key={node.id}
                          node={node}
                          index={unitIndex}
                          isCompleted={isCompleted}
                          isActive={isActive}
                          isLocked={isLocked}
                          themeColor={unitColor}
                          accentColor={course.accentColor}
                          onPress={() => handleNodePress(node, globalIndex)}
                        />
                      );
                    })}
                    {containsActiveLesson ? (
                      <View style={styles.mascotContainer}>
                        <PathGuide
                          region={activeGuideRegion}
                          wearHat={purchasedItems.includes('hat')}
                        />
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        ) : null}

        {activeTab === 'shop' ? (
          <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.tabTitle}>Shop</Text>
            <Text style={styles.tabSubtitle}>Use gems for boosts that keep lessons moving.</Text>
            <ShopItem emoji="❤️" title="Refill Hearts" detail="Restore all 5 hearts instantly." action="150 💎" onPress={() => buyItem('refill', 150)} />
            <ShopItem
              emoji="🔥"
              title="Streak Freeze"
              detail="Automatically protects one missed day, then gets used."
              action={purchasedItems.includes('freeze') ? 'ACTIVE' : '300 💎'}
              disabled={purchasedItems.includes('freeze')}
              onPress={() => buyItem('freeze', 300)}
            />
            <ShopItem
              emoji="🎩"
              title="Mascot Hat"
              detail="Your regional guide wears it on the path and reward screen."
              action={purchasedItems.includes('hat') ? 'OWNED' : '400 💎'}
              disabled={purchasedItems.includes('hat')}
              onPress={() => buyItem('hat', 400)}
            />
          </ScrollView>
        ) : null}

        {activeTab === 'leaderboard' ? (
          <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.tabTitle}>Your progress</Text>
            <Text style={styles.tabSubtitle}>A real snapshot of the work you have put in.</Text>
            {[
              ['⚡', 'Total XP', `${xp} XP`],
              ['🔥', 'Current streak', `${streak} days`],
              ['🎯', 'Today', `${dailyGoal.creditedMinutes}/${dailyGoal.goalMinutes} min`],
              ['✅', 'Lessons complete', `${completed.filter((id) => playableLessons.some((lesson) => lesson.id === id)).length}`],
            ].map(([icon, label, value]) => (
              <View key={label} style={styles.leaderRow}>
                <Text style={styles.leaderRank}>{icon}</Text>
                <Text style={styles.leaderName}>{label}</Text>
                <Text style={styles.leaderXp}>{value}</Text>
              </View>
            ))}
          </ScrollView>
        ) : null}

        {activeTab === 'profile' ? (
          <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
            <View style={styles.profileHeader}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarEmoji}>D</Text>
              </View>
              <Text style={styles.profileName}>{profile?.preferredName || profile?.username || 'Diaspora Scholar'}</Text>
              <Text style={styles.profileNative}>{profile?.email || `Native language: ${userLanguage?.toUpperCase() || 'ENGLISH'}`}</Text>
            </View>
            <View style={styles.statsGrid}>
              <StatCard label="Total XP" value={xp} />
              <StatCard label="Streak" value={`${streak} days`} />
              <StatCard label="Gems" value={gems} />
              <StatCard label="Lessons" value={completed.filter((id) => playableLessons.some((lesson) => lesson.id === id)).length} />
              <StatCard label="Phrases mastered" value={languageProgress?.reviewStats?.phrasesMastered || 0} />
              <StatCard
                label="Last review"
                value={languageProgress?.reviewStats?.lastAccuracy == null
                  ? '—'
                  : `${languageProgress.reviewStats.lastAccuracy}%`}
              />
            </View>
          </ScrollView>
        ) : null}

        {activeTab === 'settings' ? (
          <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.tabTitle}>Settings</Text>
            <Text style={styles.tabSubtitle}>Lesson-focused settings for the learning path.</Text>
            <SettingRow
              label="Sound effects"
              detail={soundEffectsEnabled ? 'Correct-answer feedback is on' : 'Lesson feedback is muted'}
              active={soundEffectsEnabled}
              onPress={() => {
                const next = !soundEffectsEnabled;
                setSoundEffectsEnabled(next);
                if (isAuthenticated) syncProgress({ soundEffectsEnabled: next }).catch(() => {});
              }}
            />
            <SettingRow
              label="Daily reminders"
              detail={reminderBusy
                ? 'Updating notification settings…'
                : reminderEnabled
                  ? `Every day at ${formatReminderTime(profile?.reminderTime || '19:00')}`
                  : 'Off — tap to schedule'}
              active={reminderEnabled}
              disabled={reminderBusy}
              onPress={toggleDailyReminder}
            />
            <SettingRow label="Dark theme" detail="Diaspora night mode" active />
            {isAuthenticated ? (
              <Pressable accessibilityRole="button" onPress={handleSignOut} style={styles.signOutButton}>
                <Text style={styles.signOutText}>SIGN OUT</Text>
              </Pressable>
            ) : null}
          </ScrollView>
        ) : null}
      </View>

      <LessonPreview node={selectedNode} course={course} onClose={() => setSelectedNode(null)} onStart={startLesson} />

      <NoticePanel notice={notice} onDismiss={() => setNotice(null)} />

      <OutOfHeartsModal
        visible={showOutOfHearts}
        onClose={closeOutOfHearts}
        onRefill={refillHearts}
        timeUntilNextHeartMs={timeUntilNextHeartMs}
      />

      <View style={styles.bottomTabBar}>
        <TabButton icon="🏠" label="Path" active={activeTab === 'path'} color={course.themeColor} onPress={() => setActiveTab('path')} />
        <TabButton icon="🛍️" label="Shop" active={activeTab === 'shop'} color={course.themeColor} onPress={() => setActiveTab('shop')} />
        <TabButton icon="📈" label="Progress" active={activeTab === 'leaderboard'} color={course.themeColor} onPress={() => setActiveTab('leaderboard')} />
        <TabButton icon="👤" label="Profile" active={activeTab === 'profile'} color={course.themeColor} onPress={() => setActiveTab('profile')} />
        <TabButton icon="⚙️" label="Settings" active={activeTab === 'settings'} color={course.themeColor} onPress={() => setActiveTab('settings')} />
      </View>
    </SafeAreaView>
  );
}

function LessonPreview({ node, course, onClose, onStart }) {
  return (
    <Modal animationType="slide" transparent visible={Boolean(node)} onRequestClose={onClose}>
      <View style={styles.previewBackdrop}>
        <View style={styles.previewSheet}>
          <Pressable onPress={onClose} style={styles.previewClose}>
            <Text style={styles.previewCloseText}>×</Text>
          </Pressable>
          <Text style={styles.previewTitle}>{node?.phrase}</Text>
          <Text style={styles.previewSubtitle}>{node?.title}</Text>
          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>In this lesson</Text>
            <Text style={styles.previewPhrase}>{node?.phrase}</Text>
            <Text style={styles.previewMeaning}>{node?.meaning}</Text>
            <View style={styles.contextRow}>
              <Text style={styles.contextIcon}>💡</Text>
              <Text style={styles.contextTitle}>Cultural context</Text>
            </View>
            <Text style={styles.previewNote}>{node?.note}</Text>
          </View>
          <PrimaryButton label={`START LESSON (+${node?.xp || 0} XP)`} onPress={onStart} />
        </View>
      </View>
    </Modal>
  );
}

function NoticePanel({ notice, onDismiss }) {
  if (!notice) return null;

  const toneStyle = notice.tone === 'success'
    ? styles.noticeSuccess
    : notice.tone === 'warning'
      ? styles.noticeWarning
      : styles.noticeInfo;

  return (
    <View style={styles.noticeWrap} pointerEvents="box-none">
      <View style={[styles.noticeCard, toneStyle]}>
        <View style={styles.noticeCopy}>
          <Text style={styles.noticeTitle}>{notice.title}</Text>
          <Text style={styles.noticeBody}>{notice.body}</Text>
        </View>
        <Pressable
          accessibilityLabel="Dismiss message"
          accessibilityRole="button"
          onPress={onDismiss}
          style={styles.noticeDismiss}
        >
          <Text style={styles.noticeDismissText}>×</Text>
        </Pressable>
      </View>
    </View>
  );
}

function TabButton({ icon, label, active, color, onPress }) {
  const safeIcons = {
    Path: 'P',
    Shop: 'S',
    Leagues: 'L',
    Profile: 'U',
    Settings: 'C',
  };

  return (
    <Pressable onPress={onPress} style={[styles.tabItem, active && styles.tabItemActive]}>
      <Text style={[styles.tabItemEmoji, active && { backgroundColor: color, borderColor: color }]}>
        {safeIcons[label] || icon}
      </Text>
      <Text style={[styles.tabItemText, active && { color }]}>{label}</Text>
    </Pressable>
  );
}

function ShopItem({ emoji, title, detail, action, disabled, onPress }) {
  const safeIcons = {
    'Refill Hearts': 'H',
    'Streak Freeze': 'S',
    'Mascot Hat': 'M',
  };
  const safeAction = action
    .replace(/150.*/, '150 G')
    .replace(/300.*/, '300 G')
    .replace(/400.*/, '400 G');

  return (
    <View style={styles.shopItem}>
      <Text style={styles.shopEmoji}>{safeIcons[title] || emoji}</Text>
      <View style={styles.shopCopy}>
        <Text style={styles.shopTitle}>{title}</Text>
        <Text style={styles.shopDetail}>{detail}</Text>
      </View>
      <Pressable disabled={disabled} onPress={onPress} style={[styles.buyButton, disabled && styles.buyButtonDisabled]}>
        <Text style={styles.buyButtonText}>{safeAction}</Text>
      </Pressable>
    </View>
  );
}

function StatCard({ label, value }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statCardValue}>{value}</Text>
      <Text style={styles.statCardLabel}>{label}</Text>
    </View>
  );
}

function SettingRow({ label, detail, active, disabled = false, onPress }) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'switch' : undefined}
      accessibilityState={onPress ? { checked: active, disabled } : undefined}
      disabled={!onPress || disabled}
      onPress={onPress}
      style={[styles.settingRow, disabled && styles.settingRowDisabled]}
    >
      <View style={styles.settingCopy}>
        <Text style={styles.settingName}>{label}</Text>
        {detail ? <Text style={styles.settingDetail}>{detail}</Text> : null}
      </View>
      <View style={[styles.switchTrack, active && styles.switchTrackActive]}>
        <View style={[styles.switchKnob, active && styles.switchKnobActive]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.splash,
    flex: 1,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: ui.screenPadding,
    paddingVertical: spacing.sm,
  },
  courseSelectButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    ...shadows.soft,
  },
  courseFlag: {
    color: colors.accent,
    fontFamily: fonts.black,
    fontSize: type.body,
  },
  courseChevron: {
    color: colors.textMuted,
    fontFamily: fonts.bold,
    fontSize: 16,
  },
  statsContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statPill: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statIcon: {
    color: colors.accent,
    fontFamily: fonts.black,
    fontSize: type.caption,
  },
  statText: {
    color: colors.text,
    fontFamily: fonts.black,
    fontSize: type.caption,
  },
  mainContainer: {
    flex: 1,
    paddingBottom: ui.bottomTabHeight,
  },
  pathContent: {
    padding: ui.screenPadding,
    paddingBottom: 140,
  },
  dailyGoalCard: {
    borderColor: '#4A3529',
    borderRadius: radius.xl,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.md,
    ...shadows.card,
  },
  dailyGoalCardComplete: {
    borderColor: colors.primaryDark,
  },
  dailyGoalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dailyGoalIconWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderRadius: radius.lg,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  dailyGoalIcon: {
    color: colors.primary,
    fontFamily: fonts.black,
    fontSize: 23,
  },
  dailyGoalCopy: {
    flex: 1,
  },
  dailyGoalEyebrow: {
    color: colors.accent,
    fontFamily: fonts.extraBold,
    fontSize: 10,
    letterSpacing: 1.1,
  },
  dailyGoalTitle: {
    color: colors.text,
    fontFamily: fonts.black,
    fontSize: 17,
    lineHeight: 22,
    marginTop: 2,
  },
  dailyGoalBody: {
    color: colors.textMuted,
    fontFamily: fonts.medium,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 2,
  },
  dailyGoalPercent: {
    color: colors.text,
    fontFamily: fonts.black,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  dailyGoalTrack: {
    backgroundColor: colors.locked,
    borderRadius: radius.pill,
    height: 9,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  dailyGoalFill: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: '100%',
  },
  reviewCardPressable: {
    marginBottom: spacing.lg,
  },
  reviewCardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  reviewCard: {
    alignItems: 'center',
    borderColor: '#7156A8',
    borderRadius: radius.xl,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 104,
    padding: spacing.md,
    ...shadows.card,
  },
  reviewIconWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: radius.lg,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  reviewIcon: {
    fontSize: 28,
  },
  reviewCopy: {
    flex: 1,
  },
  reviewEyebrow: {
    color: colors.accent,
    fontFamily: fonts.extraBold,
    fontSize: 10,
    letterSpacing: 1.1,
  },
  reviewTitle: {
    color: colors.text,
    fontFamily: fonts.black,
    fontSize: 17,
    lineHeight: 22,
    marginTop: 3,
  },
  reviewBody: {
    color: colors.textMuted,
    fontFamily: fonts.medium,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  reviewAction: {
    backgroundColor: colors.primary,
    borderBottomColor: colors.primaryDark,
    borderBottomWidth: 3,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
  },
  reviewActionText: {
    color: colors.surface,
    fontFamily: fonts.extraBold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  unitSection: {
    marginBottom: spacing.xl,
  },
  unitHeaderCard: {
    ...shadows.card,
    borderRadius: radius.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 118,
    overflow: 'hidden',
    padding: spacing.md,
  },
  unitCopy: {
    flex: 1,
  },
  unitEyebrow: {
    color: 'rgba(255,255,255,0.72)',
    fontFamily: fonts.black,
    fontSize: type.micro,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  unitTitle: {
    color: colors.text,
    fontFamily: fonts.black,
    fontSize: type.title,
    lineHeight: 30,
    marginTop: spacing.xs,
  },
  unitSubcopy: {
    color: 'rgba(255,255,255,0.75)',
    fontFamily: fonts.medium,
    fontSize: type.caption,
    marginTop: spacing.sm,
  },
  unitBook: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: radius.lg,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  unitBookIcon: {
    color: colors.text,
    fontFamily: fonts.black,
    fontSize: type.heading,
  },
  progressCard: {
    ...ui.card,
    marginTop: spacing.sm,
    padding: spacing.sm,
  },
  progressLabel: {
    color: colors.textMuted,
    fontFamily: fonts.bold,
    fontSize: type.caption,
  },
  progressValue: {
    color: colors.text,
    fontFamily: fonts.black,
    fontSize: type.heading,
    marginTop: 2,
  },
  progressTrack: {
    backgroundColor: colors.locked,
    borderRadius: radius.pill,
    height: 12,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    borderRadius: radius.pill,
    height: '100%',
  },
  pathMapContainer: {
    alignItems: 'center',
    minHeight: 520,
    paddingTop: spacing.lg,
  },
  nodeRow: {
    alignItems: 'center',
    height: 94,
    justifyContent: 'center',
    position: 'relative',
    width: 180,
  },
  pathLine: {
    backgroundColor: '#3A2B23',
    borderRadius: radius.pill,
    height: 72,
    position: 'absolute',
    top: -42,
    width: 6,
  },
  nodeCircle: {
    alignItems: 'center',
    backgroundColor: colors.blue,
    borderBottomColor: 'rgba(0,0,0,0.25)',
    borderBottomWidth: 5,
    borderColor: '#167EAD',
    borderRadius: 36,
    borderWidth: 3,
    height: 72,
    justifyContent: 'center',
    width: 72,
    zIndex: 2,
    ...shadows.soft,
  },
  nodeCompleted: {
    borderBottomColor: colors.primaryDark,
  },
  nodeActive: {
    borderWidth: 4,
    transform: [{ scale: 1.05 }],
  },
  nodeLocked: {
    backgroundColor: colors.locked,
    borderColor: colors.border,
    opacity: 0.55,
  },
  nodeChest: {
    backgroundColor: colors.accent,
    borderColor: colors.accentDark,
  },
  nodeTrophy: {
    backgroundColor: colors.purple,
    borderColor: '#9A50D6',
  },
  nodeText: {
    color: colors.splash,
    fontFamily: fonts.black,
    fontSize: type.heading,
  },
  nodeTextCompleted: {
    color: colors.text,
  },
  nodeEmoji: {
    fontSize: 32,
  },
  activeRing: {
    borderRadius: 44,
    borderWidth: 3,
    height: 88,
    position: 'absolute',
    width: 88,
  },
  mascotContainer: {
    position: 'absolute',
    right: -2,
    top: 275,
  },
  pathGuide: {
    alignItems: 'center',
    gap: spacing.sm,
    width: 148,
  },
  pathGuideBubble: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    ...shadows.soft,
  },
  pathGuideBubbleEyebrow: {
    color: colors.accent,
    fontFamily: fonts.extraBold,
    fontSize: 9,
    letterSpacing: 1,
    textAlign: 'center',
  },
  pathGuideBubbleText: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
    textAlign: 'center',
  },
  tabContent: {
    padding: ui.screenPadding,
    paddingBottom: 120,
  },
  tabTitle: {
    color: colors.text,
    fontFamily: fonts.black,
    fontSize: type.display,
  },
  tabSubtitle: {
    color: colors.textMuted,
    fontFamily: fonts.medium,
    fontSize: type.body,
    lineHeight: 20,
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  shopItem: {
    alignItems: 'center',
    ...ui.card,
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    padding: ui.compactCardPadding,
  },
  shopEmoji: {
    color: colors.accent,
    fontFamily: fonts.black,
    fontSize: type.heading,
    textAlign: 'center',
    width: 28,
  },
  shopCopy: {
    flex: 1,
  },
  shopTitle: {
    color: colors.text,
    fontFamily: fonts.black,
    fontSize: type.body,
  },
  shopDetail: {
    color: colors.textMuted,
    fontFamily: fonts.medium,
    fontSize: type.caption,
    marginTop: 2,
  },
  buyButton: {
    backgroundColor: colors.blue,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  buyButtonDisabled: {
    backgroundColor: colors.locked,
  },
  buyButtonText: {
    color: colors.text,
    fontFamily: fonts.black,
    fontSize: type.micro,
  },
  leaderRow: {
    alignItems: 'center',
    ...ui.card,
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    padding: ui.compactCardPadding,
  },
  leaderRowUser: {
    borderColor: colors.primary,
  },
  leaderRank: {
    color: colors.text,
    fontFamily: fonts.black,
    fontSize: type.body,
    width: 28,
  },
  leaderName: {
    color: colors.text,
    flex: 1,
    fontFamily: fonts.black,
    fontSize: type.body,
  },
  leaderXp: {
    color: colors.accent,
    fontFamily: fonts.black,
    fontSize: type.caption,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatarCircle: {
    alignItems: 'center',
    ...ui.elevatedCard,
    borderRadius: 48,
    height: 96,
    justifyContent: 'center',
    width: 96,
  },
  avatarEmoji: {
    color: colors.accent,
    fontFamily: fonts.black,
    fontSize: 42,
  },
  profileName: {
    color: colors.text,
    fontFamily: fonts.black,
    fontSize: type.heading,
    marginTop: spacing.md,
  },
  profileNative: {
    color: colors.textMuted,
    fontFamily: fonts.medium,
    fontSize: type.caption,
    marginTop: spacing.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statCard: {
    ...ui.card,
    padding: ui.compactCardPadding,
    width: '47%',
  },
  statCardValue: {
    color: colors.text,
    fontFamily: fonts.black,
    fontSize: type.heading,
  },
  statCardLabel: {
    color: colors.textMuted,
    fontFamily: fonts.medium,
    fontSize: type.caption,
    marginTop: spacing.xs,
  },
  settingRow: {
    alignItems: 'center',
    ...ui.card,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    padding: ui.compactCardPadding,
  },
  settingRowDisabled: {
    opacity: 0.58,
  },
  settingCopy: {
    flex: 1,
    paddingRight: spacing.md,
  },
  settingName: {
    color: colors.text,
    fontFamily: fonts.black,
    fontSize: type.body,
  },
  settingDetail: {
    color: colors.textMuted,
    fontFamily: fonts.medium,
    fontSize: type.caption,
    lineHeight: 17,
    marginTop: 3,
  },
  signOutButton: {
    alignItems: 'center',
    borderColor: colors.error,
    borderRadius: radius.md,
    borderWidth: 2,
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  signOutText: {
    color: colors.error,
    fontFamily: fonts.extraBold,
    fontSize: 14,
    letterSpacing: 0.8,
  },
  switchTrack: {
    backgroundColor: colors.locked,
    borderRadius: radius.pill,
    height: 30,
    justifyContent: 'center',
    padding: 3,
    width: 54,
  },
  switchTrackActive: {
    backgroundColor: colors.primary,
  },
  switchKnob: {
    backgroundColor: colors.text,
    borderRadius: 12,
    height: 24,
    width: 24,
  },
  switchKnobActive: {
    alignSelf: 'flex-end',
  },
  previewBackdrop: {
    backgroundColor: 'rgba(0,0,0,0.58)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  previewSheet: {
    backgroundColor: colors.surfaceMuted,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  previewClose: {
    alignSelf: 'flex-end',
    padding: spacing.xs,
  },
  previewCloseText: {
    color: colors.textMuted,
    fontFamily: fonts.medium,
    fontSize: 34,
  },
  previewTitle: {
    color: colors.text,
    fontFamily: fonts.black,
    fontSize: 34,
  },
  previewSubtitle: {
    color: colors.textMuted,
    fontFamily: fonts.semiBold,
    fontSize: 17,
    marginTop: spacing.xs,
  },
  previewCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    marginVertical: spacing.lg,
    padding: spacing.lg,
  },
  previewLabel: {
    color: colors.textMuted,
    fontFamily: fonts.black,
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  previewPhrase: {
    color: colors.text,
    fontFamily: fonts.black,
    fontSize: 34,
    marginTop: spacing.sm,
  },
  previewMeaning: {
    color: colors.blue,
    fontFamily: fonts.black,
    fontSize: 21,
    marginTop: spacing.xs,
  },
  contextRow: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  contextIcon: {
    fontSize: 20,
  },
  contextTitle: {
    color: colors.text,
    fontFamily: fonts.black,
    fontSize: 17,
  },
  previewNote: {
    color: colors.textMuted,
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 23,
    marginTop: spacing.sm,
  },
  bottomTabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: 'row',
    height: ui.bottomTabHeight,
    left: 0,
    paddingBottom: spacing.sm,
    position: 'absolute',
    right: 0,
  },
  tabItem: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    opacity: 0.55,
  },
  tabItemActive: {
    opacity: 1,
  },
  tabItemEmoji: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    color: colors.textMuted,
    fontFamily: fonts.black,
    fontSize: type.caption,
    height: 26,
    lineHeight: 24,
    overflow: 'hidden',
    textAlign: 'center',
    width: 26,
  },
  tabItemText: {
    color: colors.textMuted,
    fontFamily: fonts.black,
    fontSize: type.micro,
    marginTop: 2,
  },
  lessonSafeArea: {
    backgroundColor: '#140F0C',
    flex: 1,
  },
  lessonTopBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: '#2B211B',
    borderColor: '#4A3529',
    borderRadius: 24,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  closeButtonPressed: {
    opacity: 0.65,
  },
  closeButtonText: {
    color: colors.text,
    fontFamily: fonts.medium,
    fontSize: 38,
    lineHeight: 40,
  },
  lessonProgressTrack: {
    backgroundColor: '#33261F',
    borderRadius: radius.pill,
    flex: 1,
    height: 18,
    overflow: 'hidden',
  },
  lessonProgressFill: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    height: '100%',
  },
  lessonContent: {
    padding: spacing.lg,
    paddingBottom: 220,
  },
  lessonTitle: {
    color: colors.text,
    fontFamily: fonts.black,
    fontSize: 31,
    lineHeight: 38,
    marginBottom: spacing.lg,
  },
  lessonPromptRow: {
    alignItems: 'stretch',
    gap: spacing.md,
  },
  guidePromptRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  speechCard: {
    alignItems: 'center',
    backgroundColor: '#1E1612',
    borderColor: '#4A3529',
    borderRadius: radius.lg,
    borderWidth: 2,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  soundIcon: {
    fontSize: 22,
  },
  audioButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(70, 180, 255, 0.12)',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  audioButtonPressed: {
    opacity: 0.65,
    transform: [{ scale: 0.94 }],
  },
  speechTextWrap: {
    flex: 1,
  },
  phraseText: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 23,
    lineHeight: 32,
  },
  phraseHint: {
    color: colors.textLight,
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  audioHelperCard: {
    backgroundColor: 'rgba(28, 176, 246, 0.1)',
    borderColor: 'rgba(28, 176, 246, 0.32)',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  audioHelperTitle: {
    color: colors.blue,
    fontFamily: fonts.black,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  audioHelperBody: {
    color: colors.text,
    fontFamily: fonts.black,
    fontSize: 20,
    lineHeight: 28,
    marginTop: spacing.xs,
  },
  choiceList: {
    gap: spacing.md,
    marginTop: spacing.xxl,
  },
  imageChoiceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  matchPairsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  matchPairColumn: {
    flex: 1,
    gap: spacing.md,
  },
  matchPairCard: {
    alignItems: 'center',
    backgroundColor: '#1E1612',
    borderColor: '#4A3529',
    borderBottomWidth: 5,
    borderRadius: radius.lg,
    borderWidth: 2,
    justifyContent: 'center',
    minHeight: 72,
    padding: spacing.sm,
  },
  matchPairText: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 16,
    textAlign: 'center',
  },
  revealCard: {
    alignItems: 'center',
    backgroundColor: '#1E1612',
    borderColor: '#4A3529',
    borderBottomWidth: 7,
    borderRadius: radius.xl,
    borderWidth: 2,
    marginTop: spacing.xxl,
    minHeight: 280,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  revealCardPressed: {
    borderBottomWidth: 3,
    transform: [{ translateY: 4 }],
  },
  revealLabel: {
    color: colors.accent,
    fontFamily: fonts.black,
    fontSize: 13,
    letterSpacing: 1.4,
  },
  revealWord: {
    color: colors.text,
    fontFamily: fonts.black,
    fontSize: 38,
    lineHeight: 48,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  revealAnswerWrap: {
    alignItems: 'center',
    borderTopColor: '#4A3529',
    borderTopWidth: 1,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    width: '100%',
  },
  revealAnswer: {
    color: colors.blue,
    fontFamily: fonts.black,
    fontSize: 26,
    textAlign: 'center',
  },
  revealPronunciation: {
    color: colors.textLight,
    fontFamily: fonts.semiBold,
    fontSize: 15,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  revealPrompt: {
    color: colors.textLight,
    fontFamily: fonts.semiBold,
    fontSize: 16,
    marginTop: spacing.lg,
  },
  answerCard: {
    alignItems: 'center',
    backgroundColor: '#1E1612',
    borderColor: '#4A3529',
    borderBottomWidth: 5,
    borderRadius: radius.lg,
    borderWidth: 2,
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
  },
  imageChoiceCard: {
    alignItems: 'center',
    backgroundColor: '#1E1612',
    borderColor: '#4A3529',
    borderBottomWidth: 5,
    borderRadius: radius.xl,
    borderWidth: 2,
    flexBasis: '47%',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 170,
    padding: spacing.md,
  },
  imageChoiceArt: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius.lg,
    height: 96,
    width: '100%',
  },
  answerCardSelected: {
    backgroundColor: 'rgba(244, 185, 66, 0.14)',
    borderColor: colors.accent,
  },
  answerCardCorrect: {
    backgroundColor: 'rgba(88, 204, 2, 0.18)',
    borderColor: colors.primary,
  },
  answerCardWrong: {
    backgroundColor: 'rgba(255, 92, 92, 0.16)',
    borderColor: colors.error,
  },
  answerCardText: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 17,
    lineHeight: 22,
    textAlign: 'center',
  },
  buildArea: {
    marginTop: spacing.xl,
  },
  answerTray: {
    alignContent: 'flex-start',
    borderBottomColor: '#4A3529',
    borderBottomWidth: 2,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    minHeight: 76,
    paddingBottom: spacing.md,
  },
  answerPlaceholder: {
    color: colors.textLight,
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  wordBank: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
    marginTop: spacing.xxl,
  },
  wordChip: {
    backgroundColor: '#1E1612',
    borderColor: '#4A3529',
    borderBottomWidth: 4,
    borderRadius: radius.md,
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  wordChipSelected: {
    backgroundColor: '#2B211B',
    borderColor: colors.accent,
    borderBottomWidth: 4,
    borderRadius: radius.md,
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  wordChipUsed: {
    opacity: 0.22,
  },
  wordChipText: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 16,
  },
  lessonReviewScreen: {
    padding: spacing.lg,
    paddingBottom: 140,
    paddingTop: spacing.md,
  },
  lessonReviewEyebrow: {
    color: colors.accent,
    fontFamily: fonts.black,
    fontSize: 12,
    letterSpacing: 1.4,
    marginTop: spacing.md,
  },
  lessonReviewTitle: {
    color: colors.text,
    fontFamily: fonts.black,
    fontSize: 34,
    lineHeight: 42,
    marginTop: spacing.xs,
  },
  lessonReviewBody: {
    color: colors.textMuted,
    fontFamily: fonts.semiBold,
    fontSize: 16,
    lineHeight: 24,
    marginTop: spacing.sm,
  },
  lessonReviewList: {
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  lessonCompleteScreen: {
    flex: 1,
    justifyContent: 'center',
    overflow: 'hidden',
    padding: spacing.xl,
  },
  confettiLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  confettiPiece: {
    fontFamily: fonts.black,
    fontSize: 20,
    position: 'absolute',
  },
  lessonCompleteGuide: {
    alignSelf: 'center',
    position: 'relative',
  },
  lessonCompleteCheck: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
    borderRadius: radius.pill,
    borderWidth: 2,
    bottom: -5,
    height: 34,
    justifyContent: 'center',
    position: 'absolute',
    right: -9,
    width: 34,
  },
  lessonCompleteCheckText: {
    color: colors.surface,
    fontFamily: fonts.black,
    fontSize: 19,
  },
  lessonCompleteEyebrow: {
    color: colors.accent,
    fontFamily: fonts.black,
    fontSize: 13,
    letterSpacing: 1.6,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  lessonCompleteTitle: {
    color: colors.text,
    fontFamily: fonts.black,
    fontSize: 34,
    lineHeight: 42,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  lessonCompleteBody: {
    color: colors.textMuted,
    fontFamily: fonts.semiBold,
    fontSize: 16,
    lineHeight: 24,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  lessonCompleteReward: {
    alignItems: 'center',
    backgroundColor: '#1E1612',
    borderColor: '#4A3529',
    borderRadius: radius.xl,
    borderWidth: 2,
    marginVertical: spacing.xl,
    padding: spacing.lg,
  },
  lessonCompleteRewardValue: {
    color: colors.accent,
    fontFamily: fonts.black,
    fontSize: 30,
  },
  lessonCompleteRewardLabel: {
    color: colors.textMuted,
    fontFamily: fonts.bold,
    marginTop: spacing.xs,
  },
  lessonCompleteStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  lessonCompleteStat: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    color: colors.textMuted,
    fontFamily: fonts.bold,
    fontSize: type.caption,
    overflow: 'hidden',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  lessonFooter: {
    backgroundColor: '#1E1612',
    borderTopColor: '#2E221B',
    borderTopWidth: 1,
    bottom: 0,
    left: 0,
    padding: spacing.lg,
    position: 'absolute',
    right: 0,
  },
  correctFooter: {
    backgroundColor: '#173823',
  },
  wrongFooter: {
    backgroundColor: '#3A1D1C',
  },
  feedbackCopy: {
    marginBottom: spacing.md,
  },
  feedbackTitle: {
    color: colors.primary,
    fontFamily: fonts.black,
    fontSize: 24,
  },
  feedbackTitleWrong: {
    color: colors.error,
  },
  feedbackBody: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 16,
    marginTop: spacing.xs,
  },
  feedbackHint: {
    color: colors.textMuted,
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  noticeWrap: {
    bottom: ui.bottomTabHeight + spacing.md,
    left: spacing.md,
    position: 'absolute',
    right: spacing.md,
    zIndex: 50,
  },
  noticeCard: {
    alignItems: 'center',
    backgroundColor: '#1E1612',
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    ...shadows.card,
  },
  noticeInfo: {
    borderColor: colors.blue,
  },
  noticeSuccess: {
    borderColor: colors.primary,
  },
  noticeWarning: {
    borderColor: colors.accent,
  },
  noticeCopy: {
    flex: 1,
  },
  noticeTitle: {
    color: colors.text,
    fontFamily: fonts.black,
    fontSize: 15,
  },
  noticeBody: {
    color: colors.textMuted,
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  noticeDismiss: {
    alignItems: 'center',
    backgroundColor: '#2B211B',
    borderRadius: radius.pill,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  noticeDismissText: {
    color: colors.text,
    fontFamily: fonts.black,
    fontSize: 22,
    lineHeight: 23,
  },
});
