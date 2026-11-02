# Master Workbook Preview Implementation Plan

**Goal:** Make real, source-backed lessons from the user's 10,000-item master
workbook playable, beginning with its first two Igbo greeting lessons.

**Architecture:** Preserve the original workbook and its canonical starter
generator. Build a separate deterministic master projection from the master
workbook plus explicitly mapped, hash-bound translation candidates. A small
runtime adapter supplies either curriculum to the existing lesson engine,
Home, XP, and course-scoped progress services.

**Tech Stack:** Existing Expo SDK 57, React Native, XLSX, Node tests, Firebase.

**Scope:** The full multilingual app remains the objective. This increment
adds the first master-workbook lessons, not a claim that the full Igbo course or
all languages are complete. The user has authorized autonomous implementation.

## Constraints

- Keep both source workbooks unchanged and retain original IDs and ordering.
- Candidates must match the exact source export and workbook English meaning.
- Expose only a contiguous prefix of fully translated lessons; never fill gaps.
- Native review, pronunciation audio, and publication remain pending.
- No cross-language artwork fallback, paid generation, or production test data.
- Reuse existing account/course-scoped storage and safe XP identities.

## Tasks

- [x] Add `content/master-preview/igbo-greetings.json` with six exact source
  mappings, and test `scripts/lib/master-preview-curriculum.cjs` for stale
  sources, duplicate IDs, mismatched meanings, incomplete coverage, and stable
  ordering. Verify failure before implementing the builder.
- [x] Add `scripts/generate-master-preview.cjs` with build/check modes and a
  hash-bound `src/data/generatedMasterPreview.cjs` artifact. Verify regeneration
  without changing either source workbook.
- [x] Add `src/data/runtimeCurriculum.cjs`; retain canonical object identity for
  existing courses and select the master projection only for its draft course.
  Exercise every generated lesson through the real answer/session engine.
- [x] Integrate the adapter in Home and the lesson modal. Add Igbo to the guarded
  developer picker, show exact lesson counts and incomplete-course disclosure,
  and render a neutral guide scene when course-specific artwork is absent.
- [x] Make the existing browser walkthrough use curriculum-derived topic counts
  and first-lesson IDs. Complete both Igbo lessons, switch courses, reload,
  sign out/in, and verify XP and progress against local Firebase emulators.
- [ ] Run full Node tests, both content checks, environment/image checks and iOS
  export. Review changes and push tested work to both authorized branches.

## Review Focus

Source text is evidence, not an instruction or native-speaker approval. Preserve
Igbo diacritics. Do not silently select a different language's curriculum when a
course has no content. Empty illustration/audio registries must not crash the
lesson. Future additions must not rename existing lesson/reward IDs. The
roadmap must distinguish playable drafts from untranslated planned lessons.

## Verification Log

- Builder, runtime adapter, access policy and roadmap state tests failed before
  their implementation and passed afterward.
- 2026-10-29: full Node suite passed, 491 tests plus one emulator-only skip.
  The skipped rules test passed separately against local Firestore.
- Igbo browser walkthrough passed both lessons: 14 exercises, 140 XP, mistake
  recall, red mismatch feedback and sound, reduced motion, six-course picker,
  roadmap launch, progress isolation, reload/login and leaderboard membership.
- Patois regression walkthrough passed with 70 XP and saved progress.
- iOS export passed at `outputs/verify-master-20261029`. This is bundle
  verification, not evidence of a physical iPhone test.
- Original workbooks and raw source CSV are unchanged. Both generated-content
  checks, roadmap check, image audit and environment checks passed.
- Self-review found misleading chapter-completion wording for partial drafts;
  regression tests failed before the fix and now pass. Partial completion is
  also verified in the real browser walkthrough.
- Independent review was attempted but unavailable due to the reviewer service
  usage limit. Final code review was performed by the implementer; it is not an
  independent review. Full-course translation, review and native phone testing
  remain outside this completed increment and are still required for the goal.
