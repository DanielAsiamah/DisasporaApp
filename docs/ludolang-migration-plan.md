# Diaspora Ludolang-Style Migration Plan

## Goal

Turn `im/patois-learn` into a polished Diaspora language-learning app that uses Ludolang as a product and architecture reference while keeping Diaspora's Expo app, Firebase Auth, Firestore content/progress, generated curriculum, ElevenLabs audio pipeline, and original brand direction.

This is not a code clone of Ludolang. Ludolang is a reference for product organization: course path, lesson flow, feature folders, reusable UI primitives, query/mutation boundaries, progress events, quests, profile, and leaderboard. Diaspora remains an Expo Go React Native app backed by Firebase.

## Reference Inputs

- Canonical app to migrate: `im/patois-learn`
- Frontend product/UX reference: `ReferenceProjects/ludolang`
- Backend domain/progress reference: `ReferenceProjects/ludolang-backend`
- Separate prototype from earlier exploration: `im/diaspora-ludo`; useful for experiments, not the canonical migration target.

## Current Evidence

- Diaspora is Expo SDK 54, React Native 0.81.5, Firebase 12.15.0, `expo-audio`, and a state-machine `App.js`; do not migrate to Expo Router.
- `src/data/curriculumRepository.js` already loads local generated curriculum and falls back from Firestore content safely.
- Firestore content currently follows `languages/{languageId}/units/{unitId}/lessons/{lessonId}` through `src/services/firestore/curriculumService.js`.
- User state already lives under `users/{uid}`, `users/{uid}/progress/{languageId}`, and `users/{uid}/lessonSessions/{sessionId}` through `src/services/firestore/userService.js`.
- Ludolang frontend is Vite/React web with React Router, TanStack Query, feature folders, course path, lesson session, lesson completion, quests, profile, leaderboard, and reusable atoms/molecules.
- Ludolang backend is Spring/Kotlin/MySQL organized into auth, catalog, progress, quests, leaderboard, follow, and user domains.
- Current Diaspora brief says preserve Firebase, generated curriculum, audio/image registries, no Expo Router, no `expo-av`, no native `Alert.alert`, and use an original universal cat tutor with language accessories.

## Target Architecture

### App Shell

Keep `App.js` as the root screen state machine, but reduce screen-specific logic by introducing feature modules:

```text
src/
  app/
    AppShell.js
    routeMachine.js
  features/
    auth/
    onboarding/
    courses/
    learnPath/
    lessonSession/
    lessonComplete/
    profile/
    quests/
    leaderboard/
    shop/
  components/
    ui/
    mascot/
    feedback/
  services/
    firebase/
    content/
    progress/
    audio/
  data/
    generated/
    schemas/
  design/
    tokens.js
```

The first migration should not rename everything at once. Add the new folders beside the current files, move one feature at a time, and keep compatibility exports until the old imports are gone.

### Ludolang Concept Mapping

| Ludolang concept | Diaspora replacement |
| --- | --- |
| `MainLayout`, sidebars, footer | Native `AppShell` with top stat bar and bottom tab bar |
| `SectionPage` | `features/learnPath/LearnPathScreen.js` |
| `UnitBanner` | `features/learnPath/UnitBanner.js` |
| `UnitPath` and lesson buttons | `LessonPath.js`, `LessonNode.js`, `LessonPopover.js` |
| React Router lesson routes | Existing `App.js` state machine with `lessonSession` route state |
| `useSectionTree` | `useCourseTree(languageId)` reading Firestore/local curriculum |
| TanStack query options | Local repository hooks with loading/error/cache state; TanStack optional later |
| `ExerciseComponent` | Native exercise registry keyed by Diaspora step type |
| `useLessonFlow` | `useLessonSession` phase state machine |
| `useSubmitExercise` | Firestore `recordAnswer()` mutation plus local feedback |
| `useLessonComplete` | Firestore `completeLesson()` mutation plus progress cache update |
| Spring catalog services | Firestore `contentRepository` and generated content scripts |
| Spring progress services | Firestore `progressRepository`, `sessionRepository`, quest updaters |

