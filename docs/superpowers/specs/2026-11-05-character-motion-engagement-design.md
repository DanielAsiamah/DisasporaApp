# Character Motion And Engagement Design

## Goal

Make Diaspora's original human guides feel present and responsive throughout lessons while keeping the current Expo-compatible core loop fast, accessible, and legally clean-room.

## Decisions

- Do not copy proprietary Duolingo code, assets, event names, scoring formulas, or reverse-engineered internals. Product references are used only to identify general interaction patterns.
- Use the existing original PNG guide cast with React Native/Reanimated motion states first. This works with the current app and does not require paid animation production.
- Increase prompt-guide prominence and use explicit `prompt`, `celebrate`, and `recover` states. Correct answers bounce; wrong answers shake and settle; idle prompts breathe gently.
- Replace decorative lesson clouds with a purposeful visual-learning stage labelled `LOOK • LISTEN • SPEAK`.
- Respect the operating system's reduced-motion preference in every state.
- Keep wrong-answer error haptics and sounds. Never infer or inspect the phone's silent-switch state.
- Treat Lottie as a later asset pipeline, not the current blocker. It becomes worthwhile after each original character is redrawn as layered vectors and professionally rigged.
- Keep ElevenLabs keys server-side or in local generation scripts. Generate production speech only after native-speaker text approval and use the existing dry-run/credit-limit workflow.

## Clean-Room Engagement Work

- Persist daily streaks only at lesson completion.
- Track first-party events needed by Diaspora's own product decisions: app open, lesson start, checked answer, lesson completion, and streak update.
- Prefer understandable learner-facing adaptation such as mistake review and next-topic selection over opaque churn predictions.
- Do not activate language courses whose target text has not passed native review.

## Later Lottie/Rigging Phase

- Prepare layered vector source files for each guide with separate head, eyes, mouth, torso, and arms.
- Define reusable clips: idle, listen, speak, correct, wrong, celebrate, and streak-save.
- Export only original assets and verify runtime size, reduced-motion fallback, and Android/iOS rendering before replacing the current motion wrapper.
