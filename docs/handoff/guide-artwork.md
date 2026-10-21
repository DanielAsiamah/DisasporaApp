# Original Diaspora Guide Artwork

The lesson cast includes Kai, Amara, Sol, Nia, Kofi, Ayo, and Safiya. The active
topic's workbook guide speaks first; the remaining original guides rotate
without duplicates. This presentation layer does not change workbook wording,
lesson IDs, XP contracts, or course release status. The characters are fictional
learning companions, not claims of native-speaker review or national identity.

## New Assets

- `assets/guides/ayo.png`: original adult human guide in a mustard overshirt.
- `assets/guides/safiya.png`: original adult human guide in a teal hijab.

Both were created using Codex's built-in image-generation tool, with
`assets/guides/nia.png` supplied only as an existing Diaspora style reference.
The generated originals were copied into the repository without replacing older
artwork. Both PNGs retain their alpha channel. No commercial app art was used.

## Generation Prompts

### Ayo

Use case: stylized-concept. Create one new original human guide for Diaspora, an
African and Caribbean language learning app. Reference image is STYLE REFERENCE
ONLY: match its warm polished 3D cartoon finish, expressive kind face, clean
readable silhouette and friendly proportions, but create a distinct person, not
Nia. Subject: Ayo, a Black adult man with deep brown skin, short natural coils
with a touch of grey at the temples, round amber glasses, a mustard-orange casual
overshirt over a cream tee. Warm encouraging smile. One hand gives a relaxed
thumbs-up near shoulder, other hand relaxed. Three-quarter waist-up portrait,
facing slightly toward viewer's right, full head and both hands visible with
ample transparent padding. Composition suitable for a small in-app speaking
companion at 72x100 points. Isolated genuinely transparent background, alpha
channel, no floor or backdrop, no text, no logo, no watermark, no flags, no animal,
no existing commercial mascot. Preserve the original Diaspora visual family
without copying other apps.

### Safiya

Use case: stylized-concept. Create one original human guide named Safiya for
Diaspora, an African and Caribbean language learning app. Input image is STYLE
REFERENCE ONLY: preserve the warm polished 3D cartoon style, friendly expressive
eyes and appealing proportions, NOT the identity or outfit. New subject: a Black
young adult woman with deep brown skin, a neatly draped teal hijab, relaxed
pale-peach long-sleeved overshirt, simple navy inner top, warm encouraging smile.
One hand is raised in a small friendly open-palmed wave beside her shoulder,
other hand relaxed. Friendly contemporary everyday person, not ceremonial
costume. Waist-up three-quarter portrait looking slightly toward viewer's left;
complete head and waving hand visible with transparent padding. Clean strong
silhouette readable at 72x100 in a lesson speech-bubble scene. Genuinely
transparent background alpha channel, no environment or floor, no writing, no
logos or watermark, no flags, no animal, no commercial mascots. Make her distinct
from Nia and from existing branded app characters.

## Motion

`AnimatedGuide` shares one asset registry between Learn, lessons, and leaderboard
avatars. It uses native-driver transforms: gentle idle breathing, a finite
celebration bounce, and a small encouragement tilt. Reactions settle at rest;
reduced motion disables every transform. These are animated portraits, not
frame-by-frame or skeletal character rigs.

To include rendered animation and accessibility checks in the local emulator
browser walkthrough, set `DIASPORA_TEST_GUIDE_MOTION=true` when running
`npm run test:app:browser`. The walkthrough also verifies loaded character
images, both new guides appearing in the chapter, and consistent speakers
between the question and answer feedback.

On 2026-10-20 this browser check passed at 390px: both new guides appeared with
loaded images, idle motion changed the rendered transform, and enabling reduced
motion returned the guide to an identity transform. Question and feedback
speakers matched for correct and wrong answers. The first Patois topic completed
with seven exercises, two mistake-review questions, and 70 saved XP; reload,
sign-in recovery, and leaderboard opt-in/out passed with no page errors or
production Firebase requests. Screenshots are in the ignored
`outputs/browser-smoke/guide-ayo.png` and `guide-safiya.png`. This is browser
evidence, not a physical iPhone test.
