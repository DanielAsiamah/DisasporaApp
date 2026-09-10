const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { doc, setDoc, getDoc, deleteDoc, updateDoc, runTransaction, arrayUnion, Timestamp, serverTimestamp } = require('firebase/firestore');

test('leaderboard rules enforce ownership, field privacy and saved XP', {
  skip: !process.env.FIRESTORE_EMULATOR_HOST && 'Run with the Firestore emulator',
}, async () => {
  const env = await initializeTestEnvironment({
    projectId: 'demo-diaspora-rules',
    firestore: { rules: fs.readFileSync(path.join(__dirname, '../firestore.rules'), 'utf8') },
  });
  try {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users/alice'), { xp: 20, email: 'private@example.com' });
    });
    const alice = env.authenticatedContext('alice').firestore();
    const bob = env.authenticatedContext('bob').firestore();
    const guest = env.unauthenticatedContext().firestore();
    const entry = { name: 'Alice', xp: 20, updatedAt: serverTimestamp() };
    await assertSucceeds(setDoc(doc(alice, 'leaderboardEntries/alice'), entry));
    await assertSucceeds(getDoc(doc(bob, 'leaderboardEntries/alice')));
    await assertFails(getDoc(doc(guest, 'leaderboardEntries/alice')));
    await assertFails(getDoc(doc(bob, 'users/alice')));
    await assertFails(setDoc(doc(bob, 'leaderboardEntries/alice'), entry));
    await assertFails(setDoc(doc(alice, 'leaderboardEntries/alice'), { ...entry, email: 'private@example.com' }));
    await assertFails(setDoc(doc(alice, 'leaderboardEntries/alice'), { ...entry, xp: 999 }));
    await assertFails(deleteDoc(doc(bob, 'leaderboardEntries/alice')));
    await assertSucceeds(deleteDoc(doc(alice, 'leaderboardEntries/alice')));

    const legacySession = doc(alice, 'users/alice/sessions/legacy');
    await assertSucceeds(setDoc(legacySession, { answers: [] }));
    await assertFails(updateDoc(legacySession, { answers: ['changed'] }));
    await assertFails(deleteDoc(legacySession));

    const lessonSession = doc(alice, 'users/alice/lessonSessions/current');
    await assertSucceeds(setDoc(lessonSession, { answers: [], createdAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(lessonSession, {
      answers: arrayUnion({ answer: 'hello', answeredAt: Timestamp.now() }),
      completedAt: serverTimestamp(),
    }));
    await assertFails(getDoc(doc(bob, 'users/alice/lessonSessions/current')));

    const reward = doc(alice, 'users/alice/xpRewards/answer-1');
    await assertSucceeds(runTransaction(alice, async (transaction) => {
      const existingReward = await transaction.get(reward);
      const profileRef = doc(alice, 'users/alice');
      const profile = await transaction.get(profileRef);
      if (!existingReward.exists()) {
        transaction.set(reward, { rewardId: 'answer-1', createdAt: serverTimestamp() });
        transaction.update(profileRef, { xp: profile.data().xp + 10 });
      }
    }));
    await assertFails(updateDoc(reward, { rewardId: 'changed' }));
    await assertFails(deleteDoc(reward));
    await assertFails(setDoc(doc(alice, 'users/alice/unrecognized/data'), { value: true }));
  } finally {
    await env.cleanup();
  }
});
