const test = require('node:test');
const assert = require('node:assert/strict');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, writeBatch, arrayUnion, serverTimestamp, Timestamp } = require('firebase/firestore');
const { removeUndefined, buildAnswerRecord } = require('../src/services/firestore/firestorePayload.cjs');
const db = getFirestore(initializeApp({ projectId: 'demo-payload-tests' }, 'payload-tests'));

test('cleaning preserves Firestore timestamps and transforms while removing undefined fields', () => {
  const timestamp = Timestamp.fromMillis(1000);
  const transform = serverTimestamp();
  const result = removeUndefined({ missing: undefined, nested: { missing: undefined, text: 'hello' }, timestamp, transform });
  assert.deepEqual(result.nested, { text: 'hello' });
  assert.equal('missing' in result, false);
  assert.equal(result.timestamp, timestamp);
  assert.equal(result.transform, transform);
  assert.doesNotThrow(() => writeBatch(db).set(doc(db, 'users/a'), result));
});

test('answer records can be serialized inside a real Firestore arrayUnion', () => {
  const answeredAt = Timestamp.fromMillis(2000);
  const record = buildAnswerRecord({ answer: 'hello', optional: undefined }, answeredAt);
  assert.equal(record.answeredAt, answeredAt);
  assert.equal('optional' in record, false);
  assert.doesNotThrow(() => writeBatch(db).update(doc(db, 'users/a/lessonSessions/b'), {
    answers: arrayUnion(record), updatedAt: serverTimestamp(),
  }));
});
