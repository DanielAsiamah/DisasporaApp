# Live Leaderboard

The Learn shell now loads the top 50 entries from `leaderboardEntries`, ordered
by saved XP. Sample competitors are no longer used by the screen.

Joining is an explicit learner action. Public entries contain only a display
name, saved XP and update timestamp; document IDs identify membership. Leaving
deletes the entry. Private user profiles remain owner-only. Ranking ties use
document identity, not display names. The screen shows connection errors rather
than simulated results when backend access fails.

The client refreshes an existing entry from the saved profile when the leaderboard
opens or its profile XP changes. It never recreates a deleted entry without a new
Join action. Membership reads use a separate listener so learners outside the top
50 can still leave.

## Verification And Deployment

`npm run test:leaderboard:rules` requires Java 17+ on PATH. It runs against the
demo Firestore emulator, checks ownership, rejects private fields and mismatched
XP, and verifies join/read/leave operations. Regular `node --test` skips this
integration test when no emulator is running.

The expanded emulator test passed on this Mac on 2026-09-10, including the current
XP transaction, lesson answer writes, immutable legacy sessions/rewards, unknown
collection rejection, and leaderboard access. Ten focused backend/config checks
also passed. The full Node suite and iOS export passed during UI implementation.

The rules were deployed to `diasporaapp-d9cfc` on 2026-09-10 at 11:20 UTC using
`firebase deploy --only firestore:rules --project diasporaapp-d9cfc --non-interactive`.
The Rules API then confirmed that release
`f4530905-2d9f-4d70-8598-aa90d28c480c` exactly matches the local file (SHA-256
`107e7a066ad8007f4505aa200d8d4a1443f35715438240f9b98e29cc61313472`).
The prior deployed rules were backed up under ignored `outputs/firebase-rules/`.
No database documents or indexes were changed by this deployment.

The previous release allowed only `users/{uid}`, `progress`, and legacy `sessions`.
Current `lessonSessions`, `xpRewards`, and `leaderboardEntries` were therefore
denied. The deployed update adds these exact paths while retaining the original
legacy-session immutability; it does not grant arbitrary user-subcollection access.
An authenticated physical-device XP/leaderboard walkthrough after deployment
remains to be verified.

This is a saved-XP social leaderboard, not an anti-cheat system. The pre-existing
user-profile rules allow owners to write their own profile XP. Server-authoritative
lesson validation and rewards remain necessary before offering competitive prizes
or claiming tamper-resistant scores.
