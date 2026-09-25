# Lesson exit confirmation

Unfinished lessons now ask before closing. Keep learning preserves the response,
feedback, lesson index, and reward identity. Leave lesson uses the existing close
path: the unfinished topic stays incomplete and reopening starts a fresh attempt.
Confirmed XP is not removed. Pending and failed XP saves have explicit notices.
Finished lessons continue to close without a confirmation.

The confirmation replaces the interactive lesson surface rather than leaving
answer controls behind an overlay. The native modal back action dismisses the
confirmation instead of abandoning the lesson. Its content scrolls on short
screens and the primary action is Keep learning.

Browser validation also exposed that the installed React Native Web did not map
`accessibilityState.checked` to the radio's DOM state. Answer choices now include
`aria-checked`, supported by both React Native and React Native Web. The browser
test verifies the selected answer before and after cancelling exit.

## Verification (2026-09-25)

- The new browser assertion failed against the old immediate-close behavior.
- Selection survives cancelling exit; confirming exit before answering leaves
  zero completed topics and zero XP; reopening resets the selected answer.
- Cancelling exit during correct-answer feedback retains the feedback.
- Deliberately leaving after the first correct answer preserves 10 saved XP
  after reload while keeping the topic incomplete.
- The normal Patois browser flow finishes with 70 XP and preserves progress on
  reload and sign-out/sign-in; leaderboard opt-in/out passes.
- Node tests: 458 passed, one skipped, zero failures.
- iOS/web exports: `outputs/verify-lesson-exit-final`.
- Phone-width confirmation screenshot inspected at 390 x 844.

Use `DIASPORA_TEST_EXIT_AFTER_XP=true npm run test:app:browser` for the dedicated
earned-XP exit scenario. It intentionally stops after verifying the exit and
reload, rather than completing a lesson. Both browser scenarios require the local
Firebase emulators and an emulator-enabled Expo web preview.

Actual iPhone interaction and Android hardware-back behavior have not been
device-tested. This is not mid-lesson persistence across app restarts, nor a claim
that pending XP is guaranteed to save after leaving.
