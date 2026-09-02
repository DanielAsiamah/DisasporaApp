# Diaspora Production Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Continue the old desktop Diaspora work on this MacBook by making the cloned Expo app verified, runnable, and ready for focused production-readiness fixes.

**Architecture:** The app is an Expo SDK 54 React Native application with Firebase-backed auth/profile/progress services and workbook-generated course runtime data. The safest path is to preserve the current `main` branch behavior, use existing contract tests as guardrails, and fix one verified issue at a time across onboarding, auth, lessons, XP, leaderboard, and restart flows.

**Tech Stack:** Expo SDK 54, React 19, React Native 0.81, Firebase 12, Node test runner, Metro, EAS configuration.

**Spec:** `docs/handoff/2026-08-31-machine-transfer.md`

## Current MacBook Verification Status

- Verified on branch `codex/implementation-plan` on 2026-09-02.
- `npm ci` completed on the MacBook clone.
- `.env` exists locally, but Firebase and Google OAuth values are still placeholders. The app now rejects placeholder public env values instead of treating them as configured. Replace them with fresh client values from Firebase Console before real auth or physical-device verification.
- `npm run env:check` safely reports whether required public Expo config values are missing/placeholders without printing secret values.
- `node --test` passed with 380 tests and 0 failures on 2026-09-02.
- `npm run content:validate` passed with `"status": "valid"` and 0 generated-artifact drift on 2026-09-02.
- `npm run images:audit` passed with 39/39 Jamaican Patois canonical PNGs audited and 0 failures on 2026-09-02.
- `npx expo export --platform ios --output-dir outputs/verify-transfer` produced `outputs/verify-transfer/metadata.json` on 2026-09-02 after the env-readiness guard was added.
- `npm run phone:verification:scaffold` creates an ignored local report under `outputs/phone-verification/` with current branch, commit, command, URL, and export metadata so the physical-device walkthrough can be captured without committing secrets.
- `npx expo start --lan --clear` is running locally, and `http://localhost:8081` returns the Diaspora web shell.
- Remote push is pending GitHub authentication. Local `git push -u origin codex/implementation-plan` failed because HTTPS credentials are not configured, and the Codex GitHub connector is read-only for this repo write path.
- A current portable Git bundle backup is maintained at `/Users/danielblackman/Downloads/Diaspora-Transfer-Backups/disaspora-implementation-plan-2026-09-01-current.bundle`. Verify its exact branch head with `git bundle verify` and `git bundle list-heads`; it requires base commit `ba034c4d931c2cf0cec71f6f15255b8cd68b0d04`.
- Phone verification should be captured with `docs/handoff/phone-verification-template.md` after real Firebase/Google client values are configured.
- Onboarding/auth audit: focused onboarding and email-verification tests pass; inspected `App.js`, `AuthContext`, `authHandoff`, `GuidedOnboardingScreen`, and `AccountChoiceScreen`; no stale account routing defect was found. A credential-readiness defect was fixed so placeholder public env values do not enable Google/Firebase paths.
- Lesson/progress/XP audit: focused and named persistence tests pass; inspected `MvpHomeScreen`, `PatoisLessonModal`, `lessonEngine`, and `userService`; no unsafe UID/course/reward persistence defect was found.
- Leaderboard/restart audit: focused leaderboard tests pass; leaderboard derives from active `profile` state, and lesson state remounts by account/course storage key; no stale current-user/restart defect was found.

## Global Constraints

- Read the exact Expo SDK 54 docs at `https://docs.expo.dev/versions/v54.0.0/` before editing Expo/runtime code.
- Work from `main` in `/Users/danielblackman/Downloads/DisasporaApp`.
- Do not copy old `.env`, service account files, or compromised ElevenLabs keys from the previous machine.
- Keep paid ElevenLabs generation disabled until rotated credentials, native wording approval, voice approval, and explicit spend approval all exist.
- Do not mark unreleased courses as published without their own 39-row content, 39-image art, voice/audio, and persistence gates.
- Preserve the current MVP shape: onboarding, auth, Learn, Leaderboard, workbook-backed lessons, XP, and restart.

---

### Task 1: Finish MacBook Runtime Setup

**Files:**
- Modify: `.env`
- Read: `.env.example`
- Verify: `src/firebase/config.js`

**Interfaces:**
- Consumes: Firebase web app config from Firebase Console.
- Produces: Local Expo runtime configuration through `EXPO_PUBLIC_FIREBASE_*` and Google OAuth env vars.

- [ ] **Step 1: Replace placeholder Firebase values**

Status: blocked on fresh Firebase Console / Google OAuth client values. The local `.env` file exists, but still contains placeholders and must not be filled from old-machine secrets. Placeholder values now fail closed through `src/config/publicEnv.cjs`.

Check readiness without printing secret values:

```bash
npm run env:check
```

Expected before credentials are filled: nonzero exit with placeholder variable names only. Expected after credentials are filled: zero exit.

Set `.env` to real client values from Firebase Console:

