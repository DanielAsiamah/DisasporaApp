const AUDIO_LISTEN_TYPE = 'audio_listen';

function withPlayableListeningSteps(steps, hasAudio) {
  const sourceSteps = Array.isArray(steps) ? steps : [];
  const canPlay = typeof hasAudio === 'function' ? hasAudio : () => false;

  return sourceSteps.filter((step) => (
    step?.type !== AUDIO_LISTEN_TYPE || canPlay(step.audioKey)
  ));
}

module.exports = {
  withPlayableListeningSteps,
};
