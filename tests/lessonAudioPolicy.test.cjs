const test = require('node:test');
const assert = require('node:assert/strict');

const { getLessonAudioAction } = require('../src/audio/lessonAudioPolicy.cjs');

test('only intentional lesson events may speak', () => {
  assert.deepEqual(getLessonAudioAction({ event: 'listening-step-enter', phraseId: 'good-afternoon' }), { type: 'play-phrase', phraseId: 'good-afternoon', rate: 1 });
  assert.deepEqual(getLessonAudioAction({ event: 'answer-accepted', correct: true, phraseId: 'good-afternoon' }), { type: 'play-phrase', phraseId: 'good-afternoon', rate: 1 });
  assert.deepEqual(getLessonAudioAction({ event: 'match-accepted', phraseId: 'good-afternoon' }), { type: 'play-phrase', phraseId: 'good-afternoon', rate: 1 });
  assert.deepEqual(getLessonAudioAction({ event: 'answer-accepted', correct: false }), { type: 'play-sfx', name: 'incorrect' });
});

test('ordinary taps, loading, and transitions remain silent', () => {
  for (const event of ['choice-tap', 'word-bank-tap', 'match-first-tap', 'loading', 'transition']) assert.deepEqual(getLessonAudioAction({ event }), { type: 'none' });
});

test('step changes, exits, and restarts stop the active player', () => {
  for (const event of ['step-change', 'lesson-exit', 'lesson-restart']) assert.deepEqual(getLessonAudioAction({ event }), { type: 'stop' });
});

test('manual playback supports normal and slow rates', () => {
  assert.deepEqual(getLessonAudioAction({ event: 'manual-play', phraseId: 'yes' }), { type: 'play-phrase', phraseId: 'yes', rate: 1 });
  assert.deepEqual(getLessonAudioAction({ event: 'manual-slow-play', phraseId: 'yes' }), { type: 'play-phrase', phraseId: 'yes', rate: 0.75 });
});
