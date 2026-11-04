# Daily Streak Design

## Intent

Add the missing daily learning streak to the Expo Go MVP so the Learn loop has the motivating rhythm expected from an Airlearn/Duolingo-style app. A streak is earned by completing a lesson, persists with the learner profile, survives reload and sign-in, and is visible without displacing course progress.

## Product Rules

- A completed lesson starts a one-day streak when none exists.
- The first completion on the next local calendar day extends the streak by one.
- More completions on the same day do not increment it again.
- A gap longer than one day restarts the streak at one.
- Replaying or retrying a completed lesson is safe because the transaction is same-day idempotent.
- The onboarding `dailyGoalMinutes` value is shown as context, but this phase does not pretend to measure minutes that the app does not yet track.
- Topic completion and earned XP are never rolled back when streak persistence fails.

## Architecture

`GameProvider` continues to own hearts. Streak state stays on the authenticated user profile because it is cross-device account progress. A pure CommonJS streak model normalizes JavaScript dates and Firestore timestamps. `userService` applies that model inside a Firestore transaction and writes `streak`, `lastLessonCompletedAt`, and `lastActiveAt`. `AuthContext` rejects stale account results before updating the in-memory profile.

`MvpHomeScreen` calls the auth operation at the existing accepted lesson-completion boundary. It reports saving failures in the Learn screen with an idempotent retry action while allowing the lesson completion UI and topic progress to continue.

## Presentation

The existing large learning banner becomes a streak banner with the learner's flame count and configured daily goal. Real topic progress remains directly below in the chapter card and progress bar. Zero, one, and plural day copy is explicit and screen-reader friendly.

## Approaches Considered

1. **Firestore transaction on lesson completion (chosen).** Cross-device, same-day idempotent, and consistent with the existing XP ledger and profile architecture.
2. **Local-only streak.** Faster but fails the user's machine-transfer and multi-device requirements.
3. **Increment on every correct answer.** Immediate but rewards question count rather than daily learning and can overcount retries.

## Constraints And Non-goals

- No fake streak value, paywall, streak purchase, or notification redesign.
- No streak freeze in this phase; the existing dormant freeze branch remains unsupported until there is a real inventory model.
- No native-reviewed language content is fabricated to unlock Nobiin, Belizean Kriol, or AAVE.
- Firebase emulator browser verification must prove start, same-day idempotence, reload persistence, and sign-in persistence without production requests.

