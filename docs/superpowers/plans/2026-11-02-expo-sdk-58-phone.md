# Expo SDK 58 Phone Compatibility Plan

**Goal:** Restore the physical iPhone Expo Go path without narrowing the
Airlearn-inspired multilingual application objective.

**Root cause:** The App Store Expo Go client moved to SDK 58 while the project
still targeted SDK 57. Expo Go requires its embedded SDK to match the project.

## Tasks

- [x] Reproduce dependency mismatch with Expo Doctor.
- [x] Confirm Node, native-module guards and SDK 58 breaking-change exposure.
- [x] Upgrade Expo, React Native, React and SDK packages with Expo's installer.
- [x] Make TypeScript ignore generated outputs and unrelated worktrees using a
  failing contract test before the configuration fix.
- [x] Pass Expo Doctor, TypeScript, Node, content, image, environment,
  Firestore-rule, web-export and iOS-export checks.
- [x] Replace the stale SDK 57 process with an authenticated SDK 58 tunnel.
- [x] Verify the SDK 58 manifest and a complete iOS bundle through that tunnel.
- [x] Complete the full three-lesson Igbo browser journey on SDK 58 against
  local Firebase emulators.
- [ ] Complete the final interaction check on the user's physical iPhone.

## Constraints

- Keep native Google/Apple sign-in behind the existing development-build guard.
- Never use production Firebase for automated tests.
- Do not force npm audit upgrades across Expo's supported dependency graph.
- Keep `journalism/` untouched and outside the application typecheck.
