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

Pending at this checkpoint:

- iOS/web export is still running; log in the parent checkout's
  `outputs/expo55-export.log`.
- Emulator-backed browser regression is still running against port 8090;
  logs in the parent checkout's `outputs/expo55-browser.log` and
  `outputs/expo55-preview.log`.
- SDK 56 and SDK 57 upgrades have not started.
- Phone compatibility and actual device interaction remain unverified.

The preview uses synthetic configuration for `demo-diaspora-app` and local
Firebase emulators only. No production environment file was copied. The browser
runner blocks production Firebase endpoints. The export is a bundling check,
not a production-configured release artifact.

Do not merge this checkpoint merely because unit tests pass. Finish runtime and
export checks, then continue the version-by-version migration described in
`docs/expo57-compatibility-plan.md`.
