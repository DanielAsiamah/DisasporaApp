import {
  collection,
  doc,
  addDoc,
  arrayUnion,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';

import { firebaseDb } from '../../firebase/app';
import { COLLECTIONS } from '../../firebase/collections';
import { MAX_HEARTS } from '../../theme';
const {
  filterCompletedProfileMergeFields,
  getEnsurePreferredName,
} = require('../../onboarding/authHandoff');
const {
  buildCorrectAnswerRewardId,
  buildCorrectAnswerRewardRecord,
  normalizeXp,
  planCorrectAnswerXpMutation,
} = require('../../lessonEngine/lessonXpReward.cjs');
const { filterUserProgressFields } = require('../../lessonEngine/userProgressPolicy.cjs');
const { removeUndefined, buildAnswerRecord } = require('./firestorePayload.cjs');

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
  const safeProfileFields = filterUserProgressFields(profileFields);
  const payload = removeUndefined({
    username,
    email,
    preferredName: profileFields.preferredName || username,
    xp: DEFAULT_USER_PROFILE.xp,
    streak: DEFAULT_USER_PROFILE.streak,
    hearts: DEFAULT_USER_PROFILE.hearts,
    currentCourse: DEFAULT_USER_PROFILE.currentCourse,
    currentLesson: DEFAULT_USER_PROFILE.currentLesson,
    ...safeProfileFields,
    xp: DEFAULT_USER_PROFILE.xp,
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
  const safeProfileFields = filterUserProgressFields(
    filterCompletedProfileMergeFields(existing, profileFields)
  );
  const payload = removeUndefined({
    ...safeProfileFields,
    preferredName: getEnsurePreferredName({
      existingProfile: existing,
      safeProfileFields,
      incomingUsername: username,
    }),
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

export async function updateUserProgress(uid, fields) {
  const payload = filterUserProgressFields(fields);

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

function xpRewardDocRef(uid, rewardId) {
  return doc(firebaseDb, COLLECTIONS.USERS, uid, 'xpRewards', rewardId);
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
  const { completedTopicIds, ...otherFields } = fields;
  const safeFields = Array.isArray(completedTopicIds) && completedTopicIds.length > 0
    ? { ...otherFields, completedTopicIds: arrayUnion(...completedTopicIds) }
    : otherFields;
  await setDoc(
    languageProgressDocRef(uid, languageId),
    {
      ...safeFields,
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
    // Firestore transforms cannot appear inside arrayUnion values.
    answers: arrayUnion(buildAnswerRecord(answer, Timestamp.now())),
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

export async function awardCorrectAnswerXpOnce(uid, rewardFields) {
  if (!uid) throw new Error('A signed-in learner is required to save XP.');

  const rewardId = buildCorrectAnswerRewardId(rewardFields);
  const rewardRecord = buildCorrectAnswerRewardRecord(rewardFields);
  const userRef = userDocRef(uid);
  const rewardRef = xpRewardDocRef(uid, rewardId);

  return runTransaction(firebaseDb, async (transaction) => {
    const [rewardSnapshot, userSnapshot] = await Promise.all([
      transaction.get(rewardRef),
      transaction.get(userRef),
    ]);
    if (!userSnapshot.exists()) {
      throw new Error('Your learner profile could not be found.');
    }

    const currentXp = normalizeXp(userSnapshot.data()?.xp);
    const rewardPlan = planCorrectAnswerXpMutation({
      currentXp,
      rewardExists: rewardSnapshot.exists(),
    });
    if (!rewardPlan.awarded) {
      return { ...rewardPlan, rewardId };
    }

    transaction.set(rewardRef, {
      ...rewardRecord,
      createdAt: serverTimestamp(),
      rewardId,
    });
    transaction.update(userRef, {
      lastActiveAt: serverTimestamp(),
      xp: rewardPlan.xp,
    });
    return { ...rewardPlan, rewardId };
  });
}

export async function touchUserLastActive(uid) {
  await setDoc(
    userDocRef(uid),
    { lastActiveAt: serverTimestamp() },
    { merge: true }
  );
}
