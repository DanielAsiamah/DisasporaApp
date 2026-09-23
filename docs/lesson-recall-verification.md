# Lesson recall verification

Verified on 2026-09-23 using the local Firebase demo emulators and Expo web.

- Incorrect answers and mismatched pairs queue their exercise once for a final recall round.
- Recall preserves original exercise and reward IDs; confirmed XP is not awarded twice.
- Errors during recall use ordinary retry, without creating an endless review queue.
- A perfect lesson finishes without additional recall questions.
- Question changes return to the top; feedback scrolls into view. Recall omits the decorative scene to keep answers accessible on narrow screens.

Verification results:

- Node tests: 455 passed, one emulator-dependent test skipped, zero failures.
- iOS and web exports completed at `outputs/verify-recall-compact`.
- Full Patois chapter: nine topics, 58 base exercises and ten recall questions; 580 XP preserved after reload and sign-out/sign-in.
- Leaderboard opt-in and opt-out passed against local emulators.
- Browser checks confirmed red mismatches, the incorrect-answer sound, and Nunito loading.
- First-topic perfect-answer run completed without recall.

Run the chapter regression with `DIASPORA_TEST_FULL_CHAPTER=true npm run test:app:browser`.
Run the perfect-answer scenario with `DIASPORA_TEST_PERFECT=true npm run test:app:browser`.
The browser runner requires local emulators, Expo web, and Playwright/Chrome configured as described in its environment variables.

These checks are not an iPhone or Expo Go device test. Curriculum remains preview content pending native-speaker approval; this change does not publish courses or fill missing workbook translations.
