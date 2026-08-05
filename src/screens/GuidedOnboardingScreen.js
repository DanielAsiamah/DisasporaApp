import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Image,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing,
  FadeInLeft,
  FadeInRight,
  FadeOutLeft,
  FadeOutRight,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fonts } from '../theme';

const {
  ONBOARDING_STEPS,
  INITIAL_ONBOARDING_DRAFT,
  BASE_LANGUAGES,
  MOTIVATIONS,
  DAILY_GOALS,
  STARTING_LEVELS,
  getCoursesForBaseLanguage,
  selectBaseLanguage,
  sanitizeOnboardingStepIndex,
  hydrateOnboardingDraft,
  restoreOnboardingProgress,
  completeOnboarding,
  canCompleteOnboarding,
  canContinueOnboarding,
} = require('../onboarding/onboardingModel');

const AMARA = require('../../assets/guides/amara.png');
const KAI = require('../../assets/guides/kai.png');
const SOL = require('../../assets/guides/sol.png');

const DRAFT_KEY = 'diaspora:onboarding-draft:v1';
const MAX_CONTENT_WIDTH = 480;
const COMPLETION_ERROR_MESSAGE = 'We couldn’t save your path. Please try again.';
const STEP_TITLES = {
  welcome: 'Languages carry us home',
  baseLanguage: 'What language do you speak best?',
  course: 'What would you like to learn?',
  motivation: 'What brings you here?',
  goal: 'Choose your daily rhythm',
  level: 'Where should we begin?',
  ready: 'Your path is ready',
};

const palette = {
  backgroundTop: '#DDF3FF',
  backgroundBottom: '#FFFFFF',
  cloud: 'rgba(255, 255, 255, 0.72)',
  navy: '#102A43',
  textMuted: '#58708A',
  textSoft: '#5F768C',
  primary: '#0874D1',
  primaryPressed: '#0564B8',
  primaryShadow: '#034D8F',
  primarySoft: '#EAF5FF',
  card: '#FFFFFF',
  cardBorder: '#CDE5F5',
  controlMuted: '#6F879D',
  divider: '#DFEDF6',
  disabled: '#B6C7D6',
  error: '#B42318',
  inputPlaceholder: '#5F768C',
};

