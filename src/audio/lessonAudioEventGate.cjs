function createLessonAudioEventGate() {
  const claimed = new Map();

  function bucket(kind) {
    if (!claimed.has(kind)) claimed.set(kind, new Set());
    return claimed.get(kind);
  }

  function claim(kind, key) {
    if (!kind || !key) return false;
    const values = bucket(kind);
    if (values.has(key)) return false;
    values.add(key);
    return true;
  }

  function release(kind, key) {
    claimed.get(kind)?.delete(key);
  }

  function clear() {
    claimed.clear();
  }

  return Object.freeze({ claim, clear, release });
}

module.exports = { createLessonAudioEventGate };
