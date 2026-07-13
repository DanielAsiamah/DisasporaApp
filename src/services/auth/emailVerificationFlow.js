const RESEND_COOLDOWN_SECONDS = 30;

function nextCooldown(seconds) {
  return Math.max(0, Number(seconds || 0) - 1);
}

function getResendLabel(seconds) {
  const remaining = Math.max(0, Number(seconds || 0));
  return remaining > 0
    ? `Resend available in ${remaining}s`
    : 'Resend verification email';
}

function shouldAutoCheck({ previousState, nextState, loadingAction }) {
  return previousState !== 'active' && nextState === 'active' && !loadingAction;
}

module.exports = {
  RESEND_COOLDOWN_SECONDS,
  getResendLabel,
  nextCooldown,
  shouldAutoCheck,
};
