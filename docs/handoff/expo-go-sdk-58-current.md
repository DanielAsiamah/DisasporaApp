# Current Physical iPhone Expo Go Handoff

Diaspora targets Expo SDK 58, React Native 0.88, and React 19.3 for the
physical-iPhone testing path. This matches the Expo Go version currently
distributed through Apple's App Store without requiring an Apple Developer
Program membership.

## Start A Fresh Phone Session

1. Install or update Expo Go from the iPhone App Store.
2. Sign into the `danielasiamah` Expo account in Expo Go.
3. From this repository, run `npm run phone:preview -- --clear --max-workers 2`.
4. Keep the Mac terminal and Metro process running while the cold iOS bundle builds.
5. Wait for `READY TO SCAN: exposdk:58.0.0 iOS bundle warmed` in the terminal.
6. Scan the fresh QR code shown by that same process. Do not reuse an earlier tunnel URL.

The preview command warms the exact Hermes iOS launch bundle locally before it
reports readiness. This prevents Expo Go's first request from reaching the
tunnel's 30-second proxy timeout while Metro is still building a cold cache.
The QR code can appear before the bundle is ready, so the terminal readiness
message, not the QR appearance, is the signal to open it on the phone.

Expo Go uses the app's email/password authentication path. Native Google and
Apple sign-in remain development-build features and are intentionally not
offered inside Expo Go.

## Verification

Local dependency, Expo Doctor, type, test, and bundle checks are required after
the SDK 58 migration. Physical iPhone interaction remains unverified until the
QR session is opened on the user's phone and the Welcome, Onboarding, Learn,
Lesson, Completion, reload, and Leaderboard journey is completed there.

## Scope

This runtime change does not publish unreviewed courses or fabricate missing
translations. Course availability remains controlled by the existing native
review and verified-release rules.
