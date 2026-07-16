const test = require('node:test');
const assert = require('node:assert/strict');

const { createLessonAudioController } = require('../src/audio/lessonAudioController.cjs');

function createHarness() {
  const calls = [];
  const player = {
    pause() { calls.push(['pause']); },
    play() { calls.push(['play']); },
    replace(source) { calls.push(['replace', source]); },
    seekTo(seconds) { calls.push(['seekTo', seconds]); },
    set playbackRate(rate) { calls.push(['playbackRate', rate]); },
    set shouldCorrectPitch(value) { calls.push(['shouldCorrectPitch', value]); },
  };
  const controller = createLessonAudioController({
    player,
    resolvePhraseSource: (phraseId) => phraseId === 'approved' ? 'approved.mp3' : null,
    resolveSfxSource: (name) => name === 'incorrect' ? 'wrong.mp3' : null,
  });
  return { calls, controller };
}

test('ordinary lesson taps and transitions never touch the audio player', () => {
  const { calls, controller } = createHarness();
  for (const event of ['choice-tap', 'word-bank-tap', 'match-first-tap', 'loading', 'transition']) {
    assert.equal(controller.dispatch({ event }).status, 'silent');
  }
  assert.deepEqual(calls, []);
});

test('a phrase event stops the old source before replacing and playing once', () => {
  const { calls, controller } = createHarness();
  const result = controller.dispatch({ event: 'listening-step-enter', phraseId: 'approved' });

  assert.equal(result.status, 'playing');
  assert.deepEqual(calls, [
    ['pause'],
    ['replace', null],
    ['replace', 'approved.mp3'],
    ['playbackRate', 1],
    ['shouldCorrectPitch', true],
    ['play'],
  ]);
});

test('correct answers and accepted matches each play only their approved phrase', () => {
  const { calls, controller } = createHarness();
  controller.dispatch({ event: 'answer-accepted', correct: true, phraseId: 'approved' });
  controller.dispatch({ event: 'match-accepted', phraseId: 'approved' });

  assert.equal(calls.filter(([name]) => name === 'play').length, 2);
  assert.equal(calls.filter(([name]) => name === 'pause').length, 2);
  assert.equal(calls.filter(([name, value]) => name === 'replace' && value === 'approved.mp3').length, 2);
});

test('incorrect answers play only the incorrect sound effect', () => {
  const { calls, controller } = createHarness();
  controller.dispatch({ event: 'answer-accepted', correct: false, phraseId: 'approved' });

  assert.deepEqual(calls, [
    ['pause'],
    ['replace', null],
    ['replace', 'wrong.mp3'],
    ['playbackRate', 1],
    ['shouldCorrectPitch', true],
    ['play'],
  ]);
});

test('manual slow playback uses the supported 0.75 rate', () => {
  const { calls, controller } = createHarness();
  controller.dispatch({ event: 'manual-slow-play', phraseId: 'approved' });
  assert.ok(calls.some(([name, value]) => name === 'playbackRate' && value === 0.75));
});

test('step change, restart, exit, and explicit stop halt and rewind immediately', () => {
  for (const event of ['step-change', 'lesson-restart', 'lesson-exit']) {
    const { calls, controller } = createHarness();
    controller.dispatch({ event });
    assert.deepEqual(calls, [['pause'], ['replace', null]]);
  }

  const { calls, controller } = createHarness();
  controller.stop();
  assert.deepEqual(calls, [['pause'], ['replace', null]]);
});

test('unapproved or missing phrase files cannot play', () => {
  const { calls, controller } = createHarness();
  const result = controller.dispatch({ event: 'manual-play', phraseId: 'missing' });
  assert.equal(result.status, 'missing-source');
  assert.deepEqual(calls, []);
});
