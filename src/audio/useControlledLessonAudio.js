import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { useEffect, useMemo } from 'react';

import {
  LESSON_SFX_REGISTRY,
  PATOIS_PRODUCTION_AUDIO_REGISTRY,
} from './patoisProductionAudioRegistry';

const { createLessonAudioController } = require('./lessonAudioController.cjs');

export function useControlledLessonAudio({
  phraseRegistry = PATOIS_PRODUCTION_AUDIO_REGISTRY,
  sfxRegistry = LESSON_SFX_REGISTRY,
} = {}) {
  const player = useAudioPlayer(null);
  const controller = useMemo(() => createLessonAudioController({
    player,
    resolvePhraseSource: (phraseId) => phraseRegistry[phraseId] || null,
    resolveSfxSource: (name) => sfxRegistry[name] || null,
    onError: () => {},
  }), [phraseRegistry, player, sfxRegistry]);

  useEffect(() => {
    setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
    }).catch(() => {});
  }, []);

  useEffect(() => () => controller.stop(), [controller]);

  return controller;
}