export default function GuidedOnboardingScreen({
  backAccessibilityLabel = 'Go back',
  initialData,
  onBack,
  onComplete,
}) {
  const { height, width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const compact = height < 720 || width < 370;
  const horizontalPadding = compact ? 16 : 24;
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [draft, setDraft] = useState(INITIAL_ONBOARDING_DRAFT);
  const [hydrated, setHydrated] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionError, setCompletionError] = useState('');
  const completionInFlight = useRef(false);
  const step = ONBOARDING_STEPS[stepIndex];
  const courses = useMemo(
    () => getCoursesForBaseLanguage(draft.baseLanguage),
    [draft.baseLanguage]
  );
  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === draft.currentCourse) || courses[0],
    [courses, draft.currentCourse]
  );
  const selectedLevel = useMemo(
    () => STARTING_LEVELS.find((level) => level.id === draft.proficiencyLevel)
      || STARTING_LEVELS[0],
    [draft.proficiencyLevel]
  );

  useEffect(() => {
    let active = true;

    async function restoreDraft() {
      let localDraft = null;

      try {
        const saved = await AsyncStorage.getItem(DRAFT_KEY);
        localDraft = saved ? JSON.parse(saved) : null;
      } catch {
        localDraft = null;
      }

      if (!active) return;
      const restored = restoreOnboardingProgress(localDraft, initialData);
      setDraft(restored.draft);
      setStepIndex(restored.stepIndex);
      setHydrated(true);
    }

    restoreDraft();

    return () => {
      active = false;
    };
  }, [initialData]);

  useEffect(() => {
    if (!hydrated || isCompleting) return;

    const sanitized = hydrateOnboardingDraft(draft);
    const {
      onboardingCompleted: _onboardingCompleted,
      selectedStartUnit: _selectedStartUnit,
      ...unfinishedDraft
    } = sanitized;

    AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({
      ...unfinishedDraft,
      onboardingStepIndex: sanitizeOnboardingStepIndex(stepIndex),
    })).catch(() => {});
  }, [draft, hydrated, isCompleting, stepIndex]);

  useEffect(() => {
    if (!hydrated) return;

    AccessibilityInfo.announceForAccessibility(
      `${STEP_TITLES[step]}. Step ${stepIndex + 1} of ${ONBOARDING_STEPS.length}.`
    );
  }, [hydrated, step, stepIndex]);

  const readyForStep = canContinueOnboarding(step, draft);
  const readyForCompletion = canCompleteOnboarding(draft);
  const canAdvance = hydrated
    && !isCompleting
    && readyForStep
    && (step !== 'ready' || readyForCompletion);

  function choose(fields) {
    Haptics.selectionAsync().catch(() => {});
    setDraft((current) => ({ ...current, ...fields }));
  }

  function chooseBaseLanguage(language) {
    Haptics.selectionAsync().catch(() => {});
    setDraft((current) => selectBaseLanguage(current, language.id));
  }

  function chooseCourse(course) {
    choose({ currentCourse: course.id, guideRegion: course.region });
  }

  function chooseLevel(level) {
    choose({ proficiencyLevel: level.id, recommendedStartUnit: level.unit });
  }

  function setReminderEnabled(reminderEnabled) {
    Haptics.selectionAsync().catch(() => {});
    setDraft((current) => ({ ...current, reminderEnabled, reminderTime: '19:00' }));
  }

  function goBack() {
    if (completionInFlight.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (stepIndex === 0) {
      onBack();
      return;
    }

    setDirection(-1);
    setStepIndex((current) => current - 1);
  }

  async function continueFlow() {
    if (!canAdvance || completionInFlight.current) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (stepIndex < ONBOARDING_STEPS.length - 1) {
      setDirection(1);
      setStepIndex((current) => current + 1);
      return;
    }

    if (!canContinueOnboarding('welcome', draft)) return;

    completionInFlight.current = true;
    setCompletionError('');
    setIsCompleting(true);
    try {
      const completeDraft = completeOnboarding(draft);
      await Promise.resolve(onComplete(completeDraft));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {
      setCompletionError(COMPLETION_ERROR_MESSAGE);
      AccessibilityInfo.announceForAccessibility(COMPLETION_ERROR_MESSAGE);
    } finally {
      completionInFlight.current = false;
      setIsCompleting(false);
    }
  }

  const transitionIn = reduceMotion
    ? undefined
    : direction > 0
      ? FadeInRight.duration(230)
      : FadeInLeft.duration(230);
  const transitionOut = reduceMotion
    ? undefined
    : direction > 0
      ? FadeOutLeft.duration(230)
      : FadeOutRight.duration(230);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <LinearGradient
        colors={[palette.backgroundTop, palette.backgroundBottom]}
        locations={[0, 0.82]}
        style={StyleSheet.absoluteFill}
      />
      <CloudBackdrop />

      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoiding}
        >
          <View style={styles.headerShell}>
            <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
              <Pressable
                accessibilityHint={stepIndex === 0 ? 'Returns to the previous screen' : 'Returns to the previous onboarding step'}
                accessibilityLabel={backAccessibilityLabel}
                accessibilityRole="button"
                accessibilityState={{ disabled: isCompleting }}
                disabled={isCompleting}
                hitSlop={8}
                onPress={goBack}
                style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
              >
                <Text style={styles.backGlyph}>‹</Text>
              </Pressable>

              <View
                accessibilityLabel={`Onboarding step ${stepIndex + 1} of ${ONBOARDING_STEPS.length}`}
                accessibilityRole="progressbar"
                accessibilityValue={{
                  min: 1,
                  max: ONBOARDING_STEPS.length,
                  now: stepIndex + 1,
                  text: `${stepIndex + 1} of ${ONBOARDING_STEPS.length}`,
                }}
                style={styles.progressTrack}
              >
                <View
                  style={[
                    styles.progressFill,
                    { width: `${((stepIndex + 1) / ONBOARDING_STEPS.length) * 100}%` },
                  ]}
                />
              </View>

              <Text
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={styles.stepCount}
              >
                {stepIndex + 1}/{ONBOARDING_STEPS.length}
              </Text>
            </View>
          </View>

          <Animated.View
            entering={transitionIn}
            exiting={transitionOut}
            key={step}
            style={styles.animatedContent}
          >
            <ScrollView
              contentContainerStyle={[
                styles.content,
                compact && styles.contentCompact,
                { paddingHorizontal: horizontalPadding },
              ]}
              contentInsetAdjustmentBehavior="automatic"
              keyboardDismissMode={process.env.EXPO_OS === 'ios' ? 'interactive' : 'on-drag'}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={styles.scrollView}
            >
              {renderStep({
                compact,
                courses,
                draft,
                selectedCourse,
                selectedLevel,
                setDraft,
                step,
                width,
                choose,
                chooseBaseLanguage,
                chooseCourse,
                chooseLevel,
                setReminderEnabled,
              })}
            </ScrollView>
          </Animated.View>

          <View style={styles.footerShell}>
            <View style={[styles.footer, { paddingHorizontal: horizontalPadding }]}>
              <PrimaryAction
                busy={isCompleting}
                disabled={!canAdvance}
                label={step === 'ready' ? 'START LEARNING.' : 'CONTINUE'}
                onPress={continueFlow}
              />
              {completionError ? (
                <Text
                  accessibilityLiveRegion="assertive"
                  accessibilityRole="alert"
                  style={styles.completionError}
                >
                  {completionError}
                </Text>
              ) : null}
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function renderStep({
  compact,
  courses,
  draft,
  selectedCourse,
  selectedLevel,
  setDraft,
  step,
  width,
  choose,
  chooseBaseLanguage,
  chooseCourse,
  chooseLevel,
  setReminderEnabled,
}) {
  if (step === 'welcome') {
    const enteredName = draft.preferredName.length > 0;
    const nameIsTooShort = enteredName && draft.preferredName.trim().length < 2;

    return (
      <View style={[styles.step, compact && styles.stepCompact]}>
        <StepHeading compact={compact} title="Languages carry us home" />
        <GuideArt character="amara" compact={compact} width={width} />
        <View style={styles.promptBlock}>
          <Text style={[styles.prompt, compact && styles.promptCompact]}>What should we call you?</Text>
          <TextInput
            accessibilityHint="Enter at least 2 characters for the name your guides should use"
            accessibilityLabel="Preferred name"
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={32}
            onChangeText={(preferredName) => setDraft((current) => ({ ...current, preferredName }))}
            placeholder="Your name"
            placeholderTextColor={palette.inputPlaceholder}
            returnKeyType="done"
            style={styles.nameInput}
            textContentType="givenName"
            value={draft.preferredName}
          />
          <Text
            accessibilityLiveRegion={nameIsTooShort ? 'polite' : 'none'}
            accessibilityRole={nameIsTooShort ? 'alert' : 'text'}
            style={[styles.nameHelper, nameIsTooShort && styles.nameError]}
          >
            {nameIsTooShort
              ? 'Name must be at least 2 characters.'
              : 'Use at least 2 characters.'}
          </Text>
        </View>
      </View>
    );
  }

  if (step === 'baseLanguage') {
    return (
      <View style={[styles.step, compact && styles.stepCompact]}>
        <StepHeading
          body="We’ll use it for instructions and translations."
          compact={compact}
          title="What language do you speak best?"
        />
        <OptionList
          accessibilityLabel="Base language choices"
          items={BASE_LANGUAGES}
          onSelect={chooseBaseLanguage}
          selectedId={draft.baseLanguage}
        />
      </View>
    );
  }

  if (step === 'course') {
    return (
      <View style={[styles.step, compact && styles.stepCompact]}>
        <StepHeading
          body="Choose one path to begin."
          compact={compact}
          title="What would you like to learn?"
        />
        <OptionList
          accessibilityLabel="Course choices"
          items={courses}
          onSelect={chooseCourse}
          selectedId={draft.currentCourse}
        />
      </View>
    );
  }

  if (step === 'motivation') {
    return (
      <View style={[styles.step, compact && styles.stepCompact]}>
        <GuideArt character="kai" compact={compact} width={width} />
        <StepHeading compact={compact} title="What brings you here?" />
        <OptionList
          accessibilityLabel="Motivation choices"
          items={MOTIVATIONS}
          onSelect={(item) => choose({ motivation: item.id })}
          selectedId={draft.motivation}
        />
      </View>
    );
  }

  if (step === 'goal') {
    return (
      <View style={[styles.step, compact && styles.stepCompact]}>
        <StepHeading
          body="Pick a pace that feels easy to return to."
          compact={compact}
          title="Choose your daily rhythm"
        />
        <OptionList
          accessibilityLabel="Daily goal choices"
          getId={(item) => String(item.minutes)}
          grid
          items={DAILY_GOALS}
          onSelect={(item) => choose({ dailyGoalMinutes: item.minutes })}
          selectedId={String(draft.dailyGoalMinutes)}
        />
      </View>
    );
  }

  if (step === 'level') {
    return (
      <View style={[styles.step, compact && styles.stepCompact]}>
        <GuideArt character="sol" compact={compact} width={width} />
        <StepHeading compact={compact} title="Where should we begin?" />
        <OptionList
          accessibilityLabel="Starting level choices"
          items={STARTING_LEVELS}
          onSelect={chooseLevel}
          selectedId={draft.proficiencyLevel}
        />
      </View>
    );
  }

  return (
    <View style={[styles.step, compact && styles.stepCompact]}>
      <GuideArt compact={compact} trio width={width} />
      <StepHeading compact={compact} title="Your path is ready" />

      <View
        accessibilityLabel={`Selected course: ${selectedCourse.label}. Starting level: ${selectedLevel.label}. Daily goal: ${draft.dailyGoalMinutes} minutes per day.`}
        accessible
        style={styles.summaryCard}
      >
        <Text style={styles.summaryEyebrow}>YOUR COURSE</Text>
        <View style={styles.summaryCourseRow}>
          <Text style={styles.summaryFlag}>{selectedCourse.flag}</Text>
          <Text style={styles.summaryCourse}>{selectedCourse.label}</Text>
        </View>
        <View style={styles.summaryDetails}>
          <View style={styles.summaryDetail}>
            <Text style={styles.summaryDetailLabel}>STARTING LEVEL</Text>
            <Text style={styles.summaryDetailValue}>{selectedLevel.label}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryDetail}>
            <Text style={styles.summaryDetailLabel}>DAILY GOAL</Text>
            <Text style={styles.summaryDetailValue}>{draft.dailyGoalMinutes} min/day</Text>
          </View>
        </View>
      </View>

      <View style={styles.reminderCard}>
        <View style={styles.reminderCopy}>
          <Text style={styles.reminderTitle}>Daily reminder</Text>
          <Text style={styles.reminderTime}>7:00 PM</Text>
        </View>
        <Switch
          accessibilityHint="Turns the fixed daily learning reminder on or off"
          accessibilityLabel="Daily reminder at 7:00 PM"
          accessibilityRole="switch"
          accessibilityState={{ checked: draft.reminderEnabled }}
          ios_backgroundColor={palette.controlMuted}
          onValueChange={setReminderEnabled}
          thumbColor={palette.card}
          trackColor={{ false: palette.controlMuted, true: palette.primary }}
          value={draft.reminderEnabled}
        />
      </View>
    </View>
  );
}

