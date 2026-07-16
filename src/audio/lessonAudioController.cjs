const { getLessonAudioAction } = require('./lessonAudioPolicy.cjs');

function createLessonAudioController({
  player,
  resolvePhraseSource = () => null,
  resolveSfxSource = () => null,
  onError = () => {},
} = {}) {
  if (!player) throw new TypeError('A single Expo Audio player is required.');
  let playGeneration = 0;

  function invoke(method, ...args) {
    try {
      const result = player[method]?.(...args);
      if (result && typeof result.catch === 'function') result.catch(onError);
    } catch (error) {
      onError(error);
    }
  }

  function stop() {
    playGeneration += 1;
    invoke('pause');
    invoke('replace', null);
    return { status: 'stopped', generation: playGeneration };
  }

  function playSource(source, rate) {
    if (!source) return { status: 'missing-source', generation: playGeneration };
    stop();
    const generation = playGeneration;
    invoke('replace', source);
    try {
      player.playbackRate = rate;
      player.shouldCorrectPitch = true;
    } catch (error) {
      onError(error);
    }
    invoke('play');
    return { status: 'playing', generation };
  }

  function dispatch(event) {
    const action = getLessonAudioAction(event);
    if (action.type === 'none') return { status: 'silent', action };
    if (action.type === 'stop') return { ...stop(), action };
    if (action.type === 'play-phrase') {
      return { ...playSource(resolvePhraseSource(action.phraseId), action.rate), action };
    }
    if (action.type === 'play-sfx') {
      return { ...playSource(resolveSfxSource(action.name), 1), action };
    }
    return { status: 'silent', action };
  }

  return Object.freeze({ dispatch, stop });
}

module.exports = { createLessonAudioController };
