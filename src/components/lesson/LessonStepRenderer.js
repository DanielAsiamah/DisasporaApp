import { useEffect, useState } from 'react';
import { Image, ScrollView, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';

import RegionalGuide from '../RegionalGuide';
import { LESSON_STEP_TYPES } from '../../lessonEngine/lessonStepTypes';
import AudioPressable from './AudioPressable';
import LessonAudioButton from './LessonAudioButton';
import { colors } from '../../theme';

export default function LessonStepRenderer({
  step,
  styles,
  guideRegion,
  selectedChoice,
  setSelectedChoice,
  builtWords,
  setBuiltWords,
  typedAnswer,
  setTypedAnswer,
  feedback,
  audioHelperText,
  normaliseAnswer,
  lessonAudioSource,
  getAudioForText,
  getImageForKey,
  onAudioFallbackPress,
  onSubmitAnswer,
}) {
  const isChoiceStep = [
    LESSON_STEP_TYPES.AUDIO_LISTEN,
    LESSON_STEP_TYPES.IMAGE_CHOICE,
    LESSON_STEP_TYPES.MULTIPLE_CHOICE,
  ].includes(step.type);
  const isBuildStep = step.type === LESSON_STEP_TYPES.BUILD_SENTENCE;
  const isMatchStep = step.type === LESSON_STEP_TYPES.MATCH_PAIRS;
  const isTypeStep = step.type === LESSON_STEP_TYPES.TYPE_ANSWER;
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [matchedPairIds, setMatchedPairIds] = useState([]);

  useEffect(() => {
    setSelectedMatch(null);
    setMatchedPairIds([]);
  }, [step?.id]);

  useEffect(() => {
    if (isMatchStep && matchedPairIds.length === step.pairs?.length) {
      setSelectedChoice('__matched__');
    }
  }, [isMatchStep, matchedPairIds, setSelectedChoice, step?.pairs?.length]);

  if (!step) return null;

  function handleMatchPress(side, item) {
    if (feedback || matchedPairIds.includes(item.pairId)) return;
    Haptics.selectionAsync().catch(() => {});

    if (!selectedMatch || selectedMatch.side === side) {
      setSelectedMatch({ side, item });
      return;
    }

    if (selectedMatch.item.pairId === item.pairId) {
      setMatchedPairIds((current) => [...current, item.pairId]);
      setSelectedMatch(null);
      return;
    }

    setSelectedMatch({ side, item });
  }

  return (
    <ScrollView
      contentContainerStyle={styles.lessonContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Animated.View
        key={step.id}
        entering={FadeInDown.duration(280)}
        exiting={FadeOutUp.duration(160)}
      >
        <Text style={styles.lessonTitle}>{step.title}</Text>
        <View style={styles.lessonPromptRow}>
          <View style={styles.guidePromptRow}>
            <RegionalGuide region={guideRegion} size="small" />
            <View style={styles.speechCard}>
              {lessonAudioSource ? (
                <LessonAudioButton
                  key={`${step.id}-${step.audioKey}`}
                  label={step.audioLabel || `Play pronunciation for ${step.prompt}`}
                  source={lessonAudioSource}
                  fallbackText={step.prompt}
                  onFallbackPress={onAudioFallbackPress}
                  autoPlay
                />
              ) : null}
              <View style={styles.speechTextWrap}>
                <Text style={styles.phraseText}>{step.prompt}</Text>
                <Text style={styles.phraseHint}>
                  {isBuildStep
                    ? 'Tap the words in the correct order'
                    : isTypeStep
                      ? 'Type your answer below'
                      : 'Choose one answer'}
                </Text>
              </View>
            </View>
          </View>
          {audioHelperText ? (
            <View style={styles.audioHelperCard}>
              <Text style={styles.audioHelperTitle}>Can't listen right now?</Text>
              <Text style={styles.audioHelperBody}>{audioHelperText}</Text>
            </View>
          ) : null}
        </View>

      {isChoiceStep ? (
        <View style={step.imageChoices ? styles.imageChoiceGrid : styles.choiceList}>
          {(step.imageChoices || step.choices).map((choiceItem) => {
            const choice = typeof choiceItem === 'string' ? choiceItem : choiceItem.value;
            const imageSource = typeof choiceItem === 'string'
              ? null
              : getImageForKey?.(choiceItem.imageKey, choiceItem.category);
            const selected = selectedChoice === choice;
            const isCorrectAnswer = Boolean(feedback) && normaliseAnswer(choice) === normaliseAnswer(step.answer);
            const isWrongSelection = Boolean(feedback) && selected && !isCorrectAnswer;
            return (
              <AudioPressable
                key={choice}
                audioSource={getAudioForText?.(choice)}
                disabled={Boolean(feedback)}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setSelectedChoice(choice);
                }}
                style={[
                  step.imageChoices ? styles.imageChoiceCard : styles.answerCard,
                  selected && styles.answerCardSelected,
                  isCorrectAnswer && styles.answerCardCorrect,
                  isWrongSelection && styles.answerCardWrong,
                ]}
              >
                {imageSource ? (
                  <Image source={imageSource} style={styles.imageChoiceArt} resizeMode="contain" />
                ) : null}
                <Text style={styles.answerCardText}>{choice}</Text>
              </AudioPressable>
            );
          })}
        </View>
      ) : null}

      {isMatchStep ? (
        <View style={styles.matchPairsGrid}>
          <View style={styles.matchPairColumn}>
            {step.leftItems.map((item) => {
              const matched = matchedPairIds.includes(item.pairId);
              const selected = selectedMatch?.item?.id === item.id;
              return (
                <AudioPressable
                  key={item.id}
                  audioSource={getAudioForText?.(item.value)}
                  disabled={Boolean(feedback) || matched}
                  onPress={() => handleMatchPress('left', item)}
                  style={[
                    styles.matchPairCard,
                    selected && styles.answerCardSelected,
                    matched && styles.answerCardCorrect,
                  ]}
                >
                  <Text style={styles.matchPairText}>{item.value}</Text>
                </AudioPressable>
              );
            })}
          </View>
          <View style={styles.matchPairColumn}>
            {step.rightItems.map((item) => {
              const matched = matchedPairIds.includes(item.pairId);
              const selected = selectedMatch?.item?.id === item.id;
              return (
                <AudioPressable
                  key={item.id}
                  audioSource={getAudioForText?.(item.value)}
                  disabled={Boolean(feedback) || matched}
                  onPress={() => handleMatchPress('right', item)}
                  style={[
                    styles.matchPairCard,
                    selected && styles.answerCardSelected,
                    matched && styles.answerCardCorrect,
                  ]}
                >
                  <Text style={styles.matchPairText}>{item.value}</Text>
                </AudioPressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {isTypeStep ? (
        <View style={styles.typedAnswerArea}>
          <Text style={styles.typedAnswerLabel}>YOUR ANSWER</Text>
          <TextInput
            accessibilityLabel="Type your answer"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!feedback}
            onChangeText={setTypedAnswer}
            onSubmitEditing={() => {
              if (typedAnswer.trim() && !feedback) onSubmitAnswer?.();
            }}
            placeholder={step.placeholder || 'Type your answer'}
            placeholderTextColor={colors.textLight}
            returnKeyType="done"
            style={[
              styles.typedAnswerInput,
              feedback?.correct && styles.typedAnswerInputCorrect,
              feedback && !feedback.correct && styles.typedAnswerInputWrong,
            ]}
            value={typedAnswer}
          />
          <Text style={styles.typedAnswerHint}>Accents and capitalization are handled fairly.</Text>
        </View>
      ) : null}

      {isBuildStep ? (
        <View style={styles.buildArea}>
          <View style={styles.answerTray}>
            {builtWords.length === 0 ? (
              <Text style={styles.answerPlaceholder}>Tap words to build your answer</Text>
            ) : (
              builtWords.map((word, index) => (
                <AudioPressable
                  key={`${word}-${index}`}
                  audioSource={getAudioForText?.(word)}
                  disabled={Boolean(feedback)}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setBuiltWords((words) => words.filter((_, itemIndex) => itemIndex !== index));
                  }}
                  style={styles.wordChipSelected}
                >
                  <Text style={styles.wordChipText}>{word}</Text>
                </AudioPressable>
              ))
            )}
          </View>
          <View style={styles.wordBank}>
            {step.wordBank.map((word, index) => {
              const used = builtWords.includes(word);
              return (
                <AudioPressable
                  key={`${word}-${index}`}
                  audioSource={getAudioForText?.(word)}
                  disabled={used || Boolean(feedback)}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setBuiltWords((words) => [...words, word]);
                  }}
                  style={[styles.wordChip, used && styles.wordChipUsed]}
                >
                  <Text style={styles.wordChipText}>{word}</Text>
                </AudioPressable>
              );
            })}
          </View>
        </View>
        ) : null}
      </Animated.View>
    </ScrollView>
  );
}
