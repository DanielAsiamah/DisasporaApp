const assert = require('node:assert/strict');
const test = require('node:test');

let flow = {};
try {
  flow = require('../src/services/auth/emailVerificationFlow');
} catch (error) {
  if (error.code !== 'MODULE_NOT_FOUND') throw error;
}

test('resend cooldown counts down without becoming negative', () => {
  assert.equal(typeof flow.nextCooldown, 'function');
  assert.equal(flow.nextCooldown(30), 29);
  assert.equal(flow.nextCooldown(1), 0);
  assert.equal(flow.nextCooldown(0), 0);
});

test('resend label tells the learner when another email is available', () => {
  assert.equal(typeof flow.getResendLabel, 'function');
  assert.equal(flow.getResendLabel(30), 'Resend available in 30s');
  assert.equal(flow.getResendLabel(1), 'Resend available in 1s');
  assert.equal(flow.getResendLabel(0), 'Resend verification email');
});

test('returning to an active app triggers one automatic verification check', () => {
  assert.equal(typeof flow.shouldAutoCheck, 'function');
  assert.equal(flow.shouldAutoCheck({ previousState: 'background', nextState: 'active', loadingAction: null }), true);
  assert.equal(flow.shouldAutoCheck({ previousState: 'inactive', nextState: 'active', loadingAction: null }), true);
  assert.equal(flow.shouldAutoCheck({ previousState: 'active', nextState: 'active', loadingAction: null }), false);
  assert.equal(flow.shouldAutoCheck({ previousState: 'background', nextState: 'active', loadingAction: 'resend' }), false);
});
