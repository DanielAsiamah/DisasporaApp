# Diaspora machine-transfer handoff — 2026-08-31

## Canonical repository

- GitHub: `https://github.com/DanielAsiamah/DisasporaApp.git`
- Continue product work from `main`.
- `june-26-restored` points at the same active rebuild checkpoint and is retained as an extra recovery ref.

## Preserved branch map

| Remote branch | Purpose | Preserved checkpoint |
| --- | --- | --- |
| `main` | Canonical Expo SDK 54 app | Active onboarding/auth, Learn/Leaderboard, workbook-backed lessons, release gates and current cleanup |
| `june-26-restored` | Recovery pointer for the active rebuild | Same product checkpoint as `main` when this handoff was created |
| `archive/pre-rebuild-local-work-20260831` | Uncommitted pre-rebuild snapshot recovered from the older worktree | 24 modified app/config files plus 39 previously untracked source/design files |
| `archive/legacy-main-20260626` | Exact pointer to the old pre-rebuild `main` head | Commit `7f2db870f22205c6b15bb0c184726b95398ab0d5` |

The active code-and-project-metadata checkpoint immediately before this handoff document is `a7451f4274a8d1b999ea6f15deea2ec6bd187820`.

## New-laptop setup

```powershell
git clone https://github.com/DanielAsiamah/DisasporaApp.git
cd DisasporaApp
git checkout main
npm ci
Copy-Item .env.example .env
```

Fill `.env` with the Firebase web-app values and Google OAuth client IDs named in `.env.example`. Then verify locally:

```powershell
npm run env:check
node --test
npm run content:validate
npm run images:audit
npx expo export --platform ios --output-dir outputs/verify-transfer
npx expo start --lan --clear
```

Use Expo Go compatible with SDK 54 for the physical-iPhone check. To scaffold a dated local report from the template, run:

```bash
npm run phone:verification:scaffold -- --device="<device>" --ios-version="<ios-version>" --tester="<name>"
```

Then complete the generated `outputs/phone-verification/*.md` report during the phone walkthrough. The output directory is intentionally ignored so evidence can include local device notes without committing secrets or private account details.

`npm run env:check` is safe to run before and after filling `.env`: it reports only variable names that are missing or still placeholders, never secret values.

## Credentials that are intentionally not in Git

- `.env` is ignored and was not pushed.
- `serviceAccountKey.json` is ignored and was not pushed.
- Previously shared ElevenLabs keys are compromised and must be revoked/rotated; do not copy them to the new laptop.
- Paid ElevenLabs generation remains disabled until rotated credentials, native wording approval, voice approval and explicit spend approval all exist.

Retrieve Firebase client configuration from Firebase Console on the new laptop. Store any server-side service-account file outside Git and only recreate it if a development script genuinely needs it.

## Verified state before transfer

- Active app tests: `378/378` passed on the MacBook implementation branch after adding placeholder public-env guards and the safe env readiness checker.
- Curriculum validator: 39 concepts, 9 courses, 351 vocabulary rows, 81 topics and 320 deterministic lesson steps passed.
- Jamaican Patois image audit: 39/39 canonical transparent PNGs passed.
- iOS export produced `outputs/verify-transfer/metadata.json` after the MacBook readiness checks.
- Active worktree had no remaining tracked or untracked project changes after checkpointing.
- Every local branch head was verified reachable from an exact `origin/*` ref.
- No local tags or stashes existed.
- No real `.env` or service-account path was present in any pushed branch tree.

## State that is not yet production-ready

- The full frontend/backend production-readiness audit is still in progress.
- Physical iPhone end-to-end verification must be repeated after cloning on the new laptop.
- Real Firebase/Google client values still need to replace `.env` placeholders before auth and phone persistence can be verified.
- Jamaican Patois remains a preview until native-language/cultural review, approved multi-role audio and phone evidence are complete.
- Remaining courses must stay unreleased until their own 39-row content, 39-image art, voice/audio and persistence gates pass.

## Resume order

1. Clone `main`, recreate only the safe Firebase/Google client configuration, confirm `npm run env:check` passes, and run the verification commands above.
2. Finish the prioritized frontend/backend audit across onboarding → auth → lesson → XP → leaderboard → restart.
3. Fix the highest-severity persistence/security issue test-first, one verified commit per slice.
4. Resume the course release pipeline without fabricating native, cultural, audio or physical-device approvals.
