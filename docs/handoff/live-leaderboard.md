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

The emulator test passed on this Mac on 2026-09-08. The full Node suite and iOS
export also passed during implementation. Live rules deployment is still pending:
Firebase CLI reports no authorized accounts. After Firebase authentication, deploy
the checked-in rules with `npm run firebase:rules:deploy` using an installed CLI,
or `npx --yes firebase-tools@14.17.0 deploy --only firestore:rules,firestore:indexes`.

This is a saved-XP social leaderboard, not an anti-cheat system. The pre-existing
user-profile rules allow owners to write their own profile XP. Server-authoritative
lesson validation and rewards remain necessary before offering competitive prizes
or claiming tamper-resistant scores.
