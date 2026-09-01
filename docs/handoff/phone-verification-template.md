# Diaspora Phone Verification Template

Use this template after `npm run env:check` passes with real Firebase/Google client values in the local `.env`.

Do not record secret values, API keys, service-account contents, or private user credentials in this file.

## Run Details

- Date:
- Device:
- iOS version:
- App runtime:
- Expo command:
- Local URL:
- Branch:
- Commit:
- Tester:

## Preflight

- [ ] `npm run env:check` passes.
- [ ] `node --test` passes.
- [ ] `npm run content:validate` passes.
- [ ] `npm run images:audit` passes.
- [ ] `npx expo export --platform ios --output-dir outputs/verify-transfer` produces `outputs/verify-transfer/metadata.json`.
- [ ] `npx expo start --lan --clear` shows a QR code and the phone can reach the dev server.

## Walkthrough

Record the result for each screen. If a step fails, capture the issue in the Runtime Issues section below.

| Step | Action | Expected | Actual | Pass |
| --- | --- | --- | --- | --- |
| Welcome | Launch app | Welcome screen loads without crashing |  |  |
| Onboarding | Tap Get Started and complete onboarding | Seven-screen onboarding completes with an available course |  |  |
| Account choice | Reach save-progress screen | Email remains available; Google is enabled only when configured, and Apple appears only where supported |  |  |
| Auth | Sign in or create account | Profile loads without stale guest data overriding it |  |  |
| Learn | Open Learn tab | Current focus and topic grid reflect saved progress |  |  |
| Lesson modal | Start current topic | Lesson modal opens with prompt, image, controls, and accessible footer |  |  |
| Completion | Finish a topic | XP save state is shown truthfully and next-topic/chapter state updates |  |  |
| Leaderboard | Open Leaderboard tab | Current learner rank derives from saved profile XP |  |  |
| Persistence | Close/reopen app | Auth/profile/progress persist for the same account |  |  |

## Runtime Issues

Copy this block once per issue:

```text
screen:
action:
expected:
actual:
terminal log excerpt:
device notes:
```

## Approval

- [ ] No unresolved crash, auth, progress, XP, leaderboard, or restart issue remains.
- [ ] Any fix made from this run has a focused regression test and passing verification.
- [ ] This evidence references the exact branch and commit tested.
