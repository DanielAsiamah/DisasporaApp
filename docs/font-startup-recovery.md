# Font startup recovery

The app previously ignored the error returned by `useFonts`, leaving a permanent
loading indicator when a Nunito asset failed to download. This is a reproduced
failure case, not an explanation proven for the earlier intermittent Swahili
blank reload.

Startup now shows a system-font error message and a retry button before mounting
authentication or lesson screens. Native retry remounts the font-loading boundary.
Web retry reloads the page because Expo's web font loader retains font-face rules
even after its load observer rejects; merely remounting can mistake those rules
for successfully loaded fonts. Neither retry clears stored progress.

## Verification on 2026-09-24

- Browser regression first failed against the old startup behavior.
- Blocking real Nunito downloads now displays the recovery message.
- Unblocking downloads and pressing retry loads Nunito and opens Welcome.
- A local-storage sentinel survives the recovery reload.
- Normal Patois onboarding, lesson, recall, 70 XP, reload, leaderboard join/leave,
  and sign-out/sign-in passed with no page errors or production Firebase calls.
- Node suite: 455 passed, one skipped, zero failures.

Run `npm run test:app:font-recovery` against the local emulator preview on port
8086, using the same `DIASPORA_PLAYWRIGHT_MODULE` and
`DIASPORA_CHROMIUM_EXECUTABLE` overrides as the core-loop browser test.
The regression uses a fresh browser context and does not sign in or write backend
records. Production Firebase endpoints are blocked in the test.

Native retry is implemented but has not been exercised on an iPhone. A request
that never settles is outside this error-recovery test; no timeout behavior is
claimed. See the [Expo SDK 54 font API](https://docs.expo.dev/versions/v54.0.0/sdk/font/)
for the hook's loaded/error contract.
