'use strict';

async function saveXpWithDeadline(save, {
  schedule = setTimeout,
  cancel = clearTimeout,
} = {}) {
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = schedule(() => reject(Object.assign(new Error('XP save has not been confirmed yet.'), {
      code: 'deadline-exceeded',
    })), 15000);
  });
  try {
    // A timeout cannot cancel a Firestore commit. Callers retry the same reward ID.
    const result = await Promise.race([Promise.resolve().then(save), deadline]);
    if (result?.currentAccount !== false && typeof result?.awarded !== 'boolean') {
      throw Object.assign(new Error('XP save returned no confirmation.'), { code: 'unavailable' });
    }
    return result;
  } finally {
    cancel(timer);
  }
}

module.exports = { saveXpWithDeadline };
