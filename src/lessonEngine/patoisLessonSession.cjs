function normalizeAnswer(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,!?;:…]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function createExerciseResponse(exercise = {}) {
  if (exercise.type === 'match-pairs') {
    return { selectedMatch: null, matchedPairIds: [] };
  }
  if (exercise.type === 'sentence-build' || exercise.type === 'word-tray') {
    return { builtWords: [] };
  }
  return { selectedChoice: null };
}

function selectMatchItem(response, item) {
  const current = {
    selectedMatch: response?.selectedMatch || null,
    matchedPairIds: [...(response?.matchedPairIds || [])],
  };
  if (!item || current.matchedPairIds.includes(item.pairId)) {
    return { response: current, status: 'ignored' };
  }
  if (!current.selectedMatch || current.selectedMatch.side === item.side) {
    return { response: { ...current, selectedMatch: item }, status: 'selected' };
  }
  if (current.selectedMatch.pairId !== item.pairId) {
    return { response: { ...current, selectedMatch: null }, status: 'mismatch' };
  }
  return {
    response: {
      selectedMatch: null,
      matchedPairIds: [...new Set([...current.matchedPairIds, item.pairId])],
    },
    status: 'matched',
    matchedPairId: item.pairId,
  };
}

function toggleWordBankItem(response, item) {
  const builtWords = [...(response?.builtWords || [])];
  const existingIndex = builtWords.findIndex(({ index }) => index === item.index);
  if (existingIndex >= 0) builtWords.splice(existingIndex, 1);
  else builtWords.push({ index: item.index, value: item.value });
  return { ...response, builtWords };
}

function isResponseReady(exercise, response) {
  if (!exercise || !response) return false;
  if (exercise.type === 'match-pairs') {
    return response.matchedPairIds.length === exercise.pairs.length;
  }
  if (exercise.type === 'sentence-build' || exercise.type === 'word-tray') {
    return response.builtWords.length > 0;
  }
  return Boolean(response.selectedChoice);
}

function evaluateExerciseResponse(exercise, response = {}) {
  if (!exercise) return false;
  if (exercise.type === 'match-pairs') {
    const expected = new Set((exercise.pairs || []).map(({ conceptId }) => conceptId));
    const matched = new Set(response.matchedPairIds || []);
    return expected.size > 0 && expected.size === matched.size && [...expected].every((id) => matched.has(id));
  }
  if (exercise.type === 'sentence-build' || exercise.type === 'word-tray') {
    const answer = (response.builtWords || []).map(({ value }) => value).join(' ');
    return normalizeAnswer(answer) === normalizeAnswer(exercise.answer);
  }
  return normalizeAnswer(response.selectedChoice) === normalizeAnswer(exercise.answer);
}

module.exports = {
  createExerciseResponse,
  evaluateExerciseResponse,
  isResponseReady,
  normalizeAnswer,
  selectMatchItem,
  toggleWordBankItem,
};
