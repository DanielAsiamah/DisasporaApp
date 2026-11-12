# Diaspora Visual Refresh Design

## Intent

Replace the mixed template-like visual language with an original, coherent learning experience that feels warm, crafted, and culturally grounded. The first complete slice covers global typography and controls, the Learn shell, lesson chrome, and the out-of-hearts/refill experience.

## Direction

The selected direction is **Diaspora field notebook**: warm paper surfaces, deep ink, sea green, mango, and coral; soft asymmetric decorative forms; Anton display typography, DM Serif Display editorial moments, Inter UI copy; large original human guides; and purposeful spring/heartbeat motion. It borrows the clarity and pacing of strong consumer learning apps without copying their screens, characters, assets, or proprietary behavior.

## Requirements

- Keep the existing heart persistence, regeneration, refill, and progress contracts unchanged.
- Replace emoji heart UI with consistent vector iconography.
- Make refill feel native to the lesson: clear balance, next-heart timer, one primary action, one quiet exit, haptic confirmation, and reduced-motion behavior.
- Remove decorative drifting clouds from Learn and Leaderboard.
- Make original guide artwork larger and visually integrated with the screen.
- Use Anton, DM Serif Display, and Inter through the existing shared `fonts` tokens and retain a reliable font-recovery screen.
- Preserve compact-phone layouts, accessibility labels, semantic roles, and reduced-motion handling.
- Remain compatible with Expo Go on Expo SDK 58.

## Non-goals

- No changes to Firebase schema, heart economy, XP rules, curriculum, or authentication.
- No copied Duolingo/Airlearn source, artwork, exact layouts, or reverse-engineered algorithms.
- No generic Lottie dependency without authored animation assets. Use native animation for micro-interactions and reserve Lottie for later completion, streak, achievement, and character assets that have been intentionally designed.

## Considered Approaches

- **Cosmetic modal-only patch:** fastest, but leaves the conflicting app-wide systems and does not address the reported AI-template feel.
- **Full navigation rewrite:** maximum freedom, but unnecessarily risks progress, authentication, and phone testing.
- **Shared-system refresh with key-screen migration (selected):** updates type, controls, Learn, lessons, and refill while preserving behavior and allowing later screens to inherit the same tokens.

## Verification

Contract tests cover fonts, vector hearts, refill haptics, reduced motion, and cloud removal. The existing full Node suite, content checks, image audit, environment check, TypeScript check, Expo Doctor, and iOS export must remain green.
