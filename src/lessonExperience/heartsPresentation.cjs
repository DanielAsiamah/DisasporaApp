'use strict';

function normalizePositiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
}

function formatHeartCountdown(milliseconds) {
  const value = Number(milliseconds);
  if (!Number.isFinite(value) || value <= 0) return '';
  const totalSeconds = Math.ceil(value / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function buildHeartsPresentation({ hearts, maxHearts, timeUntilNextHeartMs } = {}) {
  const safeMaxHearts = normalizePositiveInteger(maxHearts, 5);
  const numericHearts = Number(hearts);
  const count = Number.isFinite(numericHearts)
    ? Math.max(0, Math.min(Math.floor(numericHearts), safeMaxHearts))
    : 0;
  const countdown = count < safeMaxHearts
    ? formatHeartCountdown(timeUntilNextHeartMs)
    : '';
  const recoveryLabel = countdown ? `Next heart in ${countdown}` : '';
  const accessibilityLabel = `${count} of ${safeMaxHearts} hearts remaining${
    recoveryLabel ? `. ${recoveryLabel}` : ''
  }`;

  return {
    accessibilityLabel,
    count,
    countLabel: String(count),
    maxHearts: safeMaxHearts,
    recoveryLabel,
  };
}

module.exports = { buildHeartsPresentation, formatHeartCountdown };
