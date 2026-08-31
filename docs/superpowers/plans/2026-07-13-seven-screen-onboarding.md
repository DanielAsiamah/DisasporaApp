# Seven-Screen Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current guided onboarding with the approved seven-screen light UI and make completion durable and one-time per account.

**Architecture:** Move deterministic onboarding configuration and state rules into a small CommonJS model so the existing Node test runner can verify them without a React Native renderer. Keep the screen as the presentation layer, persist unfinished drafts with the repository’s existing AsyncStorage 2.2.0 dependency, and use Firestore `onboardingCompleted: true` as the durable route gate.

**Tech Stack:** Expo SDK 54, React Native 0.81, React 19.1, Reanimated 4.1, Expo Haptics, Expo Notifications, AsyncStorage 2.2, Firebase/Firestore, Node `node:test`.

## Global Constraints

- Keep this increment limited to onboarding and its existing Home handoff.
- Preserve all unrelated dirty-worktree changes.
- Use the six exact course choices grouped by English, French, and Arabic.
- Onboarding runs once per account; only `onboardingCompleted: true` skips it.
- Keep the existing account creation and sign-in surfaces.
- Do not add microphone, speech recognition, runtime text-to-speech, video calls, or new lesson content.
- Verify with Expo SDK 54 documentation and Expo Go-compatible APIs.

---

### Task 1: Testable onboarding model

**Files:**
- Create: `src/onboarding/onboardingModel.js`
- Create: `tests/onboardingFlow.test.cjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `ONBOARDING_STEPS`, `INITIAL_ONBOARDING_DRAFT`, `BASE_LANGUAGES`, `COURSES_BY_BASE_LANGUAGE`, `MOTIVATIONS`, `DAILY_GOALS`, `STARTING_LEVELS`, `getCoursesForBaseLanguage(baseLanguage)`, `selectBaseLanguage(draft, baseLanguage)`, `hydrateOnboardingDraft(localDraft, profileDraft)`, `completeOnboarding(draft)`, `canContinueOnboarding(step, draft)`, and `needsOnboarding(profile)`.

- [ ] **Step 1: Write the failing model tests**

  Add `tests/onboardingFlow.test.cjs` with assertions for the exact seven-step sequence, exact two-course lists, English fallback, incompatible-course replacement, safe hydration, 10-minute and 19:00 defaults, trimmed completion output, and `needsOnboarding` returning false only for `{ onboardingCompleted: true }`.

- [ ] **Step 2: Run the focused test and verify RED**

  Run: `node --test tests/onboardingFlow.test.cjs`

  Expected: FAIL because `../src/onboarding/onboardingModel` does not exist.

- [ ] **Step 3: Implement the pure model**

  Create `src/onboarding/onboardingModel.js` as CommonJS, centralize all option copy and defaults, sanitize unknown fields, and make base-language changes select the first valid course rather than carrying a stale course across languages.

- [ ] **Step 4: Add the focused npm script and verify GREEN**

  Add `"test:onboarding": "node --test tests/onboardingFlow.test.cjs"` to `package.json`, then run `npm run test:onboarding`.

  Expected: all onboarding model tests pass.

### Task 2: Seven-screen presentation

**Files:**
- Replace: `src/screens/GuidedOnboardingScreen.js`
- Consume: `src/onboarding/onboardingModel.js`
- Reuse: `assets/guides/amara.png`, `assets/guides/kai.png`, `assets/guides/sol.png`

**Interfaces:**
- Consumes: the model exports from Task 1 and existing `onComplete(completeDraft)` / `onBack()` props.
- Produces: the seven approved screens with persisted draft state and the unchanged completion callback contract.

- [ ] **Step 1: Replace embedded configuration with the tested model**

  Import model values using `require('../onboarding/onboardingModel')`; hydrate the draft with `hydrateOnboardingDraft`, persist only unfinished state to `diaspora:onboarding-draft:v1`, and use `canContinueOnboarding` for the footer button.

- [ ] **Step 2: Implement the approved light layout**

  Add an onboarding-local palette, safe-area header, progress bar, responsive ScrollView content, reusable option cards, blue primary button, and exact copy from the design spec. Use the native `Switch` on the ready screen for the fixed 7:00 PM reminder.

- [ ] **Step 3: Add original character art and restrained motion**

  Use Amara on screen 1, Kai on screen 4, Sol on screen 6, and the trio on screen 7. Add Reanimated 230 ms transitions and slow transform-only character breathing/float.

- [ ] **Step 4: Verify accessibility and compact iPhone layout**

  Give buttons and cards roles/states/labels, preserve keyboard-safe scrolling, and ensure the footer remains reachable on short portrait screens.

### Task 3: One-time route and reminder handoff

**Files:**
- Modify: `App.js`
- Consume: `src/onboarding/onboardingModel.js`
- Reuse: `src/services/reminderService.js`

**Interfaces:**
- Consumes: `needsOnboarding(profile)` and the complete draft from the screen.
- Produces: deterministic launch routing and reminder scheduling/cancellation at onboarding completion.

- [ ] **Step 1: Use the tested route predicate**

  Replace the `onboardingCompleted === false` check with `needsOnboarding(profile)`. A current course on a completed profile opens Home; a completed profile without a course opens course selection.

- [ ] **Step 2: Complete the authenticated handoff**

  After `syncProgress(draft)`, schedule the 19:00 reminder when enabled or cancel it when disabled, remove the draft, and open Home.

- [ ] **Step 3: Keep post-signup behavior aligned**

  Let a completed onboarding draft select and open its chosen course after account creation, while leaving normal login and sign-out behavior unchanged.

### Task 4: Regression and Expo verification

**Files:**
- Verify only; no planned production edits.

**Interfaces:**
- Produces: test and bundle evidence for the completed increment.

- [ ] **Step 1: Run focused and full tests**

  Run: `npm run test:onboarding`

  Run: `node --test tests/*.test.cjs`

  Expected: all tests pass with no failures.

- [ ] **Step 2: Validate Expo dependencies**

  Run: `npx expo-doctor`

  Expected: no dependency incompatibility caused by this change.

- [ ] **Step 3: Export the iOS bundle**

  Run: `npx expo export --platform ios --output-dir outputs/onboarding-ios`

  Expected: Metro completes and writes the iOS export without syntax or module errors.

- [ ] **Step 4: Manual Expo Go acceptance**

  Start with `npx expo start --tunnel`, scan with Expo Go on the iPhone, finish all seven screens, relaunch while signed in, and confirm the app opens Home. Sign out/in to the same account and confirm onboarding does not replay.
