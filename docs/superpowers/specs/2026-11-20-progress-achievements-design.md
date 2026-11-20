# Progress Achievements Design

## Intent

Add a premium, playful achievement moment to the existing Progress screen so learners can see meaningful accomplishments beyond chapter percentage. Achievements must reflect persisted learner evidence already available in the app and must never fabricate activity.

## Design

The Progress presentation model derives four course-scoped achievements from completed topics, covered vocabulary, saved XP, and saved streak: First Step (one topic), Word Collector (ten words), Momentum (100 XP), and Three-Day Rhythm (three-day streak). Each record exposes a stable ID, label, description, progress label, state, icon name, and restrained accent.

The Progress screen renders these records as a two-column gallery of original geometric badge cards within the cream editorial design system. Unlocked cards are high-contrast and celebratory; locked cards remain legible and show exact progress. The existing native entrance animation is reused, and reduced-motion users receive the settled state immediately.

## Constraints

- React Native + Expo SDK 58 and Expo Go compatible.
- No new persistence schema, network request, dependency, Lottie asset, currency, or paywall.
- Use only curriculum-backed and persisted counts already passed to `buildProgressDashboardViewModel`.
- Loading state must not claim an achievement is unlocked.
- Preserve Anton, DM Serif Display, and Inter design tokens.
- Accessible labels must announce achievement title, lock state, and progress.

## Approaches considered

- Chosen: derive achievements in the pure Progress presentation model. This is deterministic, testable, offline, and requires no migration.
- Rejected: store achievement records in Firestore. It duplicates derivable state and introduces synchronization risks.
- Deferred: separate animated achievement-unlock modal. It requires reliable first-seen event persistence and should follow after the core achievement model is proven.