function StepHeading({ body, compact, title }) {
  return (
    <View style={styles.heading}>
      <Text
        accessibilityRole="header"
        style={[styles.title, compact && styles.titleCompact]}
      >
        {title}
      </Text>
      {body ? <Text style={styles.subtitle}>{body}</Text> : null}
    </View>
  );
}

function OptionList({
  accessibilityLabel,
  getId = (item) => item.id,
  grid = false,
  items,
  onSelect,
  selectedId,
}) {
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="radiogroup"
      style={[styles.optionList, grid && styles.optionGrid]}
    >
      {items.map((item) => {
        const id = getId(item);
        const active = selectedId === id;
        const disabled = item.available === false;
        const itemDetail = item.detail || item.note || item.subtitle;
        const detail = disabled
          ? `${itemDetail ? `${itemDetail} ` : ''}Coming soon.`
          : itemDetail;

        return (
          <Pressable
            accessibilityLabel={detail ? `${item.label}, ${detail}` : item.label}
            accessibilityRole="radio"
            accessibilityState={{ checked: active, disabled }}
            disabled={disabled}
            key={id}
            onPress={() => onSelect(item)}
            style={({ pressed }) => [
              styles.option,
              grid && styles.optionGridItem,
              active && styles.optionActive,
              disabled && styles.optionDisabled,
              pressed && !disabled && styles.optionPressed,
            ]}
          >
            {item.flag ? <Text style={styles.optionFlag}>{item.flag}</Text> : null}
            <View style={styles.optionCopy}>
              <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                {item.label}
              </Text>
              {detail ? <Text style={styles.optionDetail}>{detail}</Text> : null}
            </View>
            <View style={[styles.radio, active && styles.radioActive]}>
              {active ? <View style={styles.radioDot} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function GuideArt({ character, compact, trio = false, width }) {
  const reduceMotion = useReducedMotion();
  const float = useSharedValue(0);
  const breathe = useSharedValue(1);

  useEffect(() => {
    cancelAnimation(float);
    cancelAnimation(breathe);

    if (reduceMotion) {
      float.value = 0;
      breathe.value = 1;
      return undefined;
    }

    const easing = Easing.inOut(Easing.quad);
    float.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 1800, easing }),
        withTiming(0, { duration: 1800, easing })
      ),
      -1,
      false
    );
    breathe.value = withRepeat(
      withSequence(
        withTiming(1.018, { duration: 2100, easing }),
        withTiming(1, { duration: 2100, easing })
      ),
      -1,
      false
    );

    return () => {
      cancelAnimation(float);
      cancelAnimation(breathe);
    };
  }, [breathe, float, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: float.value }, { scale: breathe.value }],
  }));

  if (trio) {
    const canvasWidth = Math.min(width - 40, compact ? 286 : 346);
    const artSize = compact ? 142 : 178;
    const centerLeft = (canvasWidth - artSize) / 2;

    return (
      <Animated.View
        accessibilityLabel="Amara, Kai and Sol, your language guides"
        accessibilityRole="image"
        style={[styles.trioCanvas, { height: artSize, width: canvasWidth }, animatedStyle]}
      >
        <Image
          accessibilityIgnoresInvertColors
          source={AMARA}
          style={[styles.trioImage, { height: artSize, left: 0, width: artSize, zIndex: 1 }]}
        />
        <Image
          accessibilityIgnoresInvertColors
          source={KAI}
          style={[
            styles.trioImage,
            { height: artSize, left: centerLeft, width: artSize, zIndex: 3 },
          ]}
        />
        <Image
          accessibilityIgnoresInvertColors
          source={SOL}
          style={[
            styles.trioImage,
            { height: artSize, left: canvasWidth - artSize, width: artSize, zIndex: 2 },
          ]}
        />
      </Animated.View>
    );
  }

  const art = character === 'kai'
    ? { label: 'Kai, your language guide', source: KAI }
    : character === 'sol'
      ? { label: 'Sol, your language guide', source: SOL }
      : { label: 'Amara, your language guide', source: AMARA };
  const artSize = compact ? 172 : Math.min(228, width * 0.58);

  return (
    <Animated.View style={[styles.singleArtWrap, animatedStyle]}>
      <Image
        accessibilityIgnoresInvertColors
        accessibilityLabel={art.label}
        accessibilityRole="image"
        resizeMode="contain"
        source={art.source}
        style={{ height: artSize, width: artSize }}
      />
    </Animated.View>
  );
}

