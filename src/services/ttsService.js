/**
 * Live Text-to-Speech service for Diaspora
 * 3-tier fallback: ElevenLabs API → pre-generated audio → expo-speech
 *
 * Ported from the diaspora-dialect-learner web app's ttsService.ts,
 * adapted for React Native / Expo.
 */

import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { getLessonAudioSource } from '../data/generatedAudioRegistry';

// ─── Voice ID Resolution ────────────────────────────────────────────────────

const VOICE_MAP = {
  patois:    'D9xwB6HNBJ9h4YvQFWuE',
  jamaican:  'D9xwB6HNBJ9h4YvQFWuE',
  belizean:  'RRIjxt3K1iKEkfsLGRXU',
  aave:      'hIwJ1DsaSFzPZlLT2iLq',
  gullah:    'hIwJ1DsaSFzPZlLT2iLq',
  haitian:   'zPy2sgLU4pZ7Xrjh87uz',
  nouchi:    'zPy2sgLU4pZ7Xrjh87uz',
  sudanese:  'albaa6OioIhKtKdCEkQw',
  nubian:    'albaa6OioIhKtKdCEkQw',
  swahili:   'hIwJ1DsaSFzPZlLT2iLq',
  igbo:      'hIwJ1DsaSFzPZlLT2iLq',
  yoruba:    'hIwJ1DsaSFzPZlLT2iLq',
  wolof:     'hIwJ1DsaSFzPZlLT2iLq',
  hausa:     'hIwJ1DsaSFzPZlLT2iLq',
  twi:       'hIwJ1DsaSFzPZlLT2iLq',
  somali:    'hIwJ1DsaSFzPZlLT2iLq',
  amharic:   'albaa6OioIhKtKdCEkQw',
  oromo:     'albaa6OioIhKtKdCEkQw',
  lingala:   'hIwJ1DsaSFzPZlLT2iLq',
  zulu:      'hIwJ1DsaSFzPZlLT2iLq',
  xhosa:     'hIwJ1DsaSFzPZlLT2iLq',
  setswana:  'hIwJ1DsaSFzPZlLT2iLq',
  bambara:   'hIwJ1DsaSFzPZlLT2iLq',
  mandinka:  'hIwJ1DsaSFzPZlLT2iLq',
};

// expo-speech language codes per dialect
const SPEECH_LANG_MAP = {
  patois:    'en-JM',
  jamaican:  'en-JM',
  belizean:  'en-BZ',
  aave:      'en-US',
  gullah:    'en-US',
  haitian:   'fr-HT',
  nouchi:    'fr-FR',
  sudanese:  'ar-SA',
  nubian:    'ar-EG',
  swahili:   'sw-KE',
  igbo:      'en-NG',
  yoruba:    'en-NG',
  wolof:     'fr-SN',
  hausa:     'ha-NG',
  twi:       'en-GH',
  somali:    'so-SO',
  amharic:   'am-ET',
  oromo:     'om-ET',
  lingala:   'fr-CD',
  zulu:      'zu-ZA',
  xhosa:     'en-ZA',
  setswana:  'en-ZA',
  bambara:   'fr-ML',
  mandinka:  'fr-SN',
};

function getVoiceId(courseId) {
  const clean = (courseId || '').toLowerCase().replace(/^(en|fr|ar)-/, '');
  return VOICE_MAP[clean] || VOICE_MAP.patois;
}

function getSpeechLang(courseId) {
  const clean = (courseId || '').toLowerCase().replace(/^(en|fr|ar)-/, '');
  return SPEECH_LANG_MAP[clean] || 'en-US';
}

// ─── Active Player Management ───────────────────────────────────────────────

let activeSound = null;

async function stopActive() {
  if (activeSound) {
    try {
      await activeSound.stopAsync();
      await activeSound.unloadAsync();
    } catch (e) {}
    activeSound = null;
  }
  try {
    Speech.stop();
  } catch (e) {}
}

