import { collection, deleteDoc, doc, limit, onSnapshot, orderBy, query, runTransaction, serverTimestamp } from 'firebase/firestore';
import { firebaseDb } from '../../firebase/app';
const { buildPublicEntry } = require('../../lessonEngine/liveLeaderboard.cjs');

function entryRef(uid) {
  if (!uid) throw new Error('Sign in to join the leaderboard.');
  return doc(firebaseDb, 'leaderboardEntries', uid);
}

export function subscribeLeaderboard(onRows, onError) {
  return onSnapshot(query(collection(firebaseDb, 'leaderboardEntries'), orderBy('xp', 'desc'), limit(50)),
    (snapshot) => onRows(snapshot.docs.map((entry) => ({ ...entry.data(), id: entry.id }))), onError);
}

export function subscribeLeaderboardMembership(uid, onMember, onError) {
  return onSnapshot(entryRef(uid), (snapshot) => onMember(snapshot.exists()), onError);
}

export async function syncLeaderboardEntry(uid, { join = false } = {}) {
  const ref = entryRef(uid);
  return runTransaction(firebaseDb, async (transaction) => {
    const existing = await transaction.get(ref);
    if (!join && !existing.exists()) return;
    const profile = await transaction.get(doc(firebaseDb, 'users', uid));
    if (!profile.exists()) throw new Error('Your saved profile is unavailable.');
    const entry = buildPublicEntry(profile.data());
    if (existing.exists() && existing.data().name === entry.name && existing.data().xp === entry.xp) return;
    transaction.set(ref, { ...entry, updatedAt: serverTimestamp() });
  });
}

export function leaveLeaderboard(uid) {
  return deleteDoc(entryRef(uid));
}
