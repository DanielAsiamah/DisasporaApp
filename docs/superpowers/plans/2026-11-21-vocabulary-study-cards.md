# Vocabulary Study Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Teach each mapped visual concept on an unscored vocabulary card immediately before its picture-choice quiz.

**Architecture:** Extend the pure lesson builder with an explicit vocabulary-card exercise and mark it unscored in the lesson session model. A small presentation model owns learner-facing card copy, while the existing modal renders the card and advances it without answer, XP, heart, accuracy, or mistake state.

**Tech Stack:** Node.js CommonJS models/tests, React Native, Expo SDK 58, existing controlled audio and static course image registries.

**Spec:** `docs/superpowers/specs/2026-11-21-vocabulary-study-cards-design.md`

## Global Constraints

- Use only current-course workbook vocabulary and statically registered artwork.
- Do not invent translations or activate unavailable courses.
- Vocabulary cards are unscored: no XP, heart loss, accuracy event, or mistake-review entry.
- Preserve Expo Go SDK 58 compatibility and all existing persistence contracts.
- Leave `journalism/` untouched.

## Review Focus

- A missing image must produce neither a vocabulary card nor a broken image-choice pair; Task 1 tests this.
- A card and its following quiz must reference the same source step and concept; Task 1 tests adjacency and identity.
- Missing pronunciation must omit its label instead of rendering blank UI; Task 2 tests presentation output.
- Advancing a card must not call answer evaluation or reward code; Task 2 tests the unscored session contract and verifier flow.
- Reduced-motion and narrow-phone layouts must remain usable; Task 2 covers contract attributes and the final browser/export checks.

---

### Task 1: Generate source-backed vocabulary cards

**Files:**
- Modify: `src/lessonEngine/patoisLessonSteps.cjs`
- Modify: `src/lessonEngine/patoisLessonSession.cjs`
- Test: `tests/patoisLessonSteps.test.cjs`
- Test: `tests/courseLessonSteps.test.cjs`
- Test: `tests/patoisLessonSession.test.cjs`

**Interfaces:**
- Produces: `LESSON_EXERCISE_TYPES.VOCABULARY_CARD` and `isUnscoredExercise(exercise)`.
- Produces: vocabulary-card objects with the exact fields defined by the spec.

- [ ] **Step 1: Write failing builder tests**

Assert that each image choice is immediately preceded by one same-concept
vocabulary card, shares its `sourceStepId`, and that image-disabled builds emit
no cards.

- [ ] **Step 2: Run the focused builder tests and verify RED**

Run: `node --test tests/patoisLessonSteps.test.cjs tests/courseLessonSteps.test.cjs`
Expected: FAIL because `VOCABULARY_CARD` and card steps do not exist.

- [ ] **Step 3: Write the failing unscored-session test**

Assert `isUnscoredExercise({ type: 'vocabulary-card' }) === true` and false for
every scored type.

- [ ] **Step 4: Run the session test and verify RED**

Run: `node --test tests/patoisLessonSession.test.cjs`
Expected: FAIL because `isUnscoredExercise` is not exported.

- [ ] **Step 5: Implement minimal builder and session behavior**

Create a card from the same row/concept used by each generated image choice and
return `[card, imageChoice]` in sequence. Add the type and pure unscored helper.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run: `node --test tests/patoisLessonSteps.test.cjs tests/courseLessonSteps.test.cjs tests/patoisLessonSession.test.cjs`
Expected: PASS.

- [ ] **Step 7: Commit**

Commit message: `Add source-backed vocabulary study steps`

### Task 2: Render and advance the study card

**Files:**
- Create: `src/lessonExperience/vocabularyCardPresentation.cjs`
- Modify: `src/components/mvp/PatoisLessonModal.js`
- Modify: `scripts/verify-local-core-loop.cjs`
- Test: `tests/vocabularyCardPresentation.test.cjs`
- Test: `tests/lessonImageChoiceVisualContract.test.cjs`

**Interfaces:**
- Consumes: vocabulary-card exercise fields and `isUnscoredExercise(exercise)`.
- Produces: `buildVocabularyCardPresentation(exercise)` returning `{ eyebrow,
  localized, meaningLabel, pronunciationLabel, accessibilityLabel }`.

- [ ] **Step 1: Write failing presentation tests**

Assert literal complete-card copy and omission of `pronunciationLabel` for blank
pronunciation. Expectations are hand-authored, not derived from the model.

- [ ] **Step 2: Run presentation tests and verify RED**

Run: `node --test tests/vocabularyCardPresentation.test.cjs`
Expected: FAIL because the model does not exist.

- [ ] **Step 3: Implement the pure presentation model**

Normalize learner-facing text, require localized/meaning values, and build one
concise accessibility label.

- [ ] **Step 4: Run presentation tests and verify GREEN**

Run: `node --test tests/vocabularyCardPresentation.test.cjs`
Expected: PASS.

- [ ] **Step 5: Write the failing modal/verifier contract test**

Require an accessible `VocabularyCardExercise`, an explicit unscored Continue
path, course-registry artwork, optional pronunciation, and controlled audio.

- [ ] **Step 6: Run the visual contract test and verify RED**

Run: `node --test tests/lessonImageChoiceVisualContract.test.cjs`
Expected: FAIL because the card component and unscored path do not exist.

- [ ] **Step 7: Implement the card UI and unscored Continue path**

Suppress duplicate quiz chrome, render the established cream/editorial card,
reuse `AudioControls`, and call `continueLesson` directly for unscored steps.
Update the local core-loop verifier to press the card's Continue action.

- [ ] **Step 8: Run focused tests and verify GREEN**

Run: `node --test tests/vocabularyCardPresentation.test.cjs tests/lessonImageChoiceVisualContract.test.cjs tests/patoisLessonSession.test.cjs`
Expected: PASS.

- [ ] **Step 9: Commit**

Commit message: `Teach visual words before picture quizzes`

### Task 3: Verify, review, publish, and refresh Expo Go

**Files:**
- Modify only if verification exposes a tested defect.

**Interfaces:**
- Consumes: Tasks 1-2 completed commits.
- Produces: verified GitHub refs and a fresh SDK 58 Expo Go tunnel.

- [ ] **Step 1: Run the full verification matrix**

Run `node --test`, `npm run content:validate`, `npm run images:audit`,
`npm run env:check`, `npx expo-doctor`, and an SDK 58 iOS export.

- [ ] **Step 2: Request independent whole-change review**

Fix Critical/Important findings with a failing regression test first; record
minor findings explicitly.

- [ ] **Step 3: Push both authorized branches**

Fast-forward `main` and `codex/implementation-plan` without force.

- [ ] **Step 4: Refresh and verify Expo Go**

Keep the existing preview if its live process picks up the update; otherwise
start one fresh tunnel. Verify an HTTP 200 manifest with runtime
`exposdk:58.0.0` before sharing it.
