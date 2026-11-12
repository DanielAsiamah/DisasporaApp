# Diaspora Visual Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a coherent, friendly Diaspora UI and a polished refill-hearts experience without changing learning or persistence behavior.

**Architecture:** Extend the shared theme and font bootstrap, then migrate the shared button, heart display, refill modal, Learn shell, and lesson chrome. Keep interaction state in the existing contexts and use native `Animated`, Expo Haptics, and vector icons already compatible with Expo Go.

**Tech Stack:** React Native 0.88, Expo SDK 58, Expo Font, Expo Haptics, Expo Vector Icons, native Animated, Node test runner.

**Spec:** `docs/superpowers/specs/2026-11-11-diaspora-visual-refresh-design.md`

## Global Constraints

- Preserve heart and progress persistence contracts.
- Preserve reduced-motion and accessibility behavior.
- Do not touch the unrelated untracked `journalism/` directory.
- Keep Expo Go compatibility and avoid custom native animation dependencies.

## Review Focus

- Font download failure must still show the recovery UI and retry cleanly.
- Refill must remain usable with reduced motion and unavailable haptics.
- Embedded modal must remain inside the lesson modal on web and native.
- Compact phones must not clip actions or heart balances.
- Existing browser automation must still locate `Refill hearts` and heart accessibility labels.

---

### Task 1: Lock the visual contract

**Files:**
- Modify: `tests/friendlyLessonPresentation.test.cjs`
- Modify: `tests/motionAccessibilityContract.test.cjs`
- Modify: `tests/phoneShellVisualContract.test.cjs`

- [x] Add failing contracts for the new type system, vector hearts, refill haptics/reduced motion, and cloud removal.
- [x] Run focused tests and verify they fail for the missing design.
- [x] Commit with the implementation in the task that makes them green.

### Task 2: Build shared typography and controls

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `App.js`
- Modify: `src/theme.js`
- Modify: `src/components/PrimaryButton.js`
- Modify: `src/components/HeartsBar.js`
- Modify: `scripts/verify-font-recovery.cjs`
- Modify: `scripts/verify-local-core-loop.cjs`

- [x] Install and load Anton, DM Serif Display, and Inter through Expo Font.
- [x] Point shared font tokens and recovery checks at the three-role typography system.
- [x] Replace emoji hearts and generic beveled controls with vector, ink-and-paper components.
- [x] Run focused tests until green.

### Task 3: Rebuild the refill experience

**Files:**
- Modify: `src/components/OutOfHeartsModal.js`

- [x] Add a reduced-motion-aware entrance and heartbeat treatment.
- [x] Add haptic refill confirmation with a safe failure fallback.
- [x] Present current recovery timing and early-access refill clearly.
- [x] Run heart and motion tests until green.

### Task 4: Refresh Learn, Leaderboard, and lesson chrome

**Files:**
- Modify: `src/screens/MvpHomeScreen.js`
- Modify: `src/components/mvp/CourseRoadmap.js`
- Modify: `src/components/mvp/PatoisLessonModal.js`

- [x] Replace blue/cloud decoration with field-notebook surfaces and purposeful motifs.
- [x] Enlarge guides and simplify cards, progress, path nodes, tabs, and lesson header.
- [x] Preserve responsive and interaction contracts.
- [x] Run presentation and accessibility tests until green.

### Task 5: Verify and publish

**Files:**
- Modify only generated lockfile or verification evidence required by commands.

- [x] Run `node --test`.
- [x] Run `npm run content:validate`, `npm run images:audit`, and `npm run env:check`.
- [x] Run `npx tsc --noEmit` and `npx expo-doctor`.
- [x] Export iOS with Expo SDK 58.
- [ ] Commit, push `codex/implementation-plan`, fast-forward `main`, and verify both remote SHAs.
