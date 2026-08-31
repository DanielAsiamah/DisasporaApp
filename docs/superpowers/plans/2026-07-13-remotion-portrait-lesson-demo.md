# Diaspora Portrait Lesson Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render a portrait iPhone MP4 that demonstrates the approved Diaspora lesson flow and ends on the two-tab leaderboard experience.

**Architecture:** Keep the prototype isolated under `remotion-preview/` so it does not alter the Expo dependency graph or the user’s in-progress app files. A pure timeline-state module defines scene boundaries and is tested with Node’s built-in test runner; a Remotion composition consumes those states and renders all UI motion from frame values.

**Tech Stack:** React 19, TypeScript, Remotion, Node test runner, CSS-in-JS.

## Global Constraints

- Output is portrait `1080x1920`, `30fps`, approximately 18 seconds.
- Product scope is lessons and leaderboard only.
- No mascot, video call, native guide, subscription screen, camera control, or extra navigation tabs.
- Bottom navigation contains exactly `Lessons` and `Leaderboard` when visible.
- Use original human-character presentation and the approved deep-navy, cyan, white, and pale-blue visual system.
- Preserve the tap-word-to-answer-tray lesson interaction.
- Do not modify existing dirty files in the Expo app.

---

### Task 1: Isolated Remotion Preview and Timeline Contract

**Files:**
- Create: `remotion-preview/package.json`
- Create: `remotion-preview/tsconfig.json`
- Create: `remotion-preview/src/timeline.js`
- Create: `remotion-preview/tests/timeline.test.cjs`

**Interfaces:**
- Produces: `getDemoState(frame)` returning `{scene, progress, chipCount, correct, leaderboard}`.
- Consumes: fixed frame count at 30fps.

- [ ] **Step 1: Write failing timeline tests**

Test scene selection at frames `0`, `105`, `240`, `375`, and `510`; test chip counts during the sentence scene and the final leaderboard flag.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests/timeline.test.cjs`

Expected: FAIL because `src/timeline.js` does not exist.

- [ ] **Step 3: Implement the minimal timeline state module**

Create deterministic scene boundaries and chip-count thresholds with no browser dependencies.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `node --test tests/timeline.test.cjs`

Expected: all timeline tests pass.

### Task 2: Portrait Lesson Composition

**Files:**
- Create: `remotion-preview/src/index.ts`
- Create: `remotion-preview/src/Root.tsx`
- Create: `remotion-preview/src/DiasporaDemo.tsx`

**Interfaces:**
- Consumes: `getDemoState(frame)` from Task 1.
- Produces: Remotion composition id `DiasporaPortraitDemo`.

- [ ] **Step 1: Register the portrait composition**

Use `1080x1920`, `30fps`, and `540` frames.

- [ ] **Step 2: Build reusable phone UI components**

Create status bar, header/progress, lesson card, answer tray, word chip, success state, two-tab navigation, and leaderboard row components.

- [ ] **Step 3: Implement frame-driven motion**

Use inline `interpolate()` calls and transform shorthands for lesson-node press, scene slides, audio pulse, chips moving into the tray, correct-state expansion, XP count, confetti, and leaderboard highlight.

- [ ] **Step 4: Keep readable video-safe layout**

Maintain generous safe areas, one focal action per scene, large headings, and high contrast.

### Task 3: Render and Visual Verification

**Files:**
- Create: `remotion-preview/output/diaspora-portrait-lesson-demo.mp4`
- Create: `remotion-preview/output/check-home.png`
- Create: `remotion-preview/output/check-sentence.png`
- Create: `remotion-preview/output/check-leaderboard.png`

**Interfaces:**
- Consumes: `DiasporaPortraitDemo` composition.
- Produces: user-openable MP4 and representative QA stills.

- [ ] **Step 1: Render representative stills**

Run still renders at frames `45`, `330`, and `510`.

- [ ] **Step 2: Inspect each still**

Verify no overlap, clipping, mascot, video-call UI, extra tabs, or unreadable text.

- [ ] **Step 3: Render the MP4**

Run Remotion render using H.264 and the final composition dimensions.

- [ ] **Step 4: Verify artifacts and timeline tests**

Run the test suite again, confirm the MP4 exists and is non-empty, then report the exact openable path.

