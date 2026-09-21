# Local Signed-In App Testing

The isolated browser test mode uses the real Firebase SDKs and repository rules
against `demo-diaspora-app`. It does not deploy or write to the live project.

## Start

Use Java 17 on PATH with the pinned Firebase CLI 14.17.0. In separate terminals:

```sh
npm run firebase:emulators
npm run web:emulators
```

Open `http://localhost:8086` for the app and `http://127.0.0.1:4000` for the
emulator UI. Create a disposable email/password account through onboarding.
Verification emails are simulated; their links appear in emulator output.

The normal `.env` public configuration is still required by the configuration
loader. Do not add the emulator flag to shared EAS environments or committed env
files. The testing command sets it only for its own development server.

## Isolation

- `EXPO_PUBLIC_USE_FIREBASE_EMULATORS=true` explicitly selects this mode.
- Release builds reject this flag instead of silently connecting to emulators.
- A named Firebase app separates emulator login persistence from normal login.
- Auth, Firestore, and Storage connect to loopback endpoints on 9099, 8080, and
  9199. The app uses a fixed demo project and demo Storage bucket.
- The separate `firebase.emulators.json` leaves deployment configuration intact.
- Data is temporary unless deliberately exported with Firebase's emulator tools.
- This configuration is for the Mac browser, not a phone: loopback on a phone
  points to the phone itself. Normal Expo Go development remains separate.

Run `node --test tests/firebaseEmulatorMode.test.cjs` for isolation policy tests.
Successful local tests do not prove production provider configuration, native
device behavior, or Apple signing.

## Verified On 2026-09-20

Auth, Firestore, and Storage emulators started successfully. A 390px browser
walkthrough completed onboarding and email signup, reached the verification
screen, and created the expected local learner profile. The browser blocked
production Auth/Firestore endpoints as a safeguard; no such requests were
attempted and no page errors were recorded. The complete lesson, restart, and
leaderboard walkthrough remains to be verified.

## Core Loop Verified On 2026-09-21

A fresh local account completed the six workbook-generated exercises in Jamaican
Patois's Getting Started topic through the actual browser UI. The completion
screen showed 60 confirmed XP and 100% checked-answer accuracy. After a page
reload, the app retained 60 XP and one of nine completed topics. Joining the
leaderboard displayed the learner with 60 XP; leaving removed their membership
and returned the screen to its unranked state. No page errors or attempted
production Auth/Firestore requests were recorded.

The Firebase SDK's fixed emulator warning overlay intercepted taps on bottom
navigation. Emulator mode now disables that overlay and emits an explicit
console notice instead. This affects only the opt-in local test environment.

This walkthrough covers one course's first lesson and leaderboard membership,
not all courses, failure scenarios, native devices, or production authentication.
