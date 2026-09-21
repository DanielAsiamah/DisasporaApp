const test = require('node:test');
const assert = require('node:assert/strict');
const { createBrowserLessonPlayer } = require('../src/audio/browserLessonPlayer.cjs');
const { createLessonAudioController } = require('../src/audio/lessonAudioController.cjs');

test('interrupted browser playback reaches the controller error handler', async () => {
  const interruption = new Error('play interrupted by pause');
  const errors = [];
  let created = 0;
  const media = { pause() {}, load() {}, removeAttribute() {}, play: () => Promise.reject(interruption) };
  const player = createBrowserLessonPlayer({ createAudio: () => { created++; return media; }, resolveSource: (source) => source });
  const controller = createLessonAudioController({ player, resolveSfxSource: () => '/correct.mp3', onError: error => errors.push(error) });
  controller.dispatch({ event: 'answer-accepted', correct: false });
  controller.stop();
  await Promise.resolve();
  assert.deepEqual(errors, [interruption]);
  assert.equal(created, 1);
  assert.equal(media.playbackRate, 1);
  assert.equal(media.preservesPitch, true);
});

test('cleanup before playback creates no media and replacement reuses the player', () => {
  let created = 0;
  const media = { pause() {}, load() {}, removeAttribute() {} };
  const player = createBrowserLessonPlayer({ createAudio: () => { created++; return media; }, resolveSource: source => source.uri });
  player.replace(null);
  assert.equal(created, 0);
  player.replace({ uri: '/one.mp3' });
  player.replace({ uri: '/two.mp3' });
  assert.equal(created, 1);
  assert.equal(media.src, '/two.mp3');
});
