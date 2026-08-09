import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  getCourseProductionAudioRegistry,
  hasApprovedCourseAudio,
} from '../../audio/courseProductionAudioRegistry';
import { useControlledLessonAudio } from '../../audio/useControlledLessonAudio';
import { getCourseImageRegistry } from '../../data/courseImageRegistry';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { fonts } from '../../theme';

const { CONCEPTS } = require('../../data/curriculumContract.cjs');
const { GENERATED_CURRICULUM } = require('../../data/generatedCurriculum.cjs');
const { getCourseById } = require('../../data/courseCatalog.cjs');
const { canAccessRuntimeCourse } = require('../../data/courseAccessPolicy.cjs');
const {
  LESSON_EXERCISE_TYPES,
  buildCourseTopicExercises,
} = require('../../lessonEngine/patoisLessonSteps.cjs');
const {
  createExerciseResponse,
  evaluateExerciseResponse,
  isResponseReady,
  selectMatchItem,
  toggleWordBankItem,
} = require('../../lessonEngine/patoisLessonSession.cjs');
const { createLessonAudioEventGate } = require('../../audio/lessonAudioEventGate.cjs');

const SKY = '#1CB0F6';
const NAVY = '#0B245B';
const PALE = '#EAF8FF';
const BORDER = '#D8E8F2';
const MUTED = '#718397';
const GREEN = '#22B65D';
const RED = '#FF5D66';
const guideArt = {
  Kai: require('../../../assets/guides/kai.png'),
  Amara: require('../../../assets/guides/amara.png'),
  Sol: require('../../../assets/guides/sol.png'),
};

function BreathingVocabularyImage({ conceptId, imageRegistry, reducedMotion }) {
  const breathe = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reducedMotion) {
      breathe.setValue(0);
      return undefined;
    }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(breathe, { toValue: 1, duration: 1700, useNativeDriver: true }),
      Animated.timing(breathe, { toValue: 0, duration: 1700, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [breathe, reducedMotion]);

  const source = imageRegistry[conceptId];
  if (!source) return null;
  return (
    <Animated.Image
      accessibilityLabel="Vocabulary illustration"
      resizeMode="contain"
      source={source}
      style={[
        styles.vocabularyImage,
        {
          transform: [
            { translateY: breathe.interpolate({ inputRange: [0, 1], outputRange: [2, -3] }) },
            { scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.015] }) },
          ],
        },
      ]}
    />
  );
}

function BreathingGuidePortrait({ guideName = 'Kai', reducedMotion, style }) {
  const breathe = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reducedMotion) {
      breathe.setValue(0);
      return undefined;
    }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(breathe, { toValue: 1, duration: 1800, useNativeDriver: true }),
      Animated.timing(breathe, { toValue: 0, duration: 1800, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [breathe, reducedMotion]);

  return (
    <Animated.Image
      accessibilityLabel={`${guideName} guide`}
      resizeMode="contain"
      source={guideArt[guideName] || guideArt.Kai}
      style={[
        style,
        {
          transform: [
            { translateY: breathe.interpolate({ inputRange: [0, 1], outputRange: [1, -4] }) },
            { scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.012] }) },
          ],
        },
      ]}
    />
  );
}

function LessonClouds({ reducedMotion }) {
  const drift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reducedMotion) {
      drift.setValue(0);
      return undefined;
    }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(drift, { duration: 9000, toValue: 1, useNativeDriver: true }),
      Animated.timing(drift, { duration: 9000, toValue: -1, useNativeDriver: true }),
      Animated.timing(drift, { duration: 9000, toValue: 0, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [drift, reducedMotion]);
  return (
    <>
      <Animated.View style={[styles.cloudOne, {
        transform: [{ translateX: drift.interpolate({ inputRange: [-1, 1], outputRange: [-10, 12] }) }],
      }]} />
      <Animated.View style={[styles.cloudTwo, {
        transform: [{ translateX: drift.interpolate({ inputRange: [-1, 1], outputRange: [11, -9] }) }],
      }]} />
    </>
  );
}

