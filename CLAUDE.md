# Diaspora build brief

## Current product direction

Diaspora is a warm, modern language-learning app inspired by Duolingo and Airlearn. The app should feel lesson-first: teaching cards, audio, illustrations, cultural context, exercises, tutor correction, and progress flow are more important than showing the mascot everywhere.

## Visual direction

- Use a consistent dark blue theme everywhere (dark mode always).
- The app should feel premium and modern like Duolingo/Airlearn.
- All backgrounds use the dark blue palette (#131F24 family).
- Cards, inputs, and surfaces use slightly lighter dark blue (#1A2C35).
- Accent colors: bright green (#58CC02) for primary, gold for accents, blue for links.
- Do not use light/white backgrounds anywhere in the app.

## Mascot direction

- Use one consistent original universal cat tutor.
- The cat supports the learning experience; it is not the whole product.
- Keep the design legally distinct from external references.
- Use small language accessories only: tam, scarf, cap, beret, collar pattern.
- Do not bring back the previous yellow mascot as the main brand mascot.

## Stable engineering constraints

- Preserve Firebase Auth, Firestore progress, generated curriculum, audio generation, and image registry.
- Do not migrate to Expo Router.
- Use `expo-audio`, not `expo-av`.
- Do not use native `Alert.alert` for app flow.
- Do not push to GitHub unless explicitly requested.