```bash
EXPO_PUBLIC_FIREBASE_API_KEY=<firebase_web_api_key>
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=diasporaapp.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=diasporaapp
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=diasporaapp.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<firebase_sender_id>
EXPO_PUBLIC_FIREBASE_APP_ID=<firebase_web_app_id>
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<google_web_client_id>.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<google_ios_client_id>.apps.googleusercontent.com
```

- [x] **Step 2: Run baseline contracts**

Run:

```bash
node --test
npm run content:validate
npm run images:audit
```

Expected: `node --test` passes all tests, content validator reports `"status": "valid"`, image audit reports `Failures: 0`.

Latest result: `node --test` passes 380 tests with 0 failures.

- [x] **Step 3: Verify Expo export**

Status: latest export regenerated `outputs/verify-transfer/metadata.json` on 2026-09-02. Real Firebase/Google env values are still required for auth and physical-device verification.

Run:

```bash
npx expo export --platform ios --output-dir outputs/verify-transfer
```

Expected: iOS bundle and `outputs/verify-transfer/metadata.json` are produced.

- [ ] **Step 4: Commit only if tracked setup docs changed**

Status: completed. Setup, verification, and transfer evidence docs have been committed on `codex/implementation-plan`. The local `.env` remains uncommitted and must stay that way.

Do not commit `.env`. If setup docs are improved later, commit those docs only:

```bash
git add docs/handoff/2026-08-31-machine-transfer.md
git commit -m "docs: clarify MacBook Diaspora setup"
```

### Task 2: Audit Onboarding and Auth Flow

**Files:**
- Read: `App.js`
- Read: `src/context/AuthContext.js`
- Read: `src/screens/GuidedOnboardingScreen.js`
- Read: `src/screens/AccountChoiceScreen.js`
- Test: `tests/onboardingFlow.test.cjs`
- Test: `tests/onboardingRouting.test.cjs`
- Test: `tests/emailVerificationFlow.test.cjs`

**Interfaces:**
- Consumes: Auth state from `AuthContext`.
- Produces: A prioritized list of concrete defects with file paths, reproduction steps, and test coverage gaps.

- [x] **Step 1: Run focused auth/onboarding tests**

Run:

```bash
npm run test:onboarding
npm run test:verification
```

Expected: all focused onboarding and verification tests pass before auditing behavior.

- [x] **Step 2: Manually inspect data flow**

Trace this path in code:

```text
AccountChoiceScreen -> AuthContext social/email methods -> authHandoff gate -> GuidedOnboardingScreen -> route decision in App.js
```

Record any issue where a stale user/profile result could route the learner into the wrong screen.

- [x] **Step 3: If a bug is found, write the failing test first**

Status: no stale user/profile routing bug was found, so no new failing regression was added.

Add the smallest failing case to the matching existing test file. Example shape for an auth race:

```js
test('a superseded profile response cannot route the next account into onboarding', async () => {
  const gate = createProfileLoadGate();
  const first = gate.beginExclusive('account-a');
  const second = gate.beginExclusive('account-b');

  assert.equal(gate.isCurrent(first), false);
  assert.equal(gate.isCurrent(second), true);
});
```

- [x] **Step 4: Implement the minimal fix**

Status: not applicable because the audit did not identify a concrete defect.

Patch only the stale-state boundary that failed the test, usually in `src/context/AuthContext.js` or `src/onboarding/authHandoff.js`.

- [x] **Step 5: Verify and commit**

Status: verification completed; no app/test commit was made because no code fix was required.

Run:

```bash
npm run test:onboarding
npm run test:verification
node --test
```

Commit:

```bash
git add src tests
git commit -m "fix: harden onboarding auth handoff"
```

### Task 3: Audit Lesson, Progress, and XP Persistence

**Files:**
- Read: `src/screens/MvpHomeScreen.js`
- Read: `src/lessonEngine`
- Read: `src/services/firestore/userService.js`
- Test: `tests/mvpProgressPersistence.test.cjs`
- Test: `tests/topicProgress.test.cjs`
- Test: `tests/lessonXpReward.test.cjs`
- Test: `tests/userProgressPolicy.test.cjs`
- Test: `tests/lessonXpPersistenceContract.test.cjs`

**Interfaces:**
- Consumes: lesson completion events, topic progress, and Firebase user IDs.
- Produces: Verified persistence behavior where local and remote progress remain account-bound and monotonic.

- [x] **Step 1: Run focused persistence tests**

Run:

```bash
npm run test:lesson-xp
```

Expected: all lesson XP and persistence contracts pass before code inspection.

- [x] **Step 2: Inspect completion flow**

Trace this path:

```text
lesson answer -> topic completion -> XP reward -> local profile update -> Firestore progress write -> leaderboard source
```

Flag any write that can occur without a stable `uid`, `courseId`, `topicId`, or reward identity.

- [x] **Step 3: Add regression test for the highest-risk persistence issue**

Status: the highest-risk cases described by the plan already exist in `tests/mvpProgressPersistence.test.cjs` and `tests/lessonXpPersistenceContract.test.cjs`, including failed remote reads, stale account snapshots, UID/course storage keys, and one-time XP rewards.

