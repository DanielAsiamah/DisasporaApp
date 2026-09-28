# Expo migration checkpoint

Branch: `codex/expo57-compatibility`. Main remains on the tested SDK 54 build.

## SDK 55 (2026-09-25)

Installed with `npx expo install 'expo@^55.0.0' --fix`:

- Expo 55.0.31
- React 19.2.0 / React Native 0.83.10
- expo-audio 55.0.18
- Reanimated 4.2.1 / Worklets 0.7.4

Completed checks:

- Clean worktree baseline: 458 tests passed, one skipped.
- After upgrade: 458 tests passed, one skipped, zero failures.
- Dependency alignment: up to date.
- Expo Doctor: 20/20 checks passed.
- Generated curriculum validation and Patois image audit passed.
- npm reports 16 dependency advisories (11 moderate, five high), not zero.

Runtime checks completed on 2026-09-26:

- iOS/web export passed; log in the parent checkout's `outputs/expo55-export.log`.
- Emulator-backed browser regression passed: onboarding, lesson exit/cancel,
  wrong-match feedback, recall, 70 XP, reload, leaderboard opt-in/out, and
  sign-out/sign-in. No page errors or production Firebase requests were reported.
  Logs: `outputs/expo55-browser.log` and `outputs/expo55-preview.log` in the parent checkout.
- Expo added the `expo-font` config plugin during this stage; retained it.

Pending:
- SDK 57 upgrade has not started; SDK 56 results follow below.
- Phone compatibility and actual device interaction remain unverified.

The preview uses synthetic configuration for `demo-diaspora-app` and local
Firebase emulators only. No production environment file was copied. The browser
runner blocks production Firebase endpoints. The export is a bundling check,
not a production-configured release artifact.

Do not merge this checkpoint merely because unit tests pass. Finish runtime and
export checks, then continue the version-by-version migration described in
`docs/expo57-compatibility-plan.md`.

## SDK 56 (2026-09-26, intermediate checkpoint)

- Installed Expo 56.0.22, React 19.2.3, React Native 0.85.3,
  Reanimated 4.3.1 and Worklets 0.8.3 using Expo's dependency installer.
- Dependency alignment passed.
- Full suite: 458 passed, one skipped, zero failures.
- Curriculum validation and image audit passed.
- Expo Doctor: 21/22 passed. The remaining check detects the known Hermes V1
  memory regression in this SDK. Do not merge or release this checkpoint.
  Continue to patched SDK 57 as planned; see
  https://expo.dev/changelog/sdk-57#known-regressions.
- Installer reports 14 advisories (12 moderate, two high); no forced audit fix.
- Expo added the `expo-status-bar` config plugin during installation.
- iOS/web export completed successfully. Its log is in the parent
  checkout at `outputs/expo56-export.log`.
- SDK 56 browser regression and native phone testing remain unverified.

Main remains unchanged on SDK 54. No production environment file was copied.

Ruling: proceed to SDK 57 before the next browser regression rather than spend
runtime verification on the known-affected SDK 56 checkpoint. SDK 56 is not a
release candidate; the full browser and font recovery gates still apply to SDK
57 before integration. Cost: a browser regression first found there may need
comparison against this intermediate dependency snapshot.
