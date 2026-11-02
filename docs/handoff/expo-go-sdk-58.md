# Expo Go SDK 58 Handoff

Diaspora now targets Expo SDK 58, React Native 0.88 and React 19.3. This aligns
the project with Expo Go 58 from the iOS App Store. Node 22.13 or newer is
required; this Mac currently uses Node 22.14.

## Start The Phone Preview

1. Sign into the `danielasiamah` account in Expo Go on the iPhone.
2. From the repository, run `npm run phone:preview -- --max-workers 2`.
3. Scan the terminal QR code, or regenerate the browser handoff page with the
   current `exp://` URL:

   `npm run phone:handoff -- --tunnel-url=exp://CURRENT_HOST`

4. Open `outputs/phone-handoff/expo-go.html` on the Mac if a larger QR code is
   easier to scan.

Email/password authentication is supported in Expo Go. Native Google and Apple
sign-in remain intentionally unavailable there because those providers require
a custom development build.

## Verified On 2026-11-02

- `npx expo-doctor@latest`: 20/20 checks passed.
- `npx tsc --noEmit`: passed with app-source-only TypeScript scope.
- Full Node suite: 492 passed and one emulator-only test skipped; the skipped
  Firestore rules suite passed separately against the local emulator.
- Web and iOS exports passed under SDK 58.
- The public Expo Go manifest reported `exposdk:58.0.0`.
- A warmed iOS bundle returned HTTP 200 through the tunnel, downloading
  10.97 MB in 2.39 seconds.
- The local-emulator browser walkthrough completed all four Igbo lessons,
  saved 270 XP, preserved progress after sign-out/sign-in, exercised red and
  sound mismatch feedback, and completed leaderboard opt-in/out.
- Nneka and Chidi load as course-specific Igbo guides. Their transparent PNGs
  pass the project cutout audit, the phone-sized browser journey passed, and the
  iOS export succeeded in `outputs/verify-igbo-guides-20261102`.

The first tunnel bundle can exceed the proxy's 30-second cold-request window.
If the first phone request returns 504, leave Metro running until it prints
`iOS Bundled`, then open the same project again. The warmed bundle is fast.

Physical iPhone interaction remains a manual verification step because the
phone is not connected to this terminal session.