## Firestore Data Model

Keep the current top-level Firebase project and existing collections. Add fields and subcollections incrementally instead of replacing data.

### Content

```text
languages/{languageId}
  title
  shortName
  flag
  themeColor
  accentColor
  status: "published" | "draft"
  sourceVersion

languages/{languageId}/sections/{sectionId}
  order
  title
  description
  status

languages/{languageId}/units/{unitId}
  sectionId
  order
  title
  description
  goal
  themeColor
  status

languages/{languageId}/units/{unitId}/lessons/{lessonId}
  order
  title
  subtitle
  type: "star" | "chest" | "review" | "trophy"
  status
  phrase
  meaning
  category
  note
  audioKey
  imageKey
  steps[]
```

Diaspora can continue supporting units directly under `languages/{languageId}`. Add `sections` only when multi-section courses are ready. Until then, `useCourseTree()` returns one synthetic section per language.

### Lesson Steps

Normalize every lesson into this app-facing shape:

```js
{
  id: string,
  order: number,
  type:
    | 'teaching_intro'
    | 'vocabulary_card'
    | 'multiple_choice'
    | 'image_choice'
    | 'audio_listen'
    | 'build_sentence'
    | 'match_pairs'
    | 'wrong_answer_feedback'
    | 'lesson_complete',
  prompt: string,
  answer: string,
  choices: [],
  pairs: [],
  wordBank: [],
  audioKey: string | null,
  imageKey: string | null,
  culturalNote: string | null,
  xp: number
}
```

The current `src/lessonEngine/buildLessonSteps.js` can remain as the fallback generator. The migration target is: Firestore lesson `steps[]` wins when present; generated local steps are only a fallback.

### Progress

```text
users/{uid}
  username
  email
  xp
  streak
  hearts
  gems
  currentCourse
  currentLesson
  baseLanguage
  lastActiveAt

users/{uid}/progress/{languageId}
  languageId
  sectionId
  currentUnit
  currentLesson
  completedLessons[]
  openedChests[]
  mistakes[]
  accuracy
  updatedAt

users/{uid}/lessonSessions/{sessionId}
  languageId
  unitId
  lessonId
  startedAt
  completedAt
  totalQuestions
  correctCount
  mistakeCount
  xpEarned
  answers[]
```

Add quest and leaderboard data after lesson completion is stable:

```text
users/{uid}/dailyQuests/{yyyyMMdd}
users/{uid}/monthlyChallenges/{yyyyMM}
leaderboards/{period}/entries/{uid}
```

## Migration Phases

### Phase 0: Safety Baseline

1. Keep `im/patois-learn` as the canonical app; treat `im/diaspora-ludo` only as a disposable prototype/reference.
2. Confirm `.gitignore` still excludes `.env`, `serviceAccountKey.json`, and generated native folders.
3. Add `docs/ludolang-migration-plan.md` as the execution source of truth.
4. Run `npm run content:build`, `npm run images:registry`, and `npm run audio:dry-run` before UI changes to confirm content tooling still works.
5. Use `npx expo export --platform ios --output-dir outputs/build-check-ludolang-baseline` as the native bundle gate.

Acceptance: current app still signs in, loads Firestore/local curriculum, and starts a Patois lesson.

### Phase 1: Design System Foundation

1. Create `src/design/tokens.js` with color, spacing, radius, typography, elevation, animation durations, and sound cooldown constants.
2. Keep Plus Jakarta Sans and `expo-audio`.
3. Add reusable UI primitives inspired by Ludolang atoms:
   - `AppButton`
   - `IconButton`
   - `ProgressBar`
   - `StatPill`
   - `BottomSheet`
   - `ScreenScaffold`
   - `LessonCard`
   - `PathNode`
