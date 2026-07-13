export const HEART_REGEN_MS = 30 * 60 * 1000;

export function toMillis(value) {
  if (value == null) return null;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (value instanceof Date) return value.getTime();

  const milliseconds = Number(value);
  return Number.isFinite(milliseconds) ? milliseconds : null;
}

export function reconcileHearts(
  { hearts, nextHeartAt },
  now = Date.now(),
  maxHearts = 5,
  regenMs = HEART_REGEN_MS
) {
  const safeHearts = Math.max(0, Math.min(Number(hearts) || 0, maxHearts));
  const safeNow = toMillis(now) ?? Date.now();

  if (safeHearts >= maxHearts) {
    return { hearts: maxHearts, nextHeartAt: null, timeUntilNextHeartMs: 0 };
  }

  const deadline = toMillis(nextHeartAt) ?? safeNow + regenMs;
  if (deadline > safeNow) {
    return {
      hearts: safeHearts,
      nextHeartAt: deadline,
      timeUntilNextHeartMs: deadline - safeNow,
    };
  }

  const recovered = 1 + Math.floor((safeNow - deadline) / regenMs);
  const nextHearts = Math.min(maxHearts, safeHearts + recovered);
  const nextDeadline = nextHearts >= maxHearts ? null : deadline + recovered * regenMs;

  return {
    hearts: nextHearts,
    nextHeartAt: nextDeadline,
    timeUntilNextHeartMs: nextDeadline ? Math.max(nextDeadline - safeNow, 0) : 0,
  };
}

export function spendHeart(state, now = Date.now(), maxHearts = 5, regenMs = HEART_REGEN_MS) {
  const current = reconcileHearts(state, now, maxHearts, regenMs);
  if (current.hearts <= 0) return current;

  return reconcileHearts(
    {
      hearts: current.hearts - 1,
      nextHeartAt: current.nextHeartAt ?? (toMillis(now) ?? Date.now()) + regenMs,
    },
    now,
    maxHearts,
    regenMs
  );
}
