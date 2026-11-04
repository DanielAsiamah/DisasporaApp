# Daily Streak Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist and present a lesson-completion streak across Expo Go sessions and signed-in devices.

**Architecture:** A pure streak model plans local-calendar changes and supports Firestore timestamps. `userService` applies it transactionally, `AuthContext` guards profile updates against account changes, and the MVP Learn shell triggers it at the existing lesson-completion boundary with retry UI.

**Tech Stack:** React Native, Expo SDK 58, Firebase Auth/Firestore, Node test runner.

**Spec:** `docs/superpowers/specs/2026-11-04-daily-streak-design.md`

## Global Constraints

- Update only on completed lessons, never on individual answers.
- Same-day completions are idempotent; next-day completion extends; longer gaps restart at one.
- Accept JavaScript dates, epoch milliseconds, ISO strings, and Firestore-style `toMillis()` timestamps.
- Never roll back XP or topic completion when streak persistence fails.
- Keep Expo Go compatibility and make no production network requests in browser verification.
- Do not fabricate missing target-language content.

## Review Focus

- Duplicate completion callbacks must not increment twice on one local day.
- A stale transaction result after sign-out/account switch must not update the visible profile.
- Firestore timestamps and invalid legacy values must not crash streak calculation.
- Failed streak writes must expose retry without blocking lesson completion.
- Reload and sign-in must preserve the backend streak value.

---

### Task 1: Pure Streak Model

**Files:**
- Create: `src/lessonEngine/streaks.cjs`
- Delete: `src/lessonEngine/streaks.js`
- Create: `tests/streaks.test.cjs`

**Interfaces:**
- Produces: `calculateStreakAfterCompletion(currentStreak, lastCompletedAt, completedAt, options)` returning `{ streak, status, freezeUsed? }`.
- Produces: `toStreakMillis(value)` for Date, numeric, ISO, and Firestore-style values.

- [ ] Write tests for first completion, same day, next day, missed days, invalid values, timezone-local calendar boundaries, and Firestore timestamps.
- [ ] Run `node --test tests/streaks.test.cjs` and verify failure before implementation.
- [ ] Implement the CommonJS model and remove the unused ES-module duplicate.
- [ ] Run the focused test and verify all cases pass.

### Task 2: Transactional Profile Persistence

**Files:**
- Modify: `src/services/firestore/userService.js`
- Modify: `src/context/AuthContext.js`
- Modify: `tests/lessonXpPersistenceContract.test.cjs`
- Create: `tests/streakPersistence.test.cjs`

**Interfaces:**
- Consumes: `calculateStreakAfterCompletion` from Task 1.
- Produces: `recordDailyLearningCompletion(uid)` returning the transaction result plus `completedAt`.
- Produces: `recordDailyLearning()` from `useAuth()` with auth-bound in-memory profile reconciliation.

- [ ] Write failing persistence/source contracts for transaction reads, same transaction updates, server activity timestamp, completion timestamp, and stale-account protection.
- [ ] Run focused tests and verify they fail on missing persistence integration.
- [ ] Implement the Firestore transaction and Auth context method; initialize `lastLessonCompletedAt` to `null` for new profiles.
- [ ] Run focused tests and TypeScript.

### Task 3: Learn-Screen Streak Experience

**Files:**
- Modify: `src/screens/mvpHomePresentation.cjs`
- Modify: `src/screens/MvpHomeScreen.js`
- Modify: `tests/mvpHomePresentation.test.cjs`
- Modify: `tests/phoneShellVisualContract.test.cjs`

**Interfaces:**
- Consumes: `profile.streak`, `profile.dailyGoalMinutes`, and `recordDailyLearning()`.
- Produces: `getStreakPresentation({ streak, dailyGoalMinutes })` with count, title, subtitle, and accessibility label.
- Produces: retryable streak-save state at the lesson-completion boundary.

- [ ] Write failing presentation and source contracts for zero/one/plural copy, bounded daily goal, completion wiring, failure notice, and retry.
- [ ] Run focused tests and verify expected failures.
- [ ] Implement the streak banner and non-blocking save/retry path while keeping chapter progress below it.
- [ ] Run focused tests and TypeScript.

### Task 4: Emulator And Repository Verification

**Files:**
- Modify: `scripts/verify-local-core-loop.cjs`
- Modify: `tests/phoneShellVisualContract.test.cjs`

**Interfaces:**
- Consumes: accessible streak banner and emulator-backed profile.
- Produces: browser proof that first completion starts streak 1 and reload/sign-in preserve it.

- [ ] Add a failing verifier contract for initial zero, completion one, reload one, and sign-in one.
- [ ] Extend the local browser journey and run it against Firebase emulators.
- [ ] Run the full test suite, content/image/env gates, TypeScript, Expo Doctor, and a fresh iOS export.
- [ ] Review, commit, and push the verified checkpoint to `codex/implementation-plan` and `main`.

