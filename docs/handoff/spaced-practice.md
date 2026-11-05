# Spaced Practice Handoff

Diaspora's personalised review is a first-party, transparent learning model.
It does not copy another product's scoring formula or private implementation.

## Learner Flow

- A missed exercise enters the existing local and Firestore-backed mistake queue.
- Due exercises appear in the Learn screen's current-focus card without waiting
  for the learner to finish the whole chapter.
- A correct review schedules the exercise one day later, then three days later.
- A third correct spaced review removes the mastered exercise from the queue.
- Missing it again resets the successful-review count and makes it due again.
- Completing a mid-chapter review resumes the learner's active curriculum topic
  instead of incorrectly announcing chapter completion.

## Compatibility

Legacy mistake records are normalized when loaded. New fields are additive:
`lastReviewedAt`, `nextReviewAt`, `successfulReviews`, and `updatedAt`. Local and
cloud mirrors choose the newest record, which prevents an older cloud snapshot
from undoing a newer miss or review.

The model remains in `src/lessonExperience/adaptiveMistakeReview.cjs` and uses
the existing progress document; no Firestore migration is required.
