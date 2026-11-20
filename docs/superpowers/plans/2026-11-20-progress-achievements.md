# Progress Achievements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add honest, accessible learner achievements to the existing Progress dashboard.

**Architecture:** Extend the pure progress presentation model to derive achievement records from existing persisted and curriculum-backed metrics, then render those records in the existing React Native Progress screen. No storage or service layer changes are required.

**Tech Stack:** Expo SDK 58, React Native, Node test runner, existing design tokens and `Animated` API.

**Spec:** `docs/superpowers/specs/2026-11-20-progress-achievements-design.md`

## Global Constraints

- Remain compatible with Expo Go and Expo SDK 58.
- Add no dependency or database schema.
- Never unlock an achievement while progress is loading.
- Use persisted XP/streak and curriculum-backed topic/word counts only.
- Respect reduced motion and expose explicit accessibility state.

## Review Focus

- Malformed or negative counts remain zero and cannot unlock badges.
- Loading never announces unlocked achievements.
- Exact threshold values unlock while one-less values remain locked.
- Course changes recompute achievements from that course's completed topics and vocabulary.
- Compact phone layouts wrap without horizontal overflow.

---

### Task 1: Achievement presentation model

**Files:**
- Modify: `src/lessonExperience/progressDashboardPresentation.cjs`
- Test: `tests/progressDashboardPresentation.test.cjs`

**Interfaces:**
- Consumes: existing normalized `completed`, `coveredWords`, `safeXp`, `safeStreak`, and `ready` values.
- Produces: `presentation.achievements: Array<{ id, label, detail, progressLabel, state, icon, accent }>`.

- [ ] **Step 1: Write failing model tests** for loading, malformed values, one-less boundaries, exact unlock thresholds, and complete states.
- [ ] **Step 2: Run `node --test tests/progressDashboardPresentation.test.cjs` and verify the new assertions fail because `achievements` is absent.**
- [ ] **Step 3: Implement the smallest pure achievement builder and include its output in `buildProgressDashboardViewModel`.**
- [ ] **Step 4: Re-run the focused test and verify it passes.**

### Task 2: Accessible achievement gallery

**Files:**
- Modify: `src/components/mvp/ProgressDashboard.js`
- Test: `tests/phoneShellVisualContract.test.cjs`

**Interfaces:**
- Consumes: `presentation.achievements` from Task 1.
- Produces: a two-column achievement gallery with accessible unlocked/locked progress labels and reduced-motion-safe entrance.

- [ ] **Step 1: Write a failing source contract test** requiring the achievement heading, list mapping, explicit accessibility label, locked state, and geometric badge treatment without trophy icons.
- [ ] **Step 2: Run the focused test and verify it fails because the gallery is absent.**
- [ ] **Step 3: Implement the gallery using existing fonts, colors, and the settled `entrance` animation value.**
- [ ] **Step 4: Run both focused test files and verify they pass.**
- [ ] **Step 5: Run `node --test`, content validation, image audit, and environment check.**
- [ ] **Step 6: Commit and push the verified commit to `main` and `codex/implementation-plan`.**

