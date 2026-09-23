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

## Repeatable Browser Regression

With the emulators and `web:emulators` running, run `npm run test:app:browser`.
This optional test requires Playwright and a browser installed separately:

```sh
npm install --no-save --package-lock=false playwright@1.48.2
DIASPORA_CHROMIUM_EXECUTABLE="/path/to/Chrome executable" npm run test:app:browser
```

Alternatively, omit the executable override to use Playwright's installed
Chromium. `DIASPORA_PLAYWRIGHT_MODULE` can point at an existing Playwright
installation instead of installing it into this repository.

The test creates a disposable emulator account, completes onboarding, deliberately
answers incorrectly and mismatches one phrase pair before retrying, completes the
first topic, checks saved XP and accuracy derived from its current exercises,
reloads to verify progress, and joins/leaves the leaderboard. It blocks production Auth/Firestore requests
before opening the app and fails if any are attempted. Screenshots are written
under ignored `outputs/browser-smoke/`. Do not point this test at a live backend.

The wrong-answer regression exposed an unhandled interrupted-playback promise
in the installed Expo Audio web player. A web-only adapter now returns browser
playback promises to the existing controller's error handler. Native Expo Audio
and the approved-phrase policy remain unchanged. After a clean Metro restart,
the full retry, completion, reload, and leaderboard regression passed with no
page errors or production requests.

## Swahili Developer Preview

With the same local emulators running, start a separate preview:

```sh
EXPO_PUBLIC_USE_FIREBASE_EMULATORS=true \
EXPO_PUBLIC_PREVIEW_COURSE_ID=swahili \
EXPO_PUBLIC_ENABLE_UNRELEASED_COURSE_PREVIEW=true \
npx expo start --web --go --port 8087
```

Run the browser regression with the Playwright/browser overrides above if needed:

```sh
DIASPORA_TEST_COURSE=swahili DIASPORA_APP_URL=http://localhost:8087 \
npm run test:app:browser
```

The runner accepts only loopback HTTP app URLs and derives exercises, XP, accuracy,
and topic counts from the selected runtime curriculum. Onboarding still selects
Patois; the explicit development override selects Swahili for the lesson screen.
This is not proof that Swahili is selectable through normal onboarding or ready
for publication. Its native-speaker review gate remains unchanged.

On 2026-09-22, Swahili's first-topic regression passed: wrong-answer retry, six
completed exercises, 60 confirmed XP, 86% accuracy, progress retained after reload,
and leaderboard join/leave. No page errors or production Auth/Firestore requests
were recorded. This verifies the local web preview, not Expo Go on a device.

The subsequent friendly-lesson refresh changes the introduction to seven Patois
exercises and eight Swahili exercises, including workbook-backed phrase practice.
Current regression totals are 70 XP / 78% accuracy for Patois and 80 XP / 80%
accuracy for Swahili after one wrong answer and one mismatched pair. The earlier
six-exercise figures above describe the previous build, not the current course.
See `lesson-experience-refresh.md` for the content and presentation changes.

## Full Chapter Regression

Set `DIASPORA_TEST_FULL_CHAPTER=true` when running `npm run test:app:browser` to
walk every topic, including review and challenge, using the completion screen's
Start Next Topic button. The default remains the shorter first-topic check.
The course and local app URL overrides above still apply.

Every sentence-building exercise adds the actual answer tokens, removes the last
word, and adds it again. Repeated tokens are selected by their unique word-bank
indices. The counter reports words placed, not a fraction of the bank, because
the bank also contains distractors. At the end, the runner reloads and verifies
the whole chapter's completed-topic count and cumulative XP, then joins/leaves
the leaderboard. Failures capture page errors, visible text, and a screenshot.

This longer test exposed a blank-screen transition from Polite Conversation to
Introducing Others: the previous response shape was read against a new topic's
exercise before the reset effect ran. The lesson instance is now keyed by both
learner/course storage scope and active topic, so the new topic starts with fresh
response state and old XP callbacks are invalidated during unmount.

Verified on 2026-09-22 after the fix: all nine Patois topics completed through
the browser UI, totaling 58 exercises and 580 saved XP. Reload retained all nine
completed topics and 580 XP. Leaderboard join/leave passed, with no page errors
or attempted production Auth/Firestore requests. This covers the current Patois
preview chapter, not the unfilled master curriculum or physical-device testing.

The same full-chapter run also passed for the explicitly opted-in Swahili preview:
nine topics, 66 exercises, and 660 XP retained after reload, with leaderboard
join/leave and no page errors or production requests. Swahili remains unpublished.

## Learner Account

The Learn header's Account button opens a compact panel with the current learner's
name/email, lesson-progress save status, and Sign Out. No extra navigation tab is
added. It uses the existing authentication service and welcome-route callback;
it does not delete account data or clear device progress. A failed sign-out keeps
the panel open with a retryable error. Pending or failed saves are identified
before the learner chooses whether to sign out.

The browser regression now ends by signing out and signing back into its same
disposable emulator account, then checking the topic count and XP again. Login
uses the existing email/password route, which is also the Expo Go testing route.

The account-panel browser check passed with 70 XP and one completed Patois topic
preserved after sign-out/sign-in, with no page errors or production requests.
This verifies local browser authentication and persistence, not a physical phone.
