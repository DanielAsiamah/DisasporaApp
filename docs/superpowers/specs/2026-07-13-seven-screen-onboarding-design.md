# Seven-Screen Onboarding Design

## Outcome

Replace the current dark guided onboarding with the approved light, portrait iPhone flow while leaving authentication, Home, lessons, and leaderboard behavior outside this increment unchanged.

Onboarding is completed once per learner account. A durable Firestore field, `onboardingCompleted: true`, is the only state that skips onboarding on a later launch or sign-in. AsyncStorage key `diaspora:onboarding-draft:v1` stores only unfinished local progress.

## Screen flow

1. **Welcome and name** — “Languages carry us home,” Amara hero art, “What should we call you?”, and a required preferred-name field.
2. **Base language** — “What language do you speak best?” with English, French, and Arabic.
3. **Course selection** — “What would you like to learn?” filtered by base language:
   - English: Jamaican Patois, Swahili
   - French: Wolof, Haitian Creole
   - Arabic: Sudanese Arabic, Nubian
4. **Motivation** — “What brings you here?” with Heritage, Family, Travel, and Community; Kai provides the hero art.
5. **Daily goal** — “Choose your daily rhythm” with 5, 10, 15, and 20 minutes; 10 minutes is the default.
6. **Starting level** — “Where should we begin?” with New learner, Know a few words, and Conversational; Know a few words is the default and Sol provides the hero art.
7. **Ready** — “Your path is ready,” all three characters, selected-course summary, a single 7:00 PM reminder switch, and “START LEARNING.”

## Visual system

- Light blue-to-white background local to onboarding; do not change the app-wide dark theme in this increment.
- Plus Jakarta Sans, navy text, bright blue controls, white cards, soft blue borders, continuous rounded corners, and an iOS-safe portrait layout.
- Reuse the transparent original character files at `assets/guides/amara.png`, `kai.png`, and `sol.png`.
- Use restrained Reanimated motion: 230 ms screen transitions, gentle character breathing/float, slow cloud drift, button press feedback, and selection haptics.
- No cat mascot, video guide, microphone, speech recognition, or runtime text-to-speech is added.

## State and data rules

- Defaults: English, Jamaican Patois, Heritage, 10 minutes, Know a few words, reminder enabled at `19:00`.
- Changing the base language replaces an incompatible course with the first valid course for that base language.
- Hydration accepts only known onboarding fields and discards legacy courses not in the six-course MVP.
- Firestore profile data takes precedence over an unfinished local draft for authenticated learners.
- Completing screen 7 trims the learner name, sets `onboardingCompleted: true`, records `selectedStartUnit`, syncs the profile, schedules or cancels the reminder, removes the local draft, and hands off to the existing Home screen.
- A profile with `onboardingCompleted` missing or false must enter onboarding; only the literal value `true` skips it.

## Course-content boundary

The selector includes all six requested courses. Sudanese Arabic and Nubian currently have no generated units; this increment does not fabricate lessons. Their content is a later workbook/lesson-engine increment.

## Verification

- Pure Node tests cover the seven-step order, language-to-course filtering, base-language switching, hydration, defaults, completion payload, and one-time route decision.
- Existing Node tests must remain green.
- Expo dependency validation and an iOS bundle export must pass.
- Manual iPhone proof: finish onboarding with a test account, relaunch, and confirm Home opens without replaying onboarding; sign out and back into the same account and confirm the same behavior.
