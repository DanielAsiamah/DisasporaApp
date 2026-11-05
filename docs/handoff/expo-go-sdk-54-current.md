# Current Physical iPhone Expo Go Handoff

Diaspora targets Expo SDK 54, React Native 0.81.5, and React 19.1 for the
physical-iPhone testing path. This preserves the current application features
while matching the Expo Go version available from Apple's App Store without an
Apple Developer Program membership.

## Start A Fresh Phone Session

1. Install or update Expo Go from the iPhone App Store.
2. Sign into the `danielasiamah` Expo account in Expo Go.
3. From this repository, run `npm run phone:preview -- --clear --max-workers 2`.
4. Keep the Mac terminal and Metro process running.
5. Scan the fresh QR code. Do not reuse an earlier SDK 57/58 tunnel URL.

Expo Go uses the app's email/password authentication path. Native Google and
Apple sign-in remain development-build features and are intentionally not
offered inside Expo Go.

## Verified Locally

- Expo dependency alignment passes for SDK 54.
- Expo Doctor passes all checks.
- TypeScript and mobile-focused source contracts pass.
- The application config resolves with `sdkVersion: 54.0.0`.

Physical iPhone interaction remains unverified until the QR session is opened
on the user's phone and the Welcome, Onboarding, Learn, Lesson, Completion,
reload, and Leaderboard journey is completed there.

## Scope

This runtime change does not publish unreviewed courses or fabricate missing
translations. Course availability remains controlled by the existing native
review and verified-release rules.