function getExerciseHelperText(exercise) {
  if (!exercise) return '';
  if (exercise.type === LESSON_EXERCISE_TYPES.MATCH_PAIRS) return 'Tap one phrase and then tap its matching meaning.';
  if (exercise.type === LESSON_EXERCISE_TYPES.SENTENCE_BUILD) return 'Build the target-language phrase from the word bank below.';
  if (exercise.type === LESSON_EXERCISE_TYPES.WORD_TRAY) return 'Tap the words below to build the English answer in the tray.';
  if (exercise.type === LESSON_EXERCISE_TYPES.LISTEN_CHOICE) return 'Listen carefully, then choose the meaning that matches what you heard.';
  return 'Choose the answer that best matches the prompt before you continue.';
}

function getTopicModeLabel(topic) {
  if (topic.type === 'review') return 'WORDS REVIEW';
  if (topic.type === 'challenge') return 'FINAL CHALLENGE';
  return 'CORE LESSON';
}

function ChoiceExercise({ exercise, feedback, response, setResponse }) {
  return (
    <View style={styles.choiceList}>
      {exercise.choices.map((choice) => {
        const selected = response.selectedChoice === choice;
        const correct = Boolean(feedback) && choice === exercise.answer;
        const wrong = feedback === 'incorrect' && selected;
        return (
          <Pressable
            accessibilityRole="button"
            disabled={Boolean(feedback)}
            key={choice}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setResponse({ selectedChoice: choice });
            }}
            style={({ pressed }) => [
              styles.choiceCard,
              selected && styles.selectedCard,
              correct && styles.correctCard,
              wrong && styles.wrongCard,
              pressed && !feedback && styles.pressedCard,
            ]}
          >
            <Text style={styles.choiceText}>{choice}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function MatchExercise({
  exercise,
  feedback,
  onMatchAccepted,
  onMatchRejected,
  onMatchSelection,
  response,
  setResponse,
  setMatchMessage,
}) {
  function choose(side, item) {
    const result = selectMatchItem(response, { ...item, side });
    setResponse(result.response);
    if (result.status === 'mismatch') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setMatchMessage('Those do not match yet. Try another pair.');
      onMatchRejected();
    } else {
      Haptics.selectionAsync().catch(() => {});
      setMatchMessage(result.status === 'matched' ? 'Pair matched!' : 'Now choose its partner.');
      if (result.status === 'selected') onMatchSelection();
      if (result.status === 'matched') onMatchAccepted(result.matchedPairId);
    }
  }

  function column(items, side) {
    return (
      <View style={styles.matchColumn}>
        {items.map((item) => {
          const matched = response.matchedPairIds.includes(item.pairId);
          const selected = response.selectedMatch?.id === item.id;
          return (
            <Pressable
              disabled={Boolean(feedback) || matched}
              key={item.id}
              onPress={() => choose(side, item)}
              style={[styles.matchCard, selected && styles.selectedCard, matched && styles.correctCard]}
            >
              <Text style={styles.matchText}>{item.value}</Text>
              {matched ? <Text style={styles.matchCheck}>✓</Text> : null}
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <View>
      <View style={styles.matchGrid}>
        {column(exercise.leftItems, 'left')}
        {column(exercise.rightItems, 'right')}
      </View>
    </View>
  );
}

function AudioControls({ conceptId, controller, hasAudio }) {
  if (!hasAudio(conceptId)) return null;
  return (
    <View style={styles.audioControls}>
      <Pressable
        accessibilityLabel="Play phrase"
        accessibilityRole="button"
        onPress={() => controller.dispatch({ event: 'manual-play', phraseId: conceptId })}
        style={styles.speakerButton}
      >
        <Text style={styles.speakerIcon}>🔊</Text>
      </Pressable>
      <Pressable
        accessibilityLabel="Play phrase slowly"
        accessibilityRole="button"
        onPress={() => controller.dispatch({ event: 'manual-slow-play', phraseId: conceptId })}
        style={styles.slowButton}
      >
        <Text style={styles.slowButtonText}>SLOW</Text>
      </Pressable>
    </View>
  );
}

function WordTrayExercise({ exercise, feedback, response, setResponse }) {
  const usedIndexes = new Set(response.builtWords.map(({ index }) => index));
  return (
    <View style={styles.buildArea}>
      <Text style={styles.sectionLabel}>YOUR ANSWER</Text>
      <View style={styles.answerTray}>
        {response.builtWords.length ? response.builtWords.map((word) => (
          <Pressable
            disabled={Boolean(feedback)}
            key={`built-${word.index}`}
            onPress={() => setResponse(toggleWordBankItem(response, word))}
            style={styles.selectedWord}
          >
            <Text style={styles.selectedWordText}>{word.value}</Text>
          </Pressable>
        )) : <Text style={styles.answerPlaceholder}>Tap words below to build your answer</Text>}
      </View>
      <Text style={styles.sectionLabel}>WORD BANK</Text>
      <View style={styles.wordBank}>
        {exercise.wordBank.map((value, index) => {
          const used = usedIndexes.has(index);
          return (
            <Pressable
              disabled={Boolean(feedback) || used}
              key={`${value}-${index}`}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setResponse(toggleWordBankItem(response, { index, value }));
              }}
              style={[styles.wordChip, used && styles.wordChipUsed]}
            >
              <Text style={[styles.wordChipText, used && styles.wordChipTextUsed]}>{value}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function PatoisLessonModal({ courseId = 'jamaican-patois', onClose, onComplete, previewCourseId = null, topic, visible }) {
  const requestedCourse = getCourseById(courseId);
  const runtimeCourseId = canAccessRuntimeCourse(requestedCourse, previewCourseId)
    ? requestedCourse.id
    : null;
  const runtimeCourse = getCourseById(runtimeCourseId || 'jamaican-patois');
  const courseReviewPending = runtimeCourse?.published !== true;
  const phraseRegistry = getCourseProductionAudioRegistry(runtimeCourseId);
  const audio = useControlledLessonAudio({ phraseRegistry });
  const reducedMotion = useReducedMotion();
  const imageRegistry = useMemo(() => getCourseImageRegistry(runtimeCourseId), [runtimeCourseId]);
  const courseTopics = useMemo(() => (
    GENERATED_CURRICULUM.topics
      .filter((candidate) => candidate.courseId === runtimeCourseId)
      .sort((left, right) => left.order - right.order)
  ), [runtimeCourseId]);
  const vocabulary = useMemo(() => (
    GENERATED_CURRICULUM.courseVocabulary.filter((row) => row.courseId === runtimeCourseId)
  ), [runtimeCourseId]);
  const hasCourseAudio = useMemo(
    () => (conceptId) => hasApprovedCourseAudio(runtimeCourseId, conceptId),
    [runtimeCourseId]
  );
  const exercises = useMemo(() => topic && runtimeCourseId ? buildCourseTopicExercises(runtimeCourseId, topic.id, {
    concepts: CONCEPTS,
    vocabulary,
    hasAudio: hasCourseAudio,
  }) : [], [hasCourseAudio, runtimeCourseId, topic, vocabulary]);
  const [index, setIndex] = useState(0);
  const [response, setResponse] = useState(() => createExerciseResponse(exercises[0]));
  const [feedback, setFeedback] = useState(null);
  const [finished, setFinished] = useState(false);
  const [matchMessage, setMatchMessage] = useState('');
  const celebration = useRef(new Animated.Value(0)).current;
  const audioEventGate = useRef(createLessonAudioEventGate()).current;
  const audioSessionId = useRef(0);
  const openTopicId = useRef(null);
  const matchAttempt = useRef(0);
  const exercise = exercises[index];
  const nextTopic = useMemo(() => courseTopics.find((candidate) => candidate.order === (topic?.order ?? 0) + 1) || null, [courseTopics, topic?.order]);

  useEffect(() => {
    if (!visible) {
      openTopicId.current = null;
      audioEventGate.clear();
      audio.dispatch({ event: 'lesson-exit' });
      return;
    }
    if (openTopicId.current === topic?.id) return;
    openTopicId.current = topic?.id || null;
    audioSessionId.current += 1;
    matchAttempt.current = 0;
    audioEventGate.clear();
    audio.dispatch({ event: 'lesson-restart' });
    const firstExercise = exercises[0];
    setIndex(0);
    setResponse(createExerciseResponse(firstExercise));
    setFeedback(null);
    setFinished(false);
    setMatchMessage('');
    celebration.setValue(0);
  }, [audio, audioEventGate, celebration, exercises, topic?.id, visible]);

  useEffect(() => {
    if (!visible || !exercise) return;
    audio.dispatch({ event: 'step-change' });
    if (exercise.type === LESSON_EXERCISE_TYPES.LISTEN_CHOICE) {
      const autoplayKey = `${audioSessionId.current}:${exercise.id}`;
      if (audioEventGate.claim('autoplay', autoplayKey)) {
        audio.dispatch({ event: 'listening-step-enter', phraseId: exercise.conceptId });
      }
    }
  }, [audio, audioEventGate, exercise, visible]);

  function closeLesson() {
    audio.dispatch({ event: 'lesson-exit' });
    onClose();
  }

  function checkAnswer() {
    if (!isResponseReady(exercise, response) || feedback) return;
    const answerKey = `${audioSessionId.current}:${exercise.id}`;
    if (!audioEventGate.claim('answer', answerKey)) return;
    const correct = evaluateExerciseResponse(exercise, response);
    setFeedback(correct ? 'correct' : 'incorrect');
    audio.dispatch({ event: 'answer-accepted', correct, phraseId: exercise.conceptId });
    Haptics.notificationAsync(correct
      ? Haptics.NotificationFeedbackType.Success
      : Haptics.NotificationFeedbackType.Error).catch(() => {});
    if (correct && !reducedMotion) Animated.spring(celebration, { toValue: 1, friction: 5, useNativeDriver: true }).start();
    else if (correct) celebration.setValue(1);
  }

  function continueLesson() {
    if (feedback === 'incorrect') {
      audio.dispatch({ event: 'lesson-restart' });
      audioEventGate.release('answer', `${audioSessionId.current}:${exercise.id}`);
      setResponse(createExerciseResponse(exercise));
      setFeedback(null);
      setMatchMessage('');
      return;
    }
    audio.dispatch({ event: 'step-change' });
    if (index >= exercises.length - 1) {
      setFinished(true);
      onComplete(topic.id);
      return;
    }
    const nextIndex = index + 1;
    matchAttempt.current = 0;
    setIndex(nextIndex);
    setResponse(createExerciseResponse(exercises[nextIndex]));
    setFeedback(null);
    setMatchMessage('');
    celebration.setValue(0);
  }

  if (!topic) return null;
  const topicModeLabel = getTopicModeLabel(topic);
  const completionTitle = topic.type === 'challenge' ? 'Challenge complete!' : topic.type === 'review' ? 'Review complete!' : 'Topic complete!';
  const completeBody = nextTopic ? `You finished ${topic.title}. Next up: ${nextTopic.title}.` : `You finished ${topic.title} and completed this chapter.`;
  const isChoice = [LESSON_EXERCISE_TYPES.TRANSLATE_CHOICE, LESSON_EXERCISE_TYPES.LISTEN_CHOICE].includes(exercise?.type);
  const isMatch = exercise?.type === LESSON_EXERCISE_TYPES.MATCH_PAIRS;
  const isBuild = [LESSON_EXERCISE_TYPES.SENTENCE_BUILD, LESSON_EXERCISE_TYPES.WORD_TRAY].includes(exercise?.type);
  const ready = isResponseReady(exercise, response);

  return (
    <Modal animationType={reducedMotion ? 'none' : 'slide'} onRequestClose={closeLesson} visible={visible}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.root}>
        <View style={styles.topBar}>
          <Pressable accessibilityLabel="Close lesson" hitSlop={12} onPress={closeLesson}>
            <Text style={styles.closeText}>×</Text>
          </Pressable>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${finished ? 100 : ((index + 1) / Math.max(exercises.length, 1)) * 100}%` }]} />
          </View>
          <Text style={styles.count}>{finished ? exercises.length : index + 1}/{exercises.length}</Text>
        </View>

        {finished ? (
          <View style={styles.completeScreen}>
            <Text style={styles.confetti}>✦  ✧  ✦</Text>
            <BreathingGuidePortrait guideName={topic.guide || 'Kai'} reducedMotion={reducedMotion} style={styles.completeGuide} />
            <Image resizeMode="contain" source={imageRegistry[exercises[0]?.conceptId]} style={styles.completeImage} />
            <Text style={styles.completeTitle}>{completionTitle}</Text>
            <Text style={styles.completeBody}>{completeBody}</Text>
            {nextTopic ? <View style={styles.completeNextPill}><Text style={styles.completeNextPillText}>Next up: {nextTopic.title}</Text></View> : null}
            <Pressable onPress={closeLesson} style={styles.primaryButton}><Text style={styles.primaryButtonText}>BACK TO CHAPTER</Text></Pressable>
          </View>
        ) : (
          <>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
              <Text style={styles.eyebrow}>{exercise?.title?.toUpperCase()}</Text>
              <View style={styles.topicModePill}><Text style={styles.topicModePillText}>{topicModeLabel}</Text></View>
              {courseReviewPending ? (
                <View style={styles.reviewBanner}>
                  <Text style={styles.reviewBannerTitle}>Native review pending</Text>
                  <Text style={styles.reviewBannerBody}>
                    This preview content is still awaiting native-speaker approval.
                  </Text>
                </View>
              ) : null}
              {!isMatch ? (
                <View style={styles.scene}>
                  <LessonClouds reducedMotion={reducedMotion} />
                  <BreathingVocabularyImage conceptId={exercise?.imageConceptId} imageRegistry={imageRegistry} reducedMotion={reducedMotion} />
                  <BreathingGuidePortrait guideName={topic.guide || 'Kai'} reducedMotion={reducedMotion} style={styles.lessonGuide} />
                </View>
              ) : null}
              <View style={styles.promptCard}>
                <Text style={styles.prompt}>{exercise?.prompt}</Text>
                <Text style={styles.promptHelper}>{getExerciseHelperText(exercise)}</Text>
                <AudioControls conceptId={exercise?.conceptId} controller={audio} hasAudio={hasCourseAudio} />
              </View>
              {isChoice ? <ChoiceExercise exercise={exercise} feedback={feedback} response={response} setResponse={setResponse} /> : null}
              {isMatch ? (
                <MatchExercise
                  exercise={exercise}
                  feedback={feedback}
                  onMatchAccepted={(phraseId) => {
                    const matchKey = `${audioSessionId.current}:${exercise.id}:${phraseId}`;
                    if (audioEventGate.claim('match', matchKey)) audio.dispatch({ event: 'match-accepted', phraseId });
                  }}
                  onMatchRejected={() => {
                    const mismatchKey = `${audioSessionId.current}:${exercise.id}:${matchAttempt.current}`;
                    if (audioEventGate.claim('mismatch', mismatchKey)) audio.dispatch({ event: 'answer-accepted', correct: false });
                  }}
                  onMatchSelection={() => { matchAttempt.current += 1; }}
                  response={response}
                  setMatchMessage={setMatchMessage}
                  setResponse={setResponse}
                />
              ) : null}
              {isBuild ? <WordTrayExercise exercise={exercise} feedback={feedback} response={response} setResponse={setResponse} /> : null}
              {isMatch && matchMessage ? <Text style={styles.matchMessage}>{matchMessage}</Text> : null}
              {feedback ? (
                <Animated.View style={[
                  styles.feedbackCard,
                  feedback === 'correct' ? styles.feedbackCorrect : styles.feedbackWrong,
                  feedback === 'correct' && { transform: [{ scale: celebration.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }] },
                ]}>
                  {feedback === 'correct' && (
                    <>
                      <Text style={styles.feedbackConfetti}>✦  ✧  ✦</Text>
                      <BreathingGuidePortrait
                        guideName={topic.guide || 'Kai'}
                        reducedMotion={reducedMotion}
                        style={styles.feedbackGuide}
                      />
                    </>
                  )}
                  <Text style={styles.feedbackTitle}>{feedback === 'correct' ? 'Correct! +10 XP' : 'Almost — try again'}</Text>
                  <Text style={styles.feedbackAnswer}>{exercise.answer}</Text>
                </Animated.View>
              ) : null}
            </ScrollView>
            <View style={styles.footer}>
              <Pressable
                disabled={!ready}
                onPress={feedback ? continueLesson : checkAnswer}
                style={[styles.primaryButton, !ready && styles.primaryButtonDisabled]}
              >
                <Text style={styles.primaryButtonText}>{feedback === 'incorrect' ? 'TRY AGAIN' : feedback ? 'CONTINUE' : 'CHECK'}</Text>
              </Pressable>
            </View>
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: '#FFFFFF', flex: 1 },
  topBar: { alignItems: 'center', flexDirection: 'row', gap: 12, paddingHorizontal: 18, paddingVertical: 14 },
  closeText: { color: NAVY, fontFamily: fonts.medium, fontSize: 35, lineHeight: 36 },
  progressTrack: { backgroundColor: '#E4EEF4', borderRadius: 8, flex: 1, height: 10, overflow: 'hidden' },
  progressFill: { backgroundColor: SKY, borderRadius: 8, height: 10 },
  count: { color: MUTED, fontFamily: fonts.bold, fontSize: 12 },
  content: { padding: 22, paddingBottom: 132 },
  eyebrow: { color: SKY, fontFamily: fonts.extraBold, fontSize: 12, letterSpacing: 0.7, textAlign: 'center' },
  topicModePill: { alignSelf: 'center', backgroundColor: PALE, borderColor: BORDER, borderRadius: 999, borderWidth: 1, marginTop: 10, paddingHorizontal: 14, paddingVertical: 7 },
  topicModePillText: { color: NAVY, fontFamily: fonts.extraBold, fontSize: 11, letterSpacing: 0.6 },
  promptCard: { backgroundColor: '#FFFFFF', borderColor: '#DCEBF5', borderRadius: 24, borderWidth: 2, marginBottom: 18, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 2 },
  prompt: { color: NAVY, fontFamily: fonts.extraBold, fontSize: 25, lineHeight: 32, textAlign: 'center' },
  promptHelper: { color: MUTED, fontFamily: fonts.medium, fontSize: 13, lineHeight: 19, marginTop: 8, marginBottom: 14, textAlign: 'center' },
  reviewBanner: { backgroundColor: '#FFF7E8', borderColor: '#FFD38A', borderRadius: 16, borderWidth: 1, marginBottom: 18, marginTop: 14, paddingHorizontal: 14, paddingVertical: 12 },
  reviewBannerTitle: { color: NAVY, fontFamily: fonts.extraBold, fontSize: 13, textAlign: 'center' },
  reviewBannerBody: { color: '#6E5A22', fontFamily: fonts.medium, fontSize: 12, lineHeight: 17, marginTop: 4, textAlign: 'center' },
  scene: { backgroundColor: PALE, borderRadius: 28, height: 225, marginVertical: 18, overflow: 'hidden' },
  vocabularyImage: { alignSelf: 'center', height: 220, marginTop: 5, width: '86%', zIndex: 2 },
  lessonGuide: { bottom: -4, height: 120, position: 'absolute', right: -8, width: 120, zIndex: 3 },
  cloudOne: { backgroundColor: 'rgba(255,255,255,0.72)', borderRadius: 80, height: 34, left: 20, position: 'absolute', top: 34, width: 110 },
  cloudTwo: { backgroundColor: 'rgba(255,255,255,0.62)', borderRadius: 80, height: 28, position: 'absolute', right: 18, top: 78, width: 92 },
  choiceList: { gap: 10 },
  audioControls: { alignItems: 'center', flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: 16 },
  speakerButton: { alignItems: 'center', backgroundColor: SKY, borderRadius: 28, height: 54, justifyContent: 'center', width: 54 },
  speakerIcon: { fontSize: 23 },
  slowButton: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: SKY, borderRadius: 16, borderWidth: 2, justifyContent: 'center', minHeight: 44, paddingHorizontal: 17 },
  slowButtonText: { color: SKY, fontFamily: fonts.extraBold, fontSize: 12, letterSpacing: 0.5 },
  choiceCard: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: BORDER, borderRadius: 17, borderWidth: 2, justifyContent: 'center', minHeight: 58, padding: 13 },
  selectedCard: { backgroundColor: PALE, borderColor: SKY },
  correctCard: { backgroundColor: '#E7F9EE', borderColor: GREEN },
  wrongCard: { backgroundColor: '#FFF0F0', borderColor: RED },
  pressedCard: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  choiceText: { color: NAVY, fontFamily: fonts.bold, fontSize: 16, textAlign: 'center' },
  matchGrid: { flexDirection: 'row', gap: 10, paddingTop: 20 },
  matchColumn: { flex: 1, gap: 10 },
  matchCard: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: BORDER, borderRadius: 15, borderWidth: 2, justifyContent: 'center', minHeight: 67, padding: 10 },
  matchText: { color: NAVY, fontFamily: fonts.bold, fontSize: 14, textAlign: 'center' },
  matchCheck: { color: GREEN, fontFamily: fonts.extraBold, paddingTop: 3 },
  matchMessage: { color: MUTED, fontFamily: fonts.semiBold, paddingTop: 14, textAlign: 'center' },
  buildArea: { paddingTop: 4 },
  sectionLabel: { color: MUTED, fontFamily: fonts.extraBold, fontSize: 11, letterSpacing: 0.8, paddingBottom: 7, paddingTop: 14 },
  answerTray: { alignContent: 'flex-start', backgroundColor: '#F7FBFD', borderColor: BORDER, borderRadius: 18, borderStyle: 'dashed', borderWidth: 2, flexDirection: 'row', flexWrap: 'wrap', gap: 8, minHeight: 92, padding: 12 },
  answerPlaceholder: { color: '#9AAAB4', fontFamily: fonts.medium, padding: 8 },
  selectedWord: { backgroundColor: SKY, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 10 },
  selectedWordText: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 15 },
  wordBank: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  wordChip: { backgroundColor: '#FFFFFF', borderColor: BORDER, borderRadius: 12, borderWidth: 2, paddingHorizontal: 13, paddingVertical: 10 },
  wordChipUsed: { backgroundColor: '#F3F6F8', borderColor: '#EDF2F5' },
  wordChipText: { color: NAVY, fontFamily: fonts.bold, fontSize: 15 },
  wordChipTextUsed: { color: '#C1CBD1' },
  feedbackCard: { borderRadius: 18, marginTop: 18, padding: 16 },
  feedbackCorrect: { backgroundColor: '#E7F9EE' },
  feedbackWrong: { backgroundColor: '#FFF0F0' },
  feedbackConfetti: { color: '#FFB936', fontSize: 18, letterSpacing: 6, marginBottom: 4, textAlign: 'center' },
  feedbackGuide: { alignSelf: 'center', height: 82, marginBottom: 6, width: 82 },
  feedbackTitle: { color: NAVY, fontFamily: fonts.extraBold, fontSize: 18 },
  feedbackAnswer: { color: MUTED, fontFamily: fonts.bold, paddingTop: 4 },
  footer: { backgroundColor: '#FFFFFF', borderTopColor: BORDER, borderTopWidth: 1, bottom: 0, left: 0, padding: 18, position: 'absolute', right: 0 },
  primaryButton: { alignItems: 'center', backgroundColor: SKY, borderRadius: 17, justifyContent: 'center', minHeight: 56, paddingHorizontal: 24 },
  primaryButtonDisabled: { backgroundColor: '#D9E5EB' },
  primaryButtonText: { color: '#FFFFFF', fontFamily: fonts.extraBold, fontSize: 16 },
  completeScreen: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 28 },
  confetti: { color: '#FFB936', fontSize: 36, letterSpacing: 8 },
  completeGuide: { height: 140, marginBottom: -8, width: 140 },
  completeImage: { height: 250, width: 250 },
  completeTitle: { color: GREEN, fontFamily: fonts.extraBold, fontSize: 31, paddingTop: 8 },
  completeNextPill: { backgroundColor: PALE, borderColor: BORDER, borderRadius: 999, borderWidth: 1, marginBottom: 18, paddingHorizontal: 14, paddingVertical: 9 },
  completeNextPillText: { color: NAVY, fontFamily: fonts.extraBold, fontSize: 12 },
  completeBody: { color: MUTED, fontFamily: fonts.medium, fontSize: 16, lineHeight: 23, paddingBottom: 28, paddingTop: 8, textAlign: 'center' },
});
