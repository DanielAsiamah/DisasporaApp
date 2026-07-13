import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import PrimaryButton from '../components/PrimaryButton';
import RegionalGuide from '../components/RegionalGuide';
import { colors, fonts, radius, spacing } from '../theme';

const DRAFT_KEY = 'diaspora:onboarding-draft:v1';

const BASE_LANGUAGES = [
  { id: 'english', label: 'English', flag: '🇺🇸', note: 'Learn from English' },
  { id: 'french', label: 'Français', flag: '🇫🇷', note: 'Apprendre depuis le français' },
  { id: 'arabic', label: 'العربية', flag: '🇸🇦', note: 'تعلّم من اللغة العربية' },
];

const COURSES = {
  english: [
    { id: 'patois', label: 'Jamaican Patois', flag: '🇯🇲', region: 'caribbean' },
    { id: 'swahili', label: 'Swahili', flag: '🇰🇪', region: 'africa' },
    { id: 'igbo', label: 'Igbo', flag: '🇳🇬', region: 'africa' },
    { id: 'belize', label: 'Belizean Kriol', flag: '🇧🇿', region: 'americas' },
    { id: 'aave', label: 'Black American English', flag: '🇺🇸', region: 'americas' },
  ],
  french: [
    { id: 'haitian', label: 'Créole Haïtien', flag: '🇭🇹', region: 'caribbean' },
    { id: 'nouchi', label: 'Nouchi Ivoirien', flag: '🇨🇮', region: 'africa' },
    { id: 'wolof', label: 'Wolof', flag: '🇸🇳', region: 'africa' },
  ],
  arabic: [
    { id: 'sudanese', label: 'العامية السودانية', flag: '🇸🇩', region: 'africa' },
    { id: 'nubian', label: 'اللغة النوبية', flag: '🇪🇬', region: 'africa' },
  ],
};

const MOTIVATIONS = [
  { id: 'family', emoji: '🏡', label: 'Connect with family' },
  { id: 'heritage', emoji: '🌍', label: 'Reconnect with my roots' },
  { id: 'travel', emoji: '✈️', label: 'Travel and speak confidently' },
  { id: 'culture', emoji: '🎶', label: 'Understand music and culture' },
  { id: 'curiosity', emoji: '✨', label: 'Learn something meaningful' },
];

const GOALS = [
  { id: 'casual', minutes: 5, label: 'Casual', detail: 'One quick lesson' },
  { id: 'steady', minutes: 10, label: 'Steady', detail: 'Build a daily rhythm' },
  { id: 'focused', minutes: 15, label: 'Focused', detail: 'Make real progress' },
  { id: 'intense', minutes: 20, label: 'Intense', detail: 'Move fast' },
];

const LEVELS = [
  { id: 'beginner', label: 'Beginner', detail: 'I am starting from the beginning.', unit: 1 },
  { id: 'some', label: 'I know a little', detail: 'I recognize a few words and phrases.', unit: 1 },
  { id: 'comfortable', label: 'Comfortable', detail: 'I can handle simple conversations.', unit: 2 },
];

const STEPS = ['name', 'baseLanguage', 'course', 'motivation', 'goal', 'level', 'reminder'];

const INITIAL_DRAFT = {
  preferredName: '',
  baseLanguage: 'english',
  currentCourse: null,
  guideRegion: 'caribbean',
  motivation: null,
  dailyGoalMinutes: 10,
  proficiencyLevel: null,
  recommendedStartUnit: 1,
  reminderEnabled: null,
  reminderTime: '19:00',
};

