import {
  addAnswerToLessonSession,
  completeLessonSession,
  createLessonSession,
} from '../firestore/userService';

export async function createSession(uid, payload) {
  if (!uid) return null;
  return createLessonSession(uid, payload);
}

export async function recordAnswer(uid, sessionId, answer) {
  if (!uid || !sessionId) return;
  return addAnswerToLessonSession(uid, sessionId, answer);
}

export async function finishSession(uid, sessionId, payload) {
  if (!uid || !sessionId) return;
  return completeLessonSession(uid, sessionId, payload);
}