Use the existing Node test style. Example shape:

```js
test('a failed remote topic read cannot enable a stale progress write', async () => {
  const result = planProgressSyncAfterRemoteFailure({
    uid: 'user-a',
    courseId: 'jamaican-patois',
    remoteReadStatus: 'failed',
  });

  assert.equal(result.canWriteRemoteProgress, false);
});
```

- [x] **Step 4: Implement the smallest persistence fix**

Status: not applicable because the inspected contracts already pass and no unsafe persistence defect was found.

Patch the function that owns the failed contract. Keep writes fail-closed and avoid broad rewrites of `MvpHomeScreen.js`.

- [x] **Step 5: Verify and commit**

Status: verification completed; no app/test commit was made because no code fix was required.

Run:

```bash
npm run test:lesson-xp
npm run content:validate
node --test
```

Commit:

```bash
git add src tests
git commit -m "fix: protect lesson progress persistence"
```

### Task 4: Audit Leaderboard and Restart UX

**Files:**
- Read: `src/screens/MvpHomeScreen.js`
- Read: `src/screens/LeaderboardScreen.js`
- Read: `src/services/firestore/userService.js`
- Test: `tests/leaderboardRanking.test.cjs`
- Test: `tests/mvpHomePresentation.test.cjs`
- Test: `tests/phoneShellVisualContract.test.cjs`

**Interfaces:**
- Consumes: profile XP, course progress, and current-user identity.
- Produces: A verified leaderboard and restart path that never displays stale account state.

- [x] **Step 1: Run focused leaderboard tests**

Run:

```bash
npm run test:leaderboard
```

Expected: all leaderboard and home presentation tests pass.

- [x] **Step 2: Inspect current-user ranking**

Check that leaderboard rows derive user identity from the active auth/profile state, not from stale guest or previous-account local data.

- [x] **Step 3: Inspect restart behavior**

Trace the restart path and confirm it clears or remounts lesson state without deleting unrelated account progress.

- [x] **Step 4: Add a regression test if stale state is possible**

Status: no stale current-user or restart-state defect was found. Existing tests cover stable current-user identity, rank rendering, lesson remount by storage key, and completion-card next-topic flow.

Example shape:

```js
test('restart remounts the lesson attempt without lowering saved XP', () => {
  const state = planLessonRestart({
    savedXp: 120,
    currentAttemptXp: 10,
  });

  assert.equal(state.nextSavedXp, 120);
  assert.equal(state.remountLesson, true);
});
```

- [x] **Step 5: Verify and commit**

Status: verification completed; no app/test commit was made because no code fix was required.

Run:

```bash
npm run test:leaderboard
node --test
```

Commit:

```bash
git add src tests
git commit -m "fix: stabilize leaderboard restart flow"
```

### Task 5: Physical Device and Expo Runtime Verification

**Files:**
- Read: `app.json`
- Read: `eas.json`
- Generate: `outputs/verify-transfer`

**Interfaces:**
- Consumes: local `.env`, Expo dev server, Expo Go or matching development build.
- Produces: MacBook evidence that the app launches and key MVP flows run on a phone.

- [x] **Step 1: Start Expo**

Run:

```bash
npx expo start --lan --clear
```

Expected: Metro shows a QR code and `Web is waiting on http://localhost:8081`.

- [ ] **Step 2: Open on device**

Status: pending physical iPhone access with a compatible Expo Go/development build and real auth configuration. Use `npm run phone:verification:scaffold -- --device="<device>" --ios-version="<ios-version>" --tester="<name>"` to create the ignored local report, then record the walkthrough results there.

Use the QR code with a compatible Expo Go/development build for SDK 54. Confirm these screens load:

```text
Welcome -> Account choice -> Onboarding -> Learn -> Lesson modal -> Completion -> Leaderboard
```

- [x] **Step 3: Record runtime issues**

Status: no local web-shell startup issue has been observed. Phone-only runtime issues remain unknown until Step 2 is performed.

For each issue, capture:

```text
screen:
action:
expected:
actual:
terminal log excerpt:
```

- [x] **Step 4: Fix only reproducible runtime issues**

Status: no reproducible runtime issue has been captured yet.

For each issue, add a focused contract test first, implement the smallest fix, then rerun the affected focused suite and `node --test`.

- [x] **Step 5: Commit each verified runtime fix**

Status: no runtime-fix commit was needed because no reproducible runtime defect has been captured.

Commit each independent fix:

```bash
git add src tests
git commit -m "fix: resolve <specific-runtime-issue>"
```

## Self-Review

- Spec coverage: The plan covers the handoff resume order: clone/setup, tests, content validation, image audit, iOS export, Expo start, production-readiness audit, and one verified fix per slice.
- Placeholder scan: The plan avoids TBD-style implementation gaps. Sensitive Firebase values are intentionally represented as secrets because they must come from Firebase Console and must not be committed.
- Type consistency: The plan uses existing script names from `package.json` and existing files from the cloned repo.
