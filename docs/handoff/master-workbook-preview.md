# Master Workbook Preview

The first four Igbo greeting lessons from the master workbook are now projected
into the existing lesson engine. This is a text-only developer draft,
not a published or native-reviewed language course.

## Sources

- Workbook: `content/source-intake/workbooks/diaspora_10000_content_master.xlsx`.
- Translation candidates: `content/master-preview/igbo-greetings.json`.
- Original user export: `content/source-intake/quizlet/raw/igbo-greetings-family-common-phrases.csv`.
- Harvard ELIAS reference evidence: `content/source-intake/research/igbo-harvard-greetings.json`.
- Nkowaokwu reference evidence: `content/source-intake/research/igbo-nkowaokwu-whats-up.json`.
- Generated runtime: `src/data/generatedMasterPreview.cjs`.

The manifest identifies exact workbook content IDs and original evidence. The
generator verifies source checksums, evidence IDs, source wording and workbook
English meanings. Igbo spellings and diacritics are retained from the evidence;
these checks establish traceability, not linguistic accuracy or native approval.
The informal goodbye qualifier and literal wording for "see you later" are
retained in vocabulary usage notes.

`npm run content:master:build` regenerates the runtime; `npm run
content:master:check` verifies that the checked-in artifact matches its inputs.
The original workbooks and the existing five starter courses are unchanged.

## Runtime

Run `npm run phone:preview`, then use **Change language > Igbo**. Both development
mode and the unreleased-course preview opt-in are required. Normal release
builds do not unlock this unfinished course. Selection remains session-local.

- `igbo_u01_l01`: Greetings 1, three source-backed expressions, seven exercises.
- `igbo_u01_l02`: Greetings 2, three source-backed expressions, seven exercises.
- `igbo_u01_l03`: Greetings 3, three source-backed expressions, six exercises.
- `igbo_u01_l04`: Greetings 4, three source-backed expressions, seven exercises.
- The remaining roadmap is planned, not a claim of playable content.

Lessons reuse choice, matching, target-language sentence building, English word
trays, wrong-answer feedback, mistake recall, human-guide animation and XP
deduplication. Account/course progress stores the original master lesson IDs.
No new database schema or production deployment is required.

Original Igbo guides Nneka and Chidi appear without borrowing another
language's vocabulary artwork. Pronunciation audio and dedicated Igbo vocabulary
artwork are not yet available. The developer preview explicitly discloses its
partial coverage and pending review. Human-guide animations and feedback sounds
still work.

## Verification (2026-10-29)

The full Node suite passed with 491 passes and one emulator-only skip; the
skipped Firestore rules test passed separately against the local emulator.
Master/canonical content checks, the roadmap check, image audit and environment
check passed. iOS export succeeded in `outputs/verify-master-20261029`.

The 2026-10-29 mobile-sized walkthrough completed the first two Igbo lessons with 140 XP,
including wrong answers, matching feedback sound, word trays, recall, guide
motion/reduced motion, roadmap launch, all six selectable drafts, account
reload/login, separate course progress and leaderboard opt-in/out. Patois also
passed its first-lesson regression walkthrough. No production Firebase requests
were made by these automated tests. Screenshots are under the ignored
`outputs/browser-smoke/` directory.

Physical iPhone/Expo Go testing remains outstanding. A successful iOS bundle
and reachable tunnel do not prove the installed phone client is compatible.

## November 2026 Expansion

Greetings 3 adds "see you later," "welcome," and "how are you" as a third
contiguous master-workbook lesson. "See you later" traces to the restored user
export; "welcome" and "how are you" trace to the Harvard ELIAS Igbo curriculum.
The local reference record stores only the short facts needed for deterministic
verification and retains the source URL. All three remain native-review drafts.

The 2026-11-02 browser walkthrough completed all three available Igbo lessons:
20 exercises, 200 saved XP, wrong-answer red/sound feedback, recall, reduced
motion, language-specific progress, reload/sign-in persistence and leaderboard
opt-in/out. The full Node suite passed with 491 passes and one emulator-only
skip, and the skipped Firestore rules test passed separately against the local
emulator. Content, roadmap, image and environment checks also passed.
The iOS export succeeded in `outputs/verify-igbo-three-20261102-final`; this is
bundle verification, not evidence of a physical iPhone test.

Greetings 4 completes the planned greeting chapter with "I am fine," "what's
up," and "nice to meet you." The restored user export supports the first and
third expressions. The second is hash-bound to Nkowaokwu's literal "What is
happening" gloss and remains explicitly pending native review for the workbook's
colloquial mapping.

The SDK 58 browser walkthrough completed all four lessons: 27 exercises, 270
saved XP, chapter completion, wrong-answer red/sound feedback, recall, reduced
motion, course-progress isolation, reload/sign-in persistence and leaderboard
opt-in/out. It made no production Firebase requests. The full Node suite passed
with 492 passes and one emulator-only skip; that rules test passed separately
against the active local Firestore emulator. Content, roadmap, image,
environment, TypeScript and Expo Doctor checks passed. The SDK 58 iOS export
succeeded in `outputs/verify-igbo-four-20261102`; physical iPhone testing remains
outstanding.