export default function GuidedOnboardingScreen({ onBack, onComplete }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState(INITIAL_DRAFT);
  const [hydrated, setHydrated] = useState(false);
  const step = STEPS[stepIndex];
  const availableCourses = useMemo(() => COURSES[draft.baseLanguage] || COURSES.english, [draft.baseLanguage]);

  useEffect(() => {
    AsyncStorage.getItem(DRAFT_KEY)
      .then((saved) => {
        if (saved) setDraft((current) => ({ ...current, ...JSON.parse(saved) }));
      })
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (hydrated) AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft)).catch(() => {});
  }, [draft, hydrated]);

  function select(fields) {
    Haptics.selectionAsync().catch(() => {});
    setDraft((current) => ({ ...current, ...fields }));
  }

  function goBack() {
    if (stepIndex === 0) onBack();
    else setStepIndex((current) => current - 1);
  }

  function canContinue() {
    if (step === 'name') return draft.preferredName.trim().length >= 2;
    if (step === 'course') return Boolean(draft.currentCourse);
    if (step === 'motivation') return Boolean(draft.motivation);
    if (step === 'level') return Boolean(draft.proficiencyLevel);
    if (step === 'reminder') return draft.reminderEnabled !== null;
    return true;
  }

  async function continueFlow() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (stepIndex < STEPS.length - 1) {
      setStepIndex((current) => current + 1);
      return;
    }

    const completeDraft = {
      ...draft,
      preferredName: draft.preferredName.trim(),
      onboardingCompleted: true,
      selectedStartUnit: draft.recommendedStartUnit,
    };
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(completeDraft));
    onComplete(completeDraft);
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Go back" onPress={goBack} style={styles.backButton}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${((stepIndex + 1) / STEPS.length) * 100}%` }]} />
          </View>
          <Text style={styles.stepCount}>{stepIndex + 1}/{STEPS.length}</Text>
        </View>

        <Animated.View
          key={step}
          entering={FadeInRight.duration(240)}
          exiting={FadeOutLeft.duration(160)}
          style={styles.animatedContent}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            contentInsetAdjustmentBehavior="automatic"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {renderStep(step, draft, select, availableCourses)}
          </ScrollView>
        </Animated.View>

        <View style={styles.footer}>
          <PrimaryButton
            disabled={!canContinue()}
            label={step === 'reminder' ? 'SAVE MY PATH' : 'CONTINUE'}
            onPress={continueFlow}
          />
          <Text style={styles.saveNote}>Your choices are saved on this device while you set up.</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

function renderStep(step, draft, select, courses) {
  if (step === 'name') {
    return (
      <>
        <GuideIntro region="caribbean" eyebrow="LET’S MEET" title="What should we call you?" body="Your guide will use this name to encourage you along the way." />
        <TextInput
          autoCapitalize="words"
          autoCorrect={false}
          maxLength={32}
          onChangeText={(preferredName) => select({ preferredName })}
          placeholder="Your first name"
          placeholderTextColor={colors.textLight}
          style={styles.nameInput}
          value={draft.preferredName}
        />
        <Text style={styles.privacyNote}>This can be your first name, nickname, or preferred name.</Text>
      </>
    );
  }

  if (step === 'baseLanguage') {
    return (
      <>
        <GuideIntro region="americas" eyebrow="YOUR APP LANGUAGE" title="What language do you speak?" body="We’ll use this for instructions and translations." />
        <OptionList
          items={BASE_LANGUAGES}
          selected={draft.baseLanguage}
          onSelect={(item) => select({ baseLanguage: item.id, currentCourse: null })}
        />
      </>
    );
  }

  if (step === 'course') {
    return (
      <>
        <GuideIntro region="africa" eyebrow="CHOOSE YOUR PATH" title="What would you like to learn?" body="Start with one language. You can add more later." />
        <OptionList
          items={courses}
          selected={draft.currentCourse}
          onSelect={(item) => select({ currentCourse: item.id, guideRegion: item.region })}
        />
      </>
    );
  }

  if (step === 'motivation') {
    return (
      <>
        <GuideIntro region={draft.guideRegion} eyebrow="MAKE IT YOURS" title={`Why are you learning, ${draft.preferredName}?`} body="We’ll shape examples and encouragement around what matters to you." />
        <OptionList items={MOTIVATIONS} selected={draft.motivation} onSelect={(item) => select({ motivation: item.id })} />
      </>
    );
  }

  if (step === 'goal') {
    return (
      <>
        <GuideIntro region={draft.guideRegion} eyebrow="DAILY RHYTHM" title="Choose a goal you can keep" body="A little every day beats a lot once in a while." />
        <OptionList
          items={GOALS.map((goal) => ({ ...goal, label: `${goal.label} · ${goal.minutes} min`, note: goal.detail }))}
          selected={String(draft.dailyGoalMinutes)}
          onSelect={(item) => select({ dailyGoalMinutes: item.minutes })}
          selectedKey={(item) => String(item.minutes)}
        />
      </>
    );
  }

  if (step === 'level') {
    return (
      <>
        <GuideIntro region={draft.guideRegion} eyebrow="STARTING POINT" title="How much do you already know?" body="There’s no test. We’ll simply choose a comfortable first lesson." />
        <OptionList
          items={LEVELS.map((level) => ({ ...level, note: level.detail }))}
          selected={draft.proficiencyLevel}
          onSelect={(item) => select({ proficiencyLevel: item.id, recommendedStartUnit: item.unit })}
        />
      </>
    );
  }

  return (
    <>
      <GuideIntro region={draft.guideRegion} eyebrow="KEEP YOUR STREAK" title="Would you like a daily reminder?" body="We’ll ask for notification permission only after your account is saved." />
      <OptionList
        items={[
          { id: 'yes', emoji: '🔔', label: 'Yes, remind me', note: 'A gentle reminder around 7:00 PM' },
          { id: 'no', emoji: '🌙', label: 'Not now', note: 'You can turn reminders on later' },
        ]}
        selected={draft.reminderEnabled === null ? null : draft.reminderEnabled ? 'yes' : 'no'}
        onSelect={(item) => select({ reminderEnabled: item.id === 'yes' })}
      />
    </>
  );
}