// ─── Tier 1: ElevenLabs Live API ────────────────────────────────────────────

async function speakWithElevenLabs(text, courseId) {
  const apiKey = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY;
  if (!apiKey) return false;

  const voiceId = getVoiceId(courseId);

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      console.warn(`ElevenLabs ${response.status}: ${(await response.text()).slice(0, 200)}`);
      return false;
    }

    // Convert response to a playable audio blob
    const arrayBuffer = await response.arrayBuffer();
    const base64 = uint8ToBase64(new Uint8Array(arrayBuffer));
    const uri = `data:audio/mpeg;base64,${base64}`;

    const { sound } = await Audio.Sound.createAsync({ uri });
    activeSound = sound;

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
        if (activeSound === sound) activeSound = null;
      }
    });

    await sound.playAsync();
    return true;
  } catch (error) {
    console.warn('ElevenLabs TTS failed:', error.message);
    return false;
  }
}

// ─── Tier 2: Pre-generated Audio Files ──────────────────────────────────────

async function speakWithLocalAudio(text, courseId) {
  const clean = (courseId || '').toLowerCase().replace(/^(en|fr|ar)-/, '');
  const slug = text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

  const source = getLessonAudioSource(clean, `${slug}.mp3`);
  if (!source) return false;

  try {
    const { sound } = await Audio.Sound.createAsync(source);
    activeSound = sound;

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
        if (activeSound === sound) activeSound = null;
      }
    });

    await sound.playAsync();
    return true;
  } catch (error) {
    console.warn('Local audio failed:', error.message);
    return false;
  }
}

// ─── Tier 3: Expo Speech (free fallback) ────────────────────────────────────

function speakWithExpoSpeech(text, courseId) {
  const language = getSpeechLang(courseId);
  return new Promise((resolve) => {
    Speech.speak(text, {
      language,
      rate: 0.85,
      pitch: 1.0,
      onDone: () => resolve(true),
      onError: () => resolve(false),
    });
  });
}

// ─── Main Export ────────────────────────────────────────────────────────────

/**
 * Speak text using the best available TTS engine.
 * Fallback chain: ElevenLabs → local pre-generated audio → expo-speech
 *
 * @param {string} text - The text to speak
 * @param {string} courseId - The course/language ID (e.g. 'patois', 'en-patois', 'swahili')
 * @param {object} [options] - Optional callbacks
 * @param {function} [options.onStart] - Called when audio starts playing
 * @param {function} [options.onEnd] - Called when audio finishes
 */
export async function speakText(text, courseId, options = {}) {
  if (!text || !text.trim()) return;

  await stopActive();

  const { onStart, onEnd } = options;

  try {
    if (onStart) onStart();

    // Tier 1: ElevenLabs live API
    const elevenLabsOk = await speakWithElevenLabs(text, courseId);
    if (elevenLabsOk) {
      if (onEnd) {
        // Wait for playback to finish
        const checkInterval = setInterval(() => {
          if (!activeSound) {
            clearInterval(checkInterval);
            onEnd();
          }
        }, 250);
      }
      return;
    }

    // Tier 2: Pre-generated local audio
    const localOk = await speakWithLocalAudio(text, courseId);
    if (localOk) {
      if (onEnd) {
        const checkInterval = setInterval(() => {
          if (!activeSound) {
            clearInterval(checkInterval);
            onEnd();
          }
        }, 250);
      }
      return;
    }

    // Tier 3: expo-speech fallback
    await speakWithExpoSpeech(text, courseId);
    if (onEnd) onEnd();
  } catch (error) {
    console.warn('All TTS tiers failed:', error.message);
    if (onEnd) onEnd();
  }
}

/**
 * Stop any currently playing audio
 */
export async function stopSpeaking() {
  await stopActive();
}

/**
 * Get voice ID for a given course (useful for debugging)
 */
export function getVoiceIdForCourse(courseId) {
  return getVoiceId(courseId);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function uint8ToBase64(uint8Array) {
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary);
}
