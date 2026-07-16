function getLessonAudioAction({ event, correct, phraseId } = {}) {
  if (['step-change', 'lesson-exit', 'lesson-restart'].includes(event)) return { type: 'stop' };
  if (event === 'answer-accepted' && !correct) return { type: 'play-sfx', name: 'incorrect' };
  if (event === 'manual-slow-play' && phraseId) return { type: 'play-phrase', phraseId, rate: 0.75 };
  if (['listening-step-enter', 'manual-play', 'match-accepted'].includes(event) && phraseId) return { type: 'play-phrase', phraseId, rate: 1 };
  if (event === 'answer-accepted' && correct && phraseId) return { type: 'play-phrase', phraseId, rate: 1 };
  return { type: 'none' };
}

module.exports = { getLessonAudioAction };
