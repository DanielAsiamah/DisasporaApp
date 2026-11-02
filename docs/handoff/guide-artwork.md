# Original Diaspora Guide Artwork

The lesson cast includes Kai, Amara, Sol, Nia, Kofi, Ayo, Safiya, Nneka, and
Chidi. The active topic's workbook guide speaks first; the remaining original
guides rotate without duplicates. This presentation layer does not change workbook wording,
lesson IDs, XP contracts, or course release status. The characters are fictional
learning companions, not claims of native-speaker review or national identity.

## New Assets

- `assets/guides/ayo.png`: original adult human guide in a mustard overshirt.
- `assets/guides/safiya.png`: original adult human guide in a teal hijab.
- `assets/guides/nneka.png`: original Igbo guide in a coral contemporary blouse.
- `assets/guides/chidi.png`: original Igbo guide in a deep-indigo overshirt.

Ayo and Safiya were created using Codex's built-in image-generation tool, with
`assets/guides/nia.png` supplied only as an existing Diaspora style reference.
Nneka and Chidi were generated with Amara, Ayo, and Safiya supplied as style
references only. The generated originals were copied into the repository without
replacing older artwork. All PNGs retain their alpha channel. No commercial app
art was used.

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

### Nneka

Use case: stylized-concept. Create Nneka, an original friendly young adult Igbo
woman language guide with deep brown skin, warm brown eyes, and natural twists
partly gathered back. Modern coral blouse with subtle geometric woven trim,
turquoise pendant, cream trousers, and one open palm inviting an answer. Match
the existing cast's polished 3D finish without copying an identity, pose, or
outfit. Mid-thigh cutout with complete hair and hands, warm studio light,
genuinely transparent background, clean alpha, no text, logo, flag, animal,
watermark, or protected mascot.

### Chidi

Use case: stylized-concept. Create Chidi, an original friendly young adult Igbo
man language guide with rich dark brown skin, short tapered natural hair, and a
subtle beard. Modern deep-indigo overshirt with restrained bronze geometric trim
over a cream shirt; one hand shares a language tip and the other holds a blank
notebook. Match the existing cast's polished 3D finish without copying an
identity, pose, or outfit. Mid-thigh cutout with complete hair, hands, and
notebook, warm studio light, genuinely transparent background, clean alpha, no
text, logo, flag, animal, watermark, or protected mascot.

The built-in generator emitted subject alpha with a maximum value of 254. The
project's existing PNG parser/encoder restored only those core pixels to 255;
transparent and antialiased edge pixels were preserved. Both 1024x1536 assets
then passed `auditPngBuffer` for real transparency, opaque subject core, clean
corners, dimensions, metadata, and strict halo checks.

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

On 2026-11-02 the SDK 58 browser walkthrough rendered Chidi in the Igbo chapter
hero and loaded the Nneka-led lesson cast through idle, wrong-answer, completion,
reload, sign-out/sign-in, and leaderboard flows. No page errors or production
Firebase requests occurred. This remains browser evidence, not a physical
iPhone test.
