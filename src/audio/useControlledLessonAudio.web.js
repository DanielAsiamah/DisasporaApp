import { Asset } from 'expo-asset';
import { useEffect, useMemo } from 'react';
import { LESSON_SFX_REGISTRY, PATOIS_PRODUCTION_AUDIO_REGISTRY } from './patoisProductionAudioRegistry';

const { createBrowserLessonPlayer } = require('./browserLessonPlayer.cjs');
const { createLessonAudioController } = require('./lessonAudioController.cjs');

export function useControlledLessonAudio({
  phraseRegistry = PATOIS_PRODUCTION_AUDIO_REGISTRY,
  sfxRegistry = LESSON_SFX_REGISTRY,
} = {}) {
  const player = useMemo(() => createBrowserLessonPlayer({
    createAudio: () => new Audio(),
    resolveSource: (source) => Asset.fromModule(source).uri,
  }), []);
  const controller = useMemo(() => createLessonAudioController({
    player,
    resolvePhraseSource: (id) => phraseRegistry[id] || null,
    resolveSfxSource: (name) => sfxRegistry[name] || null,
    onError: () => {},
  }), [phraseRegistry, player, sfxRegistry]);
  useEffect(() => () => controller.stop(), [controller]);
  return controller;
}
