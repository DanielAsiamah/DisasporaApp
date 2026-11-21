# Vocabulary Study Cards Design

## Intent

Diaspora should teach a visual word before asking the learner to recognise it.
The current image-choice exercise is polished and workbook-backed, but it can
be the learner's first exposure to that concept. Add an explicit, calm study
moment that makes the image, target-language form, English meaning,
pronunciation, and available audio easy to absorb before the quiz.

## Goals

- Insert one unscored vocabulary study card immediately before every generated
  image-choice exercise.
- Use only the current course's workbook vocabulary and statically registered
  course artwork.
- Show the target-language form as the primary text, followed by its English
  meaning and pronunciation when present.
- Reuse the controlled course-audio interface; never imply audio exists when a
  clip has not passed the existing approval gate.
- Continue with one obvious button. A study card must not award XP, consume a
  heart, affect accuracy, or enter mistake review.
- Keep the card accessible at phone widths and under reduced motion.

## Non-goals

- This increment does not invent translations for Nobiin, Belizean Kriol, or
  AAVE. Their canonical workbook rows remain blank and unavailable.
- It does not publish preview courses, approve native wording, generate audio,
  generate new artwork, or change Firebase schemas.
- It does not add speaking recognition or a new navigation surface.

## Constraints

- Expo Go and SDK 58 compatibility must remain intact.
- Workbook/generated curriculum remains the source of lesson language.
- Artwork must come from the selected course's image registry; no cross-course
  fallback is allowed.
- Existing answer, XP, heart, persistence, and mistake-review contracts remain
  unchanged for scored exercises.
- The unrelated untracked `journalism/` directory stays untouched.

## Approaches

### 1. Add more explanation inside the picture quiz

This is small, but it still teaches and tests simultaneously. It also makes the
answer screen busier and weakens the one-task-at-a-time lesson rhythm.

### 2. Synthesize missing course lessons at runtime

This would make more picker entries appear active, but three courses have blank
canonical target forms. A runtime fallback would hide missing source content and
could teach fabricated language. Rejected.

### 3. Add an explicit unscored vocabulary-card step (chosen)

The lesson builder emits a vocabulary card directly before each image choice.
The card and quiz share the same workbook concept and course image, so the
learning sequence is deterministic and traceable. The lesson modal treats the
card as study content and advances without answer evaluation or reward state.

## Data and Interfaces

- Add `VOCABULARY_CARD: 'vocabulary-card'` to
  `LESSON_EXERCISE_TYPES`.
- A generated card contains:
  `{ id, sourceStepId, type, title, prompt, conceptId, imageConceptId,
  localized, meaning, pronunciation, audioPath, voiceId, primary }`.
- Add `isUnscoredExercise(exercise)` to the lesson session model. It returns
  true only for the vocabulary-card type.
- Add a pure `buildVocabularyCardPresentation(exercise)` model returning
  display strings and accessibility copy for the card UI.

## Lesson Flow

For every eligible visual concept the generated sequence is:

1. Vocabulary card: look, listen if approved audio exists, and continue.
2. Image choice: select the matching illustration and receive normal feedback.

The study card is included in visible lesson progress, but not in checked-answer
accuracy, rewards, hearts, or mistake recall. If a topic has no complete image
set, its current exercise sequence remains unchanged.

## Visual Treatment

Use the established cream-and-ink system: a large course illustration, small
`NEW WORD` eyebrow, bold target phrase, restrained English meaning, optional
pronunciation pill, and the existing audio control. The normal guide scene and
quiz helper are suppressed so the card remains focused and does not duplicate
the artwork.

## Verification

- Builder tests prove every image choice is immediately preceded by exactly one
  same-concept card and that no cards appear without mapped images.
- Session tests prove cards are unscored and immediately ready to continue.
- Presentation tests cover complete and missing pronunciation data.
- The local core-loop verifier learns how to advance study cards.
- Full Node, content, image, environment, Expo Doctor, and SDK 58 iOS export
  checks must pass before pushing both authorized branches.