function GuideIntro({ region, eyebrow, title, body }) {
  return (
    <View style={styles.intro}>
      <RegionalGuide region={region} size="medium" showLabel />
      <View style={styles.introCopy}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{body}</Text>
      </View>
    </View>
  );
}

function OptionList({ items, selected, onSelect, selectedKey = (item) => item.id }) {
  return (
    <View style={styles.optionList}>
      {items.map((item) => {
        const key = selectedKey(item);
        const active = selected === key;
        return (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            key={key}
            onPress={() => onSelect(item)}
            style={({ pressed }) => [styles.option, active && styles.optionActive, pressed && styles.optionPressed]}
          >
            {item.emoji || item.flag ? <Text style={styles.optionEmoji}>{item.emoji || item.flag}</Text> : null}
            <View style={styles.optionCopy}>
              <Text style={styles.optionLabel}>{item.label}</Text>
              {item.note ? <Text style={styles.optionNote}>{item.note}</Text> : null}
            </View>
            <View style={[styles.radio, active && styles.radioActive]}>{active ? <View style={styles.radioDot} /> : null}</View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.skyBottom, flex: 1 },
  safeArea: { flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', gap: 12, paddingHorizontal: spacing.lg, paddingVertical: 12 },
  backButton: { alignItems: 'center', height: 42, justifyContent: 'center', width: 34 },
  backText: { color: colors.text, fontFamily: fonts.bold, fontSize: 34, lineHeight: 36 },
  progressTrack: { backgroundColor: colors.border, borderRadius: radius.pill, flex: 1, height: 10, overflow: 'hidden' },
  progressFill: { backgroundColor: colors.primary, borderRadius: radius.pill, height: '100%' },
  stepCount: { color: colors.textLight, fontFamily: fonts.bold, fontSize: 12, fontVariant: ['tabular-nums'] },
  animatedContent: { flex: 1 },
  content: { gap: spacing.lg, paddingBottom: 24, paddingHorizontal: spacing.lg, paddingTop: 10 },
  intro: { alignItems: 'center', gap: spacing.md },
  introCopy: { alignItems: 'center', gap: 8 },
  eyebrow: { color: colors.accent, fontFamily: fonts.extraBold, fontSize: 12, letterSpacing: 1.4 },
  title: { color: colors.text, fontFamily: fonts.extraBold, fontSize: 28, lineHeight: 35, textAlign: 'center' },
  subtitle: { color: colors.textMuted, fontFamily: fonts.medium, fontSize: 14, lineHeight: 21, maxWidth: 340, textAlign: 'center' },
  nameInput: { backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: radius.lg, borderWidth: 2, color: colors.text, fontFamily: fonts.bold, fontSize: 19, minHeight: 62, paddingHorizontal: spacing.md },
  privacyNote: { color: colors.textLight, fontFamily: fonts.medium, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  optionList: { gap: 11 },
  option: { alignItems: 'center', backgroundColor: colors.surface, borderBottomColor: '#0B0908', borderBottomWidth: 4, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 2, flexDirection: 'row', gap: 13, minHeight: 66, padding: 14 },
  optionActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary, borderBottomColor: colors.primaryDark },
  optionPressed: { borderBottomWidth: 2, transform: [{ translateY: 2 }] },
  optionEmoji: { fontSize: 27, width: 36 },
  optionCopy: { flex: 1, gap: 3 },
  optionLabel: { color: colors.text, fontFamily: fonts.extraBold, fontSize: 16 },
  optionNote: { color: colors.textMuted, fontFamily: fonts.medium, fontSize: 12, lineHeight: 17 },
  radio: { alignItems: 'center', borderColor: colors.border, borderRadius: radius.pill, borderWidth: 2, height: 23, justifyContent: 'center', width: 23 },
  radioActive: { borderColor: colors.primary },
  radioDot: { backgroundColor: colors.primary, borderRadius: radius.pill, height: 11, width: 11 },
  footer: { backgroundColor: colors.skyBottom, borderTopColor: colors.border, borderTopWidth: 1, gap: 7, paddingBottom: spacing.md, paddingHorizontal: spacing.lg, paddingTop: 12 },
  saveNote: { color: colors.textLight, fontFamily: fonts.medium, fontSize: 10, textAlign: 'center' },
});