function CloudBackdrop() {
  const reduceMotion = useReducedMotion();
  const drift = useSharedValue(-12);

  useEffect(() => {
    cancelAnimation(drift);

    if (reduceMotion) {
      drift.value = 0;
      return undefined;
    }

    drift.value = withRepeat(
      withTiming(26, { duration: 9000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    return () => cancelAnimation(drift);
  }, [drift, reduceMotion]);

  const cloudOneStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: drift.value }],
  }));
  const cloudTwoStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: drift.value * -0.65 }, { scale: 0.78 }],
  }));

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
    >
      <Animated.View style={[styles.cloud, styles.cloudOne, cloudOneStyle]}>
        <View style={[styles.cloudPuff, styles.cloudPuffLarge]} />
        <View style={[styles.cloudPuff, styles.cloudPuffSmall]} />
      </Animated.View>
      <Animated.View style={[styles.cloud, styles.cloudTwo, cloudTwoStyle]}>
        <View style={[styles.cloudPuff, styles.cloudPuffLarge]} />
        <View style={[styles.cloudPuff, styles.cloudPuffSmall]} />
      </Animated.View>
    </View>
  );
}

function PrimaryAction({ busy, disabled, label, onPress }) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!reduceMotion) return;
    cancelAnimation(scale);
    scale.value = 1;
  }, [reduceMotion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function pressIn() {
    if (disabled) return;
    if (reduceMotion) {
      scale.value = 1;
      return;
    }
    scale.value = withTiming(0.975, { duration: 80 });
  }

  function pressOut() {
    if (reduceMotion) {
      scale.value = 1;
      return;
    }
    scale.value = withTiming(1, { duration: 130 });
  }

  return (
    <Animated.View style={[styles.primaryButtonWrap, disabled && styles.primaryButtonDisabled, animatedStyle]}>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ busy, disabled }}
        disabled={disabled}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={({ pressed }) => [styles.primaryButton, pressed && !disabled && styles.primaryButtonPressed]}
      >
        <Text style={styles.primaryButtonText}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: palette.backgroundTop,
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardAvoiding: {
    flex: 1,
  },
  headerShell: {
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    maxWidth: MAX_CONTENT_WIDTH,
    paddingBottom: 8,
    paddingTop: 4,
    width: '100%',
  },
  backButton: {
    alignItems: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  backButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  backGlyph: {
    color: palette.navy,
    fontFamily: fonts.bold,
    fontSize: 36,
    lineHeight: 38,
    marginTop: -3,
  },
  progressTrack: {
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderColor: 'rgba(122, 181, 217, 0.26)',
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    height: 10,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: palette.primary,
    borderRadius: 999,
    height: '100%',
  },
  stepCount: {
    color: palette.textMuted,
    fontFamily: fonts.bold,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    minWidth: 28,
    textAlign: 'right',
  },
  animatedContent: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    alignSelf: 'center',
    maxWidth: MAX_CONTENT_WIDTH,
    paddingBottom: 28,
    paddingTop: 12,
    width: '100%',
  },
  contentCompact: {
    paddingBottom: 18,
    paddingTop: 4,
  },
  step: {
    gap: 20,
  },
  stepCompact: {
    gap: 14,
  },
  heading: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: palette.navy,
    fontFamily: fonts.extraBold,
    fontSize: 30,
    letterSpacing: -0.8,
    lineHeight: 38,
    textAlign: 'center',
  },
  titleCompact: {
    fontSize: 26,
    lineHeight: 33,
  },
  subtitle: {
    color: palette.textMuted,
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 340,
    textAlign: 'center',
  },
  promptBlock: {
    gap: 12,
  },
  prompt: {
    color: palette.navy,
    fontFamily: fonts.bold,
    fontSize: 21,
    lineHeight: 28,
    textAlign: 'center',
  },
  promptCompact: {
    fontSize: 19,
    lineHeight: 25,
  },
  nameInput: {
    backgroundColor: palette.card,
    borderColor: palette.primary,
    borderRadius: 18,
    borderCurve: 'continuous',
    borderWidth: 2,
    color: palette.navy,
    fontFamily: fonts.bold,
    fontSize: 18,
    minHeight: 60,
    paddingHorizontal: 18,
    boxShadow: '0 6px 14px rgba(37, 92, 130, 0.14)',
  },
  nameHelper: {
    color: palette.textSoft,
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 17,
    paddingHorizontal: 4,
    textAlign: 'center',
  },
  nameError: {
    color: palette.error,
    fontFamily: fonts.semiBold,
  },
  singleArtWrap: {
    alignItems: 'center',
    alignSelf: 'center',
    justifyContent: 'flex-end',
  },
  trioCanvas: {
    alignSelf: 'center',
    position: 'relative',
  },
  trioImage: {
    bottom: 0,
    position: 'absolute',
    resizeMode: 'contain',
  },
  optionList: {
    gap: 11,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  option: {
    alignItems: 'center',
    backgroundColor: palette.card,
    borderColor: palette.cardBorder,
    borderRadius: 18,
    borderCurve: 'continuous',
    borderWidth: 2,
    flexDirection: 'row',
    gap: 12,
    minHeight: 68,
    paddingHorizontal: 15,
    paddingVertical: 13,
    boxShadow: '0 5px 10px rgba(37, 92, 130, 0.10)',
  },
  optionGridItem: {
    flexBasis: '48%',
    flexGrow: 1,
    minWidth: 140,
  },
  optionActive: {
    backgroundColor: palette.primarySoft,
    borderColor: palette.primary,
  },
  optionPressed: {
    opacity: 0.82,
    transform: [{ translateY: 1 }],
  },
  optionDisabled: {
    opacity: 0.56,
  },
  optionFlag: {
    fontSize: 26,
    width: 34,
  },
  optionCopy: {
    flex: 1,
    gap: 3,
  },
  optionLabel: {
    color: palette.navy,
    fontFamily: fonts.bold,
    fontSize: 16,
    lineHeight: 21,
  },
  optionLabelActive: {
    color: palette.primaryPressed,
  },
  optionDetail: {
    color: palette.textMuted,
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 17,
  },
  radio: {
    alignItems: 'center',
    borderColor: palette.controlMuted,
    borderRadius: 12,
    borderWidth: 2,
    height: 23,
    justifyContent: 'center',
    width: 23,
  },
  radioActive: {
    borderColor: palette.primary,
  },
  radioDot: {
    backgroundColor: palette.primary,
    borderRadius: 6,
    height: 11,
    width: 11,
  },
  summaryCard: {
    alignItems: 'center',
    backgroundColor: palette.card,
    borderColor: palette.cardBorder,
    borderRadius: 20,
    borderCurve: 'continuous',
    borderWidth: 2,
    gap: 7,
    paddingHorizontal: 18,
    paddingVertical: 16,
    boxShadow: '0 6px 12px rgba(37, 92, 130, 0.11)',
  },
  summaryEyebrow: {
    color: palette.textSoft,
    fontFamily: fonts.extraBold,
    fontSize: 10,
    letterSpacing: 1.4,
  },
  summaryCourseRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
  },
  summaryFlag: {
    fontSize: 28,
  },
  summaryCourse: {
    color: palette.navy,
    fontFamily: fonts.extraBold,
    fontSize: 19,
    lineHeight: 25,
  },
  summaryDetails: {
    alignItems: 'stretch',
    borderTopColor: palette.divider,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    marginTop: 5,
    paddingTop: 13,
    width: '100%',
  },
  summaryDetail: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  summaryDivider: {
    alignSelf: 'stretch',
    backgroundColor: palette.divider,
    width: StyleSheet.hairlineWidth,
  },
  summaryDetailLabel: {
    color: palette.textSoft,
    fontFamily: fonts.extraBold,
    fontSize: 9,
    letterSpacing: 0.9,
    textAlign: 'center',
  },
  summaryDetailValue: {
    color: palette.navy,
    fontFamily: fonts.bold,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  reminderCard: {
    alignItems: 'center',
    backgroundColor: palette.card,
    borderColor: palette.cardBorder,
    borderRadius: 20,
    borderCurve: 'continuous',
    borderWidth: 2,
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 15,
  },
  reminderCopy: {
    flex: 1,
    gap: 2,
  },
  reminderTitle: {
    color: palette.navy,
    fontFamily: fonts.bold,
    fontSize: 16,
  },
  reminderTime: {
    color: palette.primaryPressed,
    fontFamily: fonts.extraBold,
    fontSize: 14,
  },
  footerShell: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderTopColor: palette.divider,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footer: {
    gap: 8,
    maxWidth: MAX_CONTENT_WIDTH,
    paddingBottom: 8,
    paddingTop: 12,
    width: '100%',
  },
  completionError: {
    color: palette.error,
    fontFamily: fonts.semiBold,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  primaryButtonWrap: {
    backgroundColor: palette.primaryShadow,
    borderRadius: 18,
    borderCurve: 'continuous',
    paddingBottom: 4,
  },
  primaryButtonDisabled: {
    backgroundColor: palette.disabled,
    opacity: 0.62,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: palette.primary,
    borderRadius: 18,
    borderCurve: 'continuous',
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: 20,
  },
  primaryButtonPressed: {
    backgroundColor: palette.primaryPressed,
  },
  primaryButtonText: {
    color: palette.card,
    fontFamily: fonts.extraBold,
    fontSize: 15,
    letterSpacing: 0.8,
  },
  cloud: {
    backgroundColor: palette.cloud,
    borderRadius: 999,
    height: 34,
    position: 'absolute',
    width: 106,
  },
  cloudOne: {
    left: -18,
    top: 104,
  },
  cloudTwo: {
    right: -24,
    top: 236,
  },
  cloudPuff: {
    backgroundColor: palette.cloud,
    borderRadius: 999,
    position: 'absolute',
  },
  cloudPuffLarge: {
    height: 55,
    left: 28,
    top: -25,
    width: 55,
  },
  cloudPuffSmall: {
    height: 38,
    left: 5,
    top: -13,
    width: 38,
  },
});
