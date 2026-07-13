import {
  collection,
  doc,
  addDoc,
  arrayUnion,
  getDoc,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

import { firebaseDb } from '../../firebase/app';
import { COLLECTIONS } from '../../firebase/collections';
import { MAX_HEARTS } from '../../theme';

export const DEFAULT_USER_PROFILE = {
  xp: 0,
  streak: 0,
  hearts: MAX_HEARTS,
  currentCourse: null,
  currentLesson: null,
};

function userDocRef(uid) {
  return doc(firebaseDb, COLLECTIONS.USERS, uid);
}

export async function createUserDocument(uid, { username, email, ...profileFields }) {
  const payload = removeUndefined({
    username,
    email,
    preferredName: profileFields.preferredName || username,
    xp: DEFAULT_USER_PROFILE.xp,
    streak: DEFAULT_USER_PROFILE.streak,
    hearts: DEFAULT_USER_PROFILE.hearts,
    currentCourse: DEFAULT_USER_PROFILE.currentCourse,
    currentLesson: DEFAULT_USER_PROFILE.currentLesson,
    ...profileFields,
    joinedAt: serverTimestamp(),
  });

  await setDoc(userDocRef(uid), payload);
  return payload;
}

export async function ensureUserDocument(uid, { username, email, ...profileFields }) {
  const existing = await getUserDocument(uid);
  if (!existing) {
    return createUserDocument(uid, {
      username,
      email,
      ...profileFields,
      onboardingCompleted: profileFields.onboardingCompleted ?? false,
    });
  }
  const payload = removeUndefined({
    ...profileFields,
    preferredName: profileFields.preferredName || existing.preferredName || username,
    lastActiveAt: serverTimestamp(),
  });
  await setDoc(userDocRef(uid), payload, { merge: true });
  return { ...existing, ...payload };
}

export async function getUserDocument(uid) {
  const snapshot = await getDoc(userDocRef(uid));

  if (!snapshot.exists()) {
    return null;
  }

  return { id: snapshot.id, ...snapshot.data() };
}

export async function updateUserDocument(uid, fields) {
  await updateDoc(userDocRef(uid), fields);
}

export async function updateUserProgress(uid, fields) {
  const allowed = [
    'xp',
    'streak',
    'hearts',
    'nextHeartAt',
    'heartsUpdatedAt',
    'gems',
    'currentCourse',
    'currentLesson',
    'purchasedItems',
    'onboardingCompleted',
    'baseLanguage',
    'baseLanguageLevels',
    'selectedStartUnit',
    'recommendedStartUnit',
    'lastActiveAt',
    'preferredName',
    'guideRegion',
    'motivation',
    'dailyGoalMinutes',
    'proficiencyLevel',
    'reminderEnabled',
    'reminderTime',
    'emailVerified',
  ];
  const payload = Object.fromEntries(
    Object.entries(fields).filter(([key]) => allowed.includes(key))
  );

  if (Object.keys(payload).length === 0) {
    return;
  }

  await updateDoc(userDocRef(uid), payload);
}

function languageProgressDocRef(uid, languageId) {
  return doc(firebaseDb, COLLECTIONS.USERS, uid, 'progress', languageId);
}

function lessonSessionsCollectionRef(uid) {
  return collection(firebaseDb, COLLECTIONS.USERS, uid, 'lessonSessions');
}

function removeUndefined(value) {
  if (Array.isArray(value)) {
    return value.map(removeUndefined);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, removeUndefined(item)])
    );
  }

  return value;
}

export async function getLanguageProgress(uid, languageId) {
  const snapshot = await getDoc(languageProgressDocRef(uid, languageId));

  if (!snapshot.exists()) {
    return {
      completedLessons: [],
      openedChests: [],
      mistakes: [],
      currentLesson: null,
    };
  }

  return { id: snapshot.id, ...snapshot.data() };
}

export async function setLanguageProgress(uid, languageId, fields) {
  await setDoc(
    languageProgressDocRef(uid, languageId),
    {
      ...fields,
      languageId,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function createLessonSession(uid, fields) {
  const sessionRef = await addDoc(lessonSessionsCollectionRef(uid), {
    ...removeUndefined(fields),
    answers: fields.answers || [],
    createdAt: serverTimestamp(),
    startedAt: fields.startedAt || serverTimestamp(),
  });
  return sessionRef.id;
}

export async function addAnswerToLessonSession(uid, sessionId, answer) {
  if (!sessionId) return;

  await updateDoc(doc(firebaseDb, COLLECTIONS.USERS, uid, 'lessonSessions', sessionId), {
    answers: arrayUnion({
      ...removeUndefined(answer),
      answeredAt: serverTimestamp(),
    }),
    updatedAt: serverTimestamp(),
  });
}

export async function completeLessonSession(uid, sessionId, fields) {
  if (!sessionId) return;

  await updateDoc(doc(firebaseDb, COLLECTIONS.USERS, uid, 'lessonSessions', sessionId), {
    ...removeUndefined(fields),
    completedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function incrementUserXp(uid, xp) {
  if (!xp) return;

  await updateDoc(userDocRef(uid), {
    xp: increment(xp),
    lastActiveAt: serverTimestamp(),
  });
}

export async function touchUserLastActive(uid) {
  await setDoc(
    userDocRef(uid),
    { lastActiveAt: serverTimestamp() },
    { merge: true }
  );
}
