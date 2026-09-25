# Expo Go compatibility assessment

Checked 2026-09-25. The working application uses Expo 54.0.37, React Native
0.81.5, and React 19.1.0. Node on this Mac is 22.14.0.

The UK [App Store listing](https://apps.apple.com/gb/app/expo-go/id982107779)
shows Expo Go 57.0.9 released September 2 and React Native 0.86. This conflicts
with Expo's [version-mismatch troubleshooting page](https://docs.expo.dev/troubleshooting/expo-go-version-mismatch/),
which still says the App Store stops at SDK 54. The installed iPhone app version
has been requested; do not claim device compatibility from a bundle export.

## Isolated migration

Use `codex/expo57-compatibility` in an ignored worktree. Preserve the working
SDK 54 branch and do not copy private environment files into the migration.
Upgrade incrementally through SDK 55 and 56 to 57, checking the release notes,
dependency alignment, tests, and exports at each stage. Use only demo Firebase
configuration for local browser checks.

SDK 57's [versioned reference](https://docs.expo.dev/versions/v57.0.0/)
requires Node 22.13+, React 19.2.3, React Native 0.86, and iOS 16.4+.
The installed Node meets that documented minimum. Local native iOS builds still
need a newer Xcode/macOS environment; do not propose this Mac as a simulator path.

Before integration: run the full test suite, workbook/image/environment checks,
iOS/web exports, font failure recovery, and the emulator-backed lesson flow with
exit confirmation, recall, XP persistence, account switching, and leaderboard.
Audit dependencies again and report remaining advisories rather than applying a
blind forced upgrade. Keep any incomplete migration on its separate branch.

Phone testing and confirmation of the installed Expo Go/iOS versions remain
required. This plan does not change curriculum review gates or publish courses.
