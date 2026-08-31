import { useAudioPlayer } from 'expo-audio';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing } from '../../theme';

export default function LessonAudioButton({
  source,
  label = 'Play audio',
  compact = false,
  fallbackText,
  onFallbackPress,
  onAudioPlay,
  autoPlay = false,
}) {
  // Always initialize with a valid fallback sound to prevent expo-audio crash on null
  const player = useAudioPlayer(source || require('../../../assets/sounds/correct.mp3'));
  const [showFallback, setShowFallback] = useState(false);

  // Dynamically swap the audio source when the prop changes
  useEffect(() => {
    if (source && typeof player.replace === 'function') {
      try {
        player.replace(source);
      } catch (e) {}
    }
  }, [source]);

  if (!source) return null;

  function play() {
    onAudioPlay?.();

    try {
      const seekResult = player.seekTo(0);
      if (seekResult?.then) {
        seekResult.then(() => player.play()).catch(() => {});
        return;
      }
      player.play();
    } catch {
      // Audio should never block the lesson if a device cannot play the file.
    }
  }

  useEffect(() => {
    if (autoPlay && source) {
      // Small timeout to allow replace() to finish loading
      const timer = setTimeout(() => play(), 100);
      return () => clearTimeout(timer);
    }
  }, [autoPlay, source]);

  return (
    <View style={styles.wrapper}>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        hitSlop={10}
        onPress={play}
        style={({ pressed }) => [
          styles.audioButton,
          compact && styles.audioButtonCompact,
          pressed && styles.audioButtonPressed,
        ]}
      >
        <Text style={[styles.soundIcon, compact && styles.soundIconCompact]}>🔊</Text>
      </Pressable>

      {fallbackText ? (
        <Pressable
          accessibilityLabel="Show text if you cannot listen right now"
          accessibilityRole="button"
          onPress={() => {
            if (onFallbackPress) {
              onFallbackPress(fallbackText);
              return;
            }
            setShowFallback((current) => !current);
          }}
          style={styles.fallbackToggle}
        >
          <Text style={styles.fallbackToggleText}>⌄</Text>
        </Pressable>
      ) : null}

      {!onFallbackPress && showFallback && fallbackText ? (
        <View style={styles.fallbackCard}>
          <Text style={styles.fallbackCaption}>Can't listen right now?</Text>
          <Text style={styles.fallbackText}>{fallbackText}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    position: 'relative',
  },
  audioButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(28, 176, 246, 0.14)',
    borderColor: 'rgba(28, 176, 246, 0.3)',
    borderRadius: radius.pill,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  audioButtonCompact: {
    minHeight: 36,
    paddingHorizontal: 10,
  },
  audioButtonPressed: {
    opacity: 0.65,
  },
  soundIcon: {
    fontSize: 22,
  },
  soundIconCompact: {
    fontSize: 18,
  },
  fallbackToggle: {
    alignItems: 'center',
    marginTop: -2,
    minHeight: 18,
    justifyContent: 'center',
    width: 36,
  },
  fallbackToggleText: {
    color: colors.blue,
    fontFamily: fonts.black,
    fontSize: 18,
    lineHeight: 18,
  },
  fallbackCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E1EEE8',
    borderRadius: radius.md,
    borderWidth: 1,
    left: 0,
    padding: spacing.sm,
    position: 'absolute',
    top: 62,
    width: 170,
    zIndex: 20,
  },
  fallbackCaption: {
    color: colors.textMuted,
    fontFamily: fonts.black,
    fontSize: 10,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  fallbackText: {
    color: '#102018',
    fontFamily: fonts.black,
    fontSize: 14,
    lineHeight: 19,
  },
});
