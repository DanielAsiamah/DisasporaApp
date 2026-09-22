# Friendly Lesson Refresh

## User Direction

Use a friendlier font, show rejected matches in red with a sound, expand the
original human guide cast, and prioritize useful conversational phrases over
trivial identical-word translation questions. Keep Diaspora's own art and layout;
do not copy another app's characters, screens, or lesson content.

## Implemented

- Nunito's bundled regular through black weights replace Plus Jakarta Sans in
  the app theme and root loading/error screens.
- Both rejected matching cards remain red until the next selection. Text and
  accessibility labels identify the error without relying on color alone.
  The existing wrong-answer sound fires once per rejected attempt. Rejected
  pairs now count toward lesson mistakes and accuracy, without awarding XP.
- Nia and Kofi join Kai, Amara, and Sol beside lesson prompts. Their PNGs were
  AI-generated on 2026-09-22 using Kai as a visual-style reference, not as a
  source of language expertise. They are original human guides, not animals.
- Prompt speech bubbles and a bounded desktop lesson column replace the
  stretched full-width prompt presentation. Matching omits the decorative
  vocabulary stage to leave room for the interaction.
- Silent translation quizzes whose source and target are identical are omitted.
  Real approved listening exercises remain eligible. One-word word trays become
  quick choices rather than artificial sentence-building tasks.
- Getting Started introduces the same course's workbook greeting match and two
  longer word-bank exercises. The source workbook and generated projection are
  unchanged. Borrowed exercises retain their source-step IDs and receive unique
  introductory IDs; the full greeting topic remains available for later practice.

## Verification Scope

The browser regression now deliberately mismatches a phrase pair and checks both
red cards, Nunito styling, and a single wrong-sound playback call before retrying.
It also checks completion totals, retained progress, and leaderboard membership
against isolated Firebase emulators. This is not physical-device audio testing.

This is an introductory lesson-quality improvement, not a complete advanced
curriculum. The master spreadsheet still needs target-language content and
native-speaker review. No release gate or audio approval requirement was bypassed.
