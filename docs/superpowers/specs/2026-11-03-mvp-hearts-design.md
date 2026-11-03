# MVP Hearts Design

## Intent

Activate Diaspora's existing recoverable-heart system in the current Learn loop so mistakes have visible stakes without blocking early-access testing or introducing a paywall.

## Goals

- Show the learner's current hearts in the Learn header and lesson header.
- Spend exactly one heart for each wrong checked answer or rejected match attempt.
- Keep correct answers, retries after a wrong check, and lesson review from spending extra hearts unless the learner submits another wrong attempt.
- Show the existing out-of-hearts dialog when the balance reaches zero.
- Keep the existing free early-access refill and 30-minute recovery timer.
- Persist and reconcile hearts through the existing `GameProvider`, local storage, and authenticated profile sync.

## Non-Goals

- No purchase, subscription, advertisement, gem, or paywall flow.
- No schema change and no second hearts store.
- No change to XP rewards, topic completion, adaptive review, or release gates.
- No fabricated course content or pronunciation audio.

## Approach

Use the mounted `GameProvider` as the only source of truth. `MvpHomeScreen` reads it to display hearts and to open the existing out-of-hearts dialog. `PatoisLessonModal` receives the current balance and a loss callback, displays the balance, and calls the callback only from the same accepted wrong-attempt gates that already deduplicate sound and haptic events.

Alternatives considered were keeping hearts hidden (no learner-facing stakes) and creating lesson-local hearts (would drift from persisted profile state). Both were rejected.

## Accessibility And Safety

- Heart counts use text and an accessibility label, not color or icons alone.
- The out-of-hearts dialog remains dismissible and offers a free refill.
- Losing the last heart does not discard the current lesson, saved XP, or progress.
- A wrong match consumes one heart only when the pair rejection is accepted by the existing event gate.

