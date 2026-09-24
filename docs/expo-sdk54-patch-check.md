# Expo SDK 54 patch check

On 2026-09-24, `npx expo install --check` identified two mismatches:

- `expo`: 54.0.36 -> 54.0.37
- `expo-constants`: 18.0.13 -> 18.0.14

Installed the recommended patch versions using Expo CLI and committed the npm
lockfile changes. No SDK major upgrade or native feature was added.

Verification:

- `npx expo install --check`: dependencies up to date.
- `node --test`: 455 passed, one skipped, zero failures.
- iOS and web exports: `outputs/verify-expo-patch`.
- `npm run content:validate`: generated curriculum valid and unchanged.
- Image audit and public environment checks passed.
- Fresh Expo server on port 8088: browser onboarding, Patois lesson and recall,
  70 XP, reload, leaderboard join/leave, and sign-out/sign-in passed without page
  errors or production Firebase requests (`outputs/expo-patch-browser.log`).

The SDK dependency check is not evidence that the Expo Go version installed on a
particular iPhone supports SDK 54. Actual device compatibility remains unverified.

## Open dependency risks

`npm audit --json` reported 29 advisories (13 moderate, 16 high) in the installed
dependency tree. The local report is `outputs/expo-patch-audit.json`.
Several suggested fixes require an Expo major upgrade; `xlsx` has no fix offered
by that npm audit report. No `npm audit fix --force` was run. This patch is a
compatibility update, not a claim that dependency security is resolved.

Lesson exit currently closes immediately; a confirmation interaction remains a
separate follow-up rather than being mixed into this dependency update.
