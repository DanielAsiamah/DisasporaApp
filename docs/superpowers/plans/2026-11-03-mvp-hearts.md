# MVP Hearts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Activate the existing persisted hearts engine in the phone-testable MVP Learn and lesson loop.

**Architecture:** Keep `GameProvider` as the sole state owner. Add pure presentation helpers for count and recovery copy, then wire the existing context into `MvpHomeScreen` and callbacks into `PatoisLessonModal` at the accepted wrong-attempt boundaries.

**Tech Stack:** React Native, Expo SDK 58, React context, Node test runner, Firebase profile sync.

**Spec:** `docs/superpowers/specs/2026-11-03-mvp-hearts-design.md`

## Global Constraints

- Use the existing five-heart, 30-minute recovery model.
- Keep refill free and include no monetization.
- Spend one heart per accepted wrong attempt.
- Preserve existing XP, progress, mistake review, audio, and accessibility behavior.
- Keep Expo Go compatibility.

## Review Focus

- Repeated rendering or duplicate event delivery must not spend a second heart for one attempt.
- A rejected match must spend once, while a selected-but-not-yet-rejected pair spends none.
- The fifth lost heart must show recovery UI without closing or resetting the lesson.
- Auth/profile refresh must not create a second source of heart state.
- Screen readers must receive a numeric count and recovery status.

---

### Task 1: Heart Presentation Model

**Files:**
- Create: `src/lessonExperience/heartsPresentation.cjs`
- Create: `tests/heartsPresentation.test.cjs`

**Interfaces:**
- Consumes: `{ hearts, maxHearts, timeUntilNextHeartMs }`
- Produces: `buildHeartsPresentation(input)` returning clamped count, numeric label, accessibility label, and recovery label.

- [ ] Write tests for full, partial, empty, invalid, and recovery-countdown states.
- [ ] Run tests and verify they fail because the module is missing.
- [ ] Implement the pure presentation model.
- [ ] Run focused tests and verify they pass.

### Task 2: Activate Hearts In The MVP Loop

**Files:**
- Modify: `src/screens/MvpHomeScreen.js`
- Modify: `src/components/mvp/PatoisLessonModal.js`
- Modify: `src/components/OutOfHeartsModal.js`
- Modify: `tests/lessonInteractionAccessibilityContract.test.cjs`
- Modify: `tests/phoneShellVisualContract.test.cjs`

**Interfaces:**
- Consumes: `useGame()` values `hearts`, `maxHearts`, `timeUntilNextHeartMs`, `loseHeart`, `refillHearts`, `showOutOfHearts`, `closeOutOfHearts`.
- Produces: visible numeric hearts in home and lesson headers; `onWrongAnswer` calls at accepted wrong-answer and rejected-match boundaries.

- [ ] Add source and accessibility contracts for the intended wiring.
- [ ] Run focused tests and verify they fail on missing MVP integration.
- [ ] Wire `useGame()` into home, modal props, headers, wrong-attempt callbacks, and the existing dialog.
- [ ] Run focused tests and TypeScript.

### Task 3: Runtime And Repository Verification

**Files:**
- Modify: `scripts/verify-local-core-loop.cjs`

**Interfaces:**
- Consumes: browser-accessible heart count and wrong-answer flow.
- Produces: proof that one wrong answer lowers the count once and the retry does not lower it again before a new wrong submission.

- [ ] Extend the local browser verifier with heart-count assertions.
- [ ] Run the browser journey against Firebase emulators.
- [ ] Run `node --test`, content and image gates, `npx expo-doctor`, TypeScript, and a fresh iOS export.
- [ ] Commit and push the verified change to `codex/implementation-plan` and `main`.

