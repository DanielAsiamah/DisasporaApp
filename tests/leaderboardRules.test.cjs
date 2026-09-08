const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { doc, setDoc, getDoc, deleteDoc, serverTimestamp } = require('firebase/firestore');

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
  } finally {
    await env.cleanup();
  }
});
