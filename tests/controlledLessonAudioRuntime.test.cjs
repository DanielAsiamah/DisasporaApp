const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

test('the mobile lesson runtime owns exactly one lifecycle-managed Expo Audio player', () => {
  const source = fs.readFileSync(path.join(root, 'src/audio/useControlledLessonAudio.js'), 'utf8');
  assert.equal((source.match(/useAudioPlayer\s*\(/g) || []).length, 1);
  assert.match(source, /useAudioPlayer\s*\(\s*null/);
  assert.match(source, /createLessonAudioController/);
  assert.match(source, /controller\.stop\(\)/);
  assert.match(source, /setAudioModeAsync/);
  assert.match(source, /allowsRecording:\s*false/);
  assert.match(source, /playsInSilentMode:\s*true/);
  assert.doesNotMatch(source, /fetch\s*\(|axios|ELEVENLABS|elevenlabs|https?:\/\//i);
});

test('Expo Audio is configured as playback-only with microphone permissions disabled', () => {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
  const plugin = config.expo.plugins.find((entry) => Array.isArray(entry) && entry[0] === 'expo-audio');
  assert.deepEqual(plugin, ['expo-audio', {
    microphonePermission: false,
    recordAudioAndroid: false,
  }]);
});

test('production lessons expose only approved static phrase assets and the incorrect SFX', () => {
  const source = fs.readFileSync(path.join(root, 'src/audio/patoisProductionAudioRegistry.js'), 'utf8');
  assert.match(source, /PATOIS_PRODUCTION_AUDIO_REGISTRY/);
  assert.match(source, /incorrect:\s*require\([^\n]+wrong\.mp3/);
  assert.doesNotMatch(source, /assets\/audio\/patois\//);
  assert.doesNotMatch(source, /https?:\/\//i);
  assert.doesNotMatch(source, /ELEVENLABS|elevenlabs/i);
});

test('the lesson modal dispatches every intentional audio lifecycle event', () => {
  const source = fs.readFileSync(path.join(root, 'src/components/mvp/PatoisLessonModal.js'), 'utf8');
  for (const event of [
    'listening-step-enter',
    'answer-accepted',
    'match-accepted',
    'manual-play',
    'manual-slow-play',
    'step-change',
    'lesson-restart',
    'lesson-exit',
  ]) {
    assert.match(source, new RegExp(`event:\\s*['\"]${event}['\"]`), `missing ${event}`);
  }
  assert.match(source, /useControlledLessonAudio/);
  assert.doesNotMatch(source, /AudioPressable|LessonAudioButton/);
});
