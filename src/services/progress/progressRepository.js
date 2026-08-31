import {
  getLanguageProgress,
  getUserDocument,
  incrementUserXp,
  setLanguageProgress,
  touchUserLastActive,
  updateUserProgress,
} from '../firestore/userService';

export async function getUserProfile(uid) {
  if (!uid) return null;
  return getUserDocument(uid);
}

export async function touchLastActive(uid) {
  if (!uid) return;
  return touchUserLastActive(uid);
}

export async function selectCourse(uid, languageId) {
  if (!uid || !languageId) return;
  return updateUserProgress(uid, {
    currentCourse: languageId,
    currentLesson: null,
  });
}

export async function updateProfileProgress(uid, fields) {
  if (!uid || !fields) return;
  return updateUserProgress(uid, fields);
}

export async function loadLanguageProgress(uid, languageId) {
  if (!uid || !languageId) return null;
  return getLanguageProgress(uid, languageId);
}

export async function updateLanguageProgress(uid, languageId, fields) {
  if (!uid || !languageId || !fields) return;
  return setLanguageProgress(uid, languageId, fields);
}

export async function awardXp(uid, amount) {
  if (!uid || !amount) return;
  return incrementUserXp(uid, amount);
}

export async function loseHeart(uid, currentHearts) {
  if (!uid || currentHearts == null) return;
  return updateUserProgress(uid, {
    hearts: Math.max(Number(currentHearts) - 1, 0),
  });
}

export async function completeLesson(uid, languageId, payload) {
  if (!uid || !languageId || !payload?.lessonId) return;

  const completedLessons = payload.completedLessons || [];
  const nextCompletedLessons = completedLessons.includes(payload.lessonId)
    ? completedLessons
    : [...completedLessons, payload.lessonId];

  await Promise.all([
    updateLanguageProgress(uid, languageId, {
      currentLesson: payload.nextLessonId || payload.lessonId,
      currentUnit: payload.unitId || null,
      completedLessons: nextCompletedLessons,
      lastCompletedLesson: payload.lessonId,
      accuracy: payload.accuracy ?? null,
    }),
    payload.xpEarned ? awardXp(uid, payload.xpEarned) : Promise.resolve(),
  ]);
}

export async function completeUnit(uid, languageId, payload) {
  if (!uid || !languageId || !payload?.unitId) return;

  return updateLanguageProgress(uid, languageId, {
    currentUnit: payload.nextUnitId || payload.unitId,
    lastCompletedUnit: payload.unitId,
  });
}