4. Replace native `Animated` usage gradually with `react-native-reanimated`; install with `npx expo install react-native-reanimated` when implementing.
5. Keep the current hybrid visual direction: polished warm/light onboarding and teaching, focused premium lesson panels where useful.

Acceptance: primitives render on Expo Go, no `Alert.alert`, no `expo-av`, and no old mascot as the main brand mascot.

### Phase 2: Content Repository Layer

1. Create `src/services/content/contentRepository.js`.
2. Move `loadCourseById`, `getCourseById`, `getPublishedUnits`, and Firestore fallback behavior behind this repository.
3. Add `useCourseTree(languageId)` that returns:
   - `course`
   - `sections`
   - `units`
   - `lessonsByUnit`
   - `flatLessons`
   - `loading`
   - `error`
   - `refresh`
4. Preserve current generated curriculum as the offline fallback.
5. Add `scripts/audit-content-shape.js` to verify every published language has valid order, ids, titles, and at least one unit before it appears as active.

Acceptance: all current languages still load; missing Firestore data falls back to generated content; no component reads Firestore directly.

### Phase 3: Ludolang-Style Learn Path

1. Build `features/learnPath/LearnPathScreen.js` to replace the large path portion of `HomeScreen.js`.
2. Port Ludolang's product behavior, not its web code:
   - sticky/current unit banner
   - scrollable lesson path
   - current lesson positioning
   - jump-to-current button
   - lesson node popover
   - locked, active, completed, chest, review, trophy node states
3. Keep native bottom tabs: Path, Practice, Quests, Profile, Shop.
4. Move stat bar into `AppShell`.
5. Show skeleton path placeholders while Firestore progress loads.

Acceptance: authenticated users land on the path, current lesson is visible, completed lessons reflect Firestore progress, and locked lessons cannot start.

### Phase 4: Lesson Session Engine

1. Create `features/lessonSession/useLessonSession.js`.
2. The hook owns phase order:
   - teaching intro
   - vocabulary cards
   - practice exercises
   - correction/tutor moments
   - lesson complete
3. Create an exercise registry:
   - `MultipleChoiceExercise`
   - `ImageChoiceExercise`
   - `AudioListenExercise`
   - `BuildSentenceExercise`
   - `MatchPairsExercise`
4. Keep the current click-word/bottom-display interaction where it is part of the lesson style, but house it as one exercise component rather than hardcoding it in the screen.
5. Audio rules:
   - use `expo-audio`
   - use existing `generatedAudioRegistry`
   - 500ms cooldown
   - no stacked sounds
   - missing phrase audio shows a disabled/retry state, not a crash
6. Mascot rules:
   - one original cat tutor
   - subtle idle motion on path and lesson teaching
   - mood changes only on meaningful feedback
   - language accessories are small and removable

Acceptance: one Patois lesson completes end to end with teaching, audio, three or more exercise types, wrong-answer feedback, XP, hearts, and session writes.

### Phase 5: Firestore Progress Mutations

1. Create `src/services/progress/progressRepository.js` and `src/services/progress/sessionRepository.js`.
2. Move the existing `userService.js` functions behind intent-named mutations:
   - `touchLastActive(uid)`
   - `selectCourse(uid, languageId)`
   - `createLessonSession(uid, payload)`
   - `recordAnswer(uid, sessionId, answer)`
   - `completeLesson(uid, payload)`
   - `completeUnit(uid, payload)`
   - `loseHeart(uid)`
   - `awardXp(uid, amount)`
3. Use Firestore increments for XP, hearts, gems, and quest counters.
4. Keep local optimistic updates, but refresh Firestore progress after lesson completion.
5. Add failure UI: retry, continue offline with unsynced session, or exit without losing local state.

Acceptance: lesson attempt, answer, wrong answer, XP award, lesson completion, and current lesson advance are all visible in Firestore.

### Phase 6: Quests, Leaderboard, Profile, Shop

1. Implement Ludolang-inspired feature folders after the path and lesson core are stable:
   - `features/quests`
   - `features/leaderboard`
   - `features/profile`
   - `features/shop`
