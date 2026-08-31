import { useAudioPlayer } from 'expo-audio';
import { useEffect } from 'react';
import { Pressable } from 'react-native';

export default function AudioPressable({
  audioSource,
  children,
  disabled,
  onAudioPlay,
  onPress,
  style,
  ...pressableProps
}) {
  // Always initialize with a valid fallback sound to prevent crash on null
  const player = useAudioPlayer(audioSource || require('../../../assets/sounds/correct.mp3'));

  // Dynamically swap the audio source when the prop changes
  useEffect(() => {
    if (audioSource && typeof player.replace === 'function') {
      try {
        player.replace(audioSource);
      } catch (e) {}
    }
  }, [audioSource]);

  function playAudio() {
    if (!audioSource) return;
    onAudioPlay?.();

    try {
      const seekResult = player.seekTo(0);
      if (seekResult?.then) {
        seekResult.then(() => player.play()).catch(() => {});
        return;
      }
      player.play();
    } catch {
      // Audio should never block a tap interaction.
    }
  }

  return (
    <Pressable
      {...pressableProps}
      disabled={disabled}
      onPress={(event) => {
        playAudio();
        onPress?.(event);
      }}
      style={style}
    >
      {children}
    </Pressable>
  );
}
