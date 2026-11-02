# Master Workbook Preview

The first two Igbo greeting lessons from the master workbook are now projected
into the existing lesson engine. This is a partial, text-only developer draft,
not a published or native-reviewed language course.

## Sources

- Workbook: `content/source-intake/workbooks/diaspora_10000_content_master.xlsx`.
- Translation candidates: `content/master-preview/igbo-greetings.json`.
- Original user export: `content/source-intake/quizlet/raw/igbo-greetings-family-common-phrases.csv`.
- Generated runtime: `src/data/generatedMasterPreview.cjs`.

The manifest identifies exact workbook content IDs and original prompt/response
pairs. The generator verifies the source checksum, source wording and workbook
English meaning. Igbo spellings and diacritics are retained from that export;
these checks establish traceability, not linguistic accuracy or native approval.
The informal goodbye qualifier is retained in the vocabulary usage note.

`npm run content:master:build` regenerates the runtime; `npm run
content:master:check` verifies that the checked-in artifact matches its inputs.
The original workbooks and the existing five starter courses are unchanged.

## Runtime

Run `npm run phone:preview`, then use **Change language > Igbo**. Both development
mode and the unreleased-course preview opt-in are required. Normal release
builds do not unlock this unfinished course. Selection remains session-local.

- `igbo_u01_l01`: Greetings 1, three source-backed expressions, seven exercises.
- `igbo_u01_l02`: Greetings 2, three source-backed expressions, seven exercises.
- Greetings 3 and 4 remain unavailable until complete source-backed translations
  are supplied. The full roadmap remains planned, not a claim of playable content.

Lessons reuse choice, matching, target-language sentence building, English word
trays, wrong-answer feedback, mistake recall, human-guide animation and XP
deduplication. Account/course progress stores the original master lesson IDs.
No new database schema or production deployment is required.

Original shared guides appear without borrowing another language's vocabulary
artwork. Pronunciation audio and dedicated Igbo vocabulary artwork are not yet
available. The developer preview explicitly discloses its partial coverage and
pending review. Human-guide animations and feedback sounds still work.

## Verification (2026-10-29)

The full Node suite passed with 491 passes and one emulator-only skip; the
skipped Firestore rules test passed separately against the local emulator.
Master/canonical content checks, the roadmap check, image audit and environment
check passed. iOS export succeeded in `outputs/verify-master-20261029`.

The mobile-sized browser walkthrough completed both Igbo lessons with 140 XP,
including wrong answers, matching feedback sound, word trays, recall, guide
motion/reduced motion, roadmap launch, all six selectable drafts, account
reload/login, separate course progress and leaderboard opt-in/out. Patois also
passed its first-lesson regression walkthrough. No production Firebase requests
were made by these automated tests. Screenshots are under the ignored
`outputs/browser-smoke/` directory.

Physical iPhone/Expo Go testing remains outstanding. A successful iOS bundle
and reachable tunnel do not prove the installed phone client is compatible.