2. Start with local/Firestore summaries, not a separate backend.
3. Quests derive from session events:
   - complete lessons
   - perfect lesson
   - earn XP
   - practice after mistake
4. Leaderboard derives from `users/{uid}.xp` or period entries.
5. Profile shows language progress, streak, XP, joined date, avatar/cat style, and current language.

Acceptance: tabs are useful, not empty placeholders; quest progress updates after lesson completion.

### Phase 7: Content Expansion

1. Treat workbook/JSON/generated curriculum as the content authoring path until a Firestore editor exists.
2. Keep Jamaican Patois as the quality bar.
3. Add language launch states:
   - `published`: visible and playable
   - `preview`: visible but marked coming soon
   - `draft`: hidden
4. Languages to prepare:
   - Jamaican Patois
   - Somali
   - Haitian Creole
   - Swahili
   - Kenyan languages
   - Sudanese Arabic
   - AAVE
   - Belizean Creole
5. Each published language must have:
   - at least one complete section
   - at least three units
   - at least six lessons in Unit 1
   - teaching words
   - cultural notes
   - audio plan
   - image/illustration plan

Acceptance: incomplete languages do not look broken; published languages follow the same structure.

### Phase 8: ElevenLabs Voice Pipeline

1. Keep `config/elevenlabs-voices.json` as the voice routing file.
2. Keep `.env` voice IDs and API key out of source control.
3. Use `npm run voices:audit` before changing voice IDs.
4. Generate audio in this order:
   - dry run by language
   - limited sample
   - full phrase audio
   - interaction/cutscene narration only after phrase quality is approved
5. Cache every generated file in `assets/audio/{languageId}` and rebuild `generatedAudioRegistry.js`.
6. Do not regenerate existing good audio unless `--force` is intentionally used.

Acceptance: new voice choices can be tested without spending large credit batches, and missing audio never blocks lesson play.

## Implementation Order

1. Add design tokens and reusable UI primitives.
2. Add content/progress repository wrappers while keeping old screens working.
3. Extract `HomeScreen` path into `features/learnPath`.
4. Extract lesson logic into `features/lessonSession`.
5. Wire Firestore mutations through repositories and verify with one Patois lesson.
6. Replace onboarding/course selection visuals with the new design system.
7. Add quests/profile/shop/leaderboard as real features.
8. Expand language content and audio.
9. Remove old duplicate components only after the new feature path owns the full flow.

## Testing Gates

Run these at each phase:

```powershell
npm run content:build
npm run images:registry
npm run audio:dry-run -- --language patois
npx expo export --platform ios --output-dir outputs/build-check-ludolang-phase-X
```

Manual Expo Go checks:

1. First launch onboarding works.
2. Returning Firebase user skips onboarding.
3. Course selection writes `currentCourse`.
4. Path loads with Firestore progress.
5. Current lesson opens.
6. Correct answer plays one success sound.
7. Wrong answer loses one heart and writes the answer.
8. Lesson completion awards XP and advances progress.
9. Missing Firestore content falls back to generated local content.
10. Missing audio shows a graceful disabled/retry state.

## Non-Goals

- Do not port Ludolang's Vite/React Router app directly into Expo.
- Do not add Spring/Kotlin/MySQL unless Firebase becomes a proven blocker.
- Do not migrate to Expo Router.
- Do not replace Firebase Auth.
- Do not make the mascot the whole product.
- Do not copy Ludolang assets, branding, or protected design details directly.

## Completion Definition

The migration is complete when `im/patois-learn` has:

1. A Ludolang-style path, lesson session, completion, profile, quests, and leaderboard structure.
2. Firebase Auth and Firestore as the only app backend.
3. Existing generated curriculum and Firestore content still loading.
4. Existing ElevenLabs pipeline still generating and registering audio.
5. Original Diaspora visual identity with the cat tutor and language accessories.
6. Verified Expo Go/iOS bundle and manual lesson completion evidence.
