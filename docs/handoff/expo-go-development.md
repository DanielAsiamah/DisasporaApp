# Expo Go First Development

## Current Direction

The owner does not have Apple Developer membership and has deferred phone
testing. Continue frontend and backend implementation with Expo Go-compatible
features and browser testing. Do not block ordinary app work on Apple signing.
Keep native development-build configuration for later, not as a prerequisite
for working on lessons, progress, onboarding, or the leaderboard.

## Authentication

- Expo Go uses Firebase email/password accounts and the existing verification,
  password reset, profile, progress, and leaderboard services.
- Native Google sign-in is unavailable in Expo Go. Both entry screens explain
  the email path, and the service rejects unsupported calls before importing
  the native module.
- Web Google sign-in uses Firebase's browser popup, not the native module.
- Apple sign-in is not offered in Expo Go in this phase.
- Native development builds retain Google and iOS Apple provider paths.

The runtime policy is covered by `tests/authRuntime.test.cjs`. Browser checks
verified onboarding through account choice and a Google popup reaching
`accounts.google.com`, without signing in or creating an account. A popup opening
does not prove successful account authentication or cloud progress saving.

## Remaining Product Work

Continue testing the authenticated Learn -> Lesson -> Completion -> Leaderboard
flow, including retry and restart behavior. Preserve the workbook-generated
curriculum, original Diaspora design, and existing persistence contracts.
The master workbook supplies course outlines but currently has no filled target
translations; do not fabricate native-speaker approvals or label outlines as
completed courses. Native phone tests and store distribution remain deferred.
