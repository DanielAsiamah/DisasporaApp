const { chromium } = require(process.env.DIASPORA_PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const heartLabelPattern = expected => new RegExp('^' + expected + ' of 5 hearts remaining(?:\\.|$)');
const escapePattern = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
(async () => {
  const appUrl = new URL(process.env.DIASPORA_APP_URL || 'http://localhost:8086');
  if (!['localhost', '127.0.0.1'].includes(appUrl.hostname) || appUrl.protocol !== 'http:') throw new Error('Only local emulator previews may be tested.');
  const courseId = process.env.DIASPORA_TEST_COURSE || 'jamaican-patois';
  const makeMistakes = process.env.DIASPORA_TEST_PERFECT !== 'true';
  const muteEffects = process.env.DIASPORA_TEST_MUTED === 'true';
  const useCoursePicker = process.env.DIASPORA_TEST_COURSE_PICKER === 'true';
  const previewCourses = ['jamaican-patois', 'swahili', 'wolof', 'haitian-creole', 'sudanese-arabic', 'igbo'];
  if (!previewCourses.includes(courseId)) throw new Error('This course does not have an implemented lesson preview.');
  const { getCourseById } = require('../src/data/courseCatalog.cjs');
  const { buildCourseTopicExercises } = require('../src/lessonEngine/patoisLessonSteps.cjs');
  const { getRuntimeCurriculum } = require('../src/data/runtimeCurriculum.cjs');
  const { getPromptGuideName } = require('../src/lessonExperience/lessonGuidePresentation.cjs');
  const courseTopics = id => getRuntimeCurriculum(id).topics.filter(topic => topic.courseId === id).sort((a, b) => a.order - b.order);
  const curriculum = getRuntimeCurriculum(courseId);
  const topics = courseTopics(courseId);
  const hasCourseImage = conceptId => fs.existsSync(path.join(
    __dirname,
    '..',
    'assets',
    'images',
    'vocab',
    courseId,
    `${conceptId}.png`
  ));
  const firstLessonName = new RegExp(`${escapePattern(topics[0].title)}\\. Lesson`);
  require('node:fs').mkdirSync('outputs/browser-smoke', { recursive: true });
  const hub = await fetch('http://127.0.0.1:4400/emulators', { signal: AbortSignal.timeout(5000) }).then(response => response.json());
  if (!hub.auth || !hub.firestore) throw new Error('Start the local Firebase emulators first.');
  const browser = await chromium.launch({ headless: true, executablePath: process.env.DIASPORA_CHROMIUM_EXECUTABLE || undefined });
  let page;
  const initialHeartLabel = '5 of 5 hearts remaining';
  const errors = [];
  const networkFailures = [];
  const pendingRequests = new Map();
  const requestSummary = request => {
    const url = new URL(request.url());
    return { host: url.host, path: url.pathname, type: request.resourceType() };
  };
  try {
    page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    async function currentHeartCount(expected) {
      await page.getByLabel(heartLabelPattern(expected)).last().waitFor();
    }
    async function refillHeartsIfEmpty() {
      const emptyDialog = page.getByRole('heading', { name: 'Your hearts need a refill', exact: true });
      if (!await emptyDialog.isVisible().catch(() => false)) return;
      await page.setViewportSize({ width: 320, height: 568 });
      await page.screenshot({ path: `outputs/browser-smoke/refill-${courseId}.png` });
      const kicker = page.getByText('TAKE A BREATH', { exact: true });
      await kicker.scrollIntoViewIfNeeded();
      const topBounds = await kicker.boundingBox();
      if (!topBounds || topBounds.y < 0) throw new Error('The top of the refill card must remain reachable on a short phone.');
      const refillNote = page.getByText('Beta refill · No charge during early access', { exact: true });
      await refillNote.scrollIntoViewIfNeeded();
      const bottomBounds = await refillNote.boundingBox();
      if (!bottomBounds || bottomBounds.y + bottomBounds.height > 568) throw new Error('The bottom of the refill card must remain reachable on a short phone.');
      await page.getByRole('button', { name: 'Refill hearts', exact: true }).click();
      await currentHeartCount(5);
      await page.setViewportSize({ width: 390, height: 844 });
      console.log('Refill restored five hearts on a 320px phone without leaving the lesson.');
    }
    async function checkGuideImage(testId) {
      const guide = page.getByTestId(testId);
      await guide.waitFor();
      await page.waitForFunction(id => {
        const root = document.querySelector(`[data-testid="${id}"]`);
        const image = root?.querySelector('img');
        return image?.complete && image.naturalWidth > 0;
      }, testId);
      return guide.getAttribute('aria-label');
    }
    async function sampleGuideMotion() {
      return page.getByTestId('lesson-prompt-guide').evaluate(node => new Promise(resolve => {
        const transforms = new Set();
        const start = performance.now();
        function frame() {
          transforms.add(getComputedStyle(node).transform);
          if (performance.now() - start > 500) resolve([...transforms]);
          else requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
      }));
    }
    async function selectCourse(id) {
      await page.getByRole('button', { name: /^Change language, current course / }).click({ timeout: 60000 });
      const label = getCourseById(id).label;
      await page.getByRole('button', { name: `${label}, Draft lessons`, exact: true }).click();
      await page.getByRole('button', { name: `Change language, current course ${label}`, exact: true }).waitFor();
    }
    await page.addInitScript(() => {
      window.__lessonAudioPlays = [];
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function (...args) {
        window.__lessonAudioPlays.push(this.src);
        return play.apply(this, args);
      };
    });
    const blocked = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', request => pendingRequests.set(request, requestSummary(request)));
    page.on('requestfinished', request => pendingRequests.delete(request));
    page.on('requestfailed', request => {
      pendingRequests.delete(request);
      networkFailures.push({ ...requestSummary(request), error: request.failure()?.errorText });
      if (networkFailures.length > 30) networkFailures.shift();
    });
    await page.route(/https:\/\/(identitytoolkit|firestore|securetoken)\.googleapis\.com\//, (route) => {
      blocked.push(new URL(route.request().url()).hostname);
      return route.abort();
    });
    await page.goto(appUrl.href, { timeout: 120000 });
    await page.getByRole('button', { name: 'START YOUR PATH', exact: true }).waitFor({ timeout: 120000 });
    await page.waitForFunction(() => [...document.querySelectorAll('img')].every(image => image.complete && image.naturalWidth > 0));
    await page.screenshot({ path: 'outputs/browser-smoke/welcome.png' });
    await page.getByText('START YOUR PATH', { exact: true }).click({ timeout: 120000 });
    await page.getByLabel('Preferred name', { exact: true }).fill('Local Learner');
    await page.getByRole('button', { name: 'CONTINUE', exact: true }).click();
    for (const choice of ['English', 'Jamaican Patois', 'Heritage', '10 minutes', 'New learner']) {
      await page.getByText(choice, { exact: true }).click();
      await page.screenshot({ path: `outputs/browser-smoke/onboarding-${choice.replace(/\s+/g, '-').toLowerCase()}.png` });
      await page.getByRole('button', { name: 'CONTINUE', exact: true }).click();
    }
    await page.getByRole('button', { name: 'START LEARNING.', exact: true }).click();
    await page.getByText('CONTINUE WITH EMAIL', { exact: true }).click();
    await page.screenshot({ path: 'outputs/browser-smoke/signup.png' });
    const email = `local-${Date.now()}@example.test`;
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill('LocalOnly123!');
    await page.getByLabel('Confirm password', { exact: true }).fill('LocalOnly123!');
    await page.getByRole('button', { name: 'Create account', exact: true }).click();
    await page.getByText('Verify your email', { exact: true }).waitFor({ timeout: 60000 });
    await page.getByText('Continue for now', { exact: true }).click();
    await page.getByRole('tab', { name: /Learn, 1 of 3/ }).waitFor({ timeout: 60000 });
    await page.getByLabel(initialHeartLabel, { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Account', exact: true }).click();
    const soundSwitch = page.getByRole('switch', { name: 'Sound effects', exact: true });
    if (!await soundSwitch.isChecked()) throw new Error('New learners must get sound effects by default.');
    await soundSwitch.uncheck();
    await page.getByText('Sound preference saved to your account.', { exact: true }).waitFor();
    await page.reload();
    await page.getByRole('button', { name: 'Account', exact: true }).click({ timeout: 60000 });
    if (await soundSwitch.isChecked()) throw new Error('Muted sound preference must survive reload.');
    if (!muteEffects) {
      await soundSwitch.check();
      await page.getByText('Sound preference saved to your account.', { exact: true }).waitFor();
    }
    await page.getByRole('button', { name: 'Close account', exact: true }).click();
    console.log(`Sound preference saved, reloaded, and ${muteEffects ? 'kept off' : 're-enabled'}.`);
    if (useCoursePicker) {
      await page.getByRole('button', { name: /^Change language, current course / }).click();
      for (const id of ['nobiin', 'belizean-kriol', 'aave']) {
        const option = page.getByRole('button', { name: `${getCourseById(id).label}, Content in preparation`, exact: true });
        if (await option.isEnabled()) throw new Error(`Incomplete course ${id} must stay disabled.`);
      }
      await page.screenshot({ path: 'outputs/browser-smoke/language-picker.png' });
      await page.getByRole('button', { name: 'Close language picker', exact: true }).click();
      for (const id of previewCourses) {
        await selectCourse(id);
        const available = courseTopics(id);
        await page.getByText(`0 of ${available.length} topics complete`, { exact: true }).waitFor();
        await page.getByRole('button', { name: new RegExp(`${escapePattern(available[0].title)}\\. Lesson`) }).click();
        const first = buildCourseTopicExercises(id, available[0].id, {
          hasAudio: () => false,
          hasImage: conceptId => fs.existsSync(path.join(__dirname, '..', 'assets', 'images', 'vocab', id, `${conceptId}.png`)),
        })[0];
        await page.getByText(first.prompt, { exact: true }).waitFor();
        await page.getByRole('button', { name: 'Close lesson', exact: true }).click();
        await page.getByRole('button', { name: 'Leave lesson', exact: true }).click();
      }
      await selectCourse(courseId);
      console.log('All six draft courses opened their own lesson; three incomplete courses stayed disabled.');
    }
    console.log(JSON.stringify({ stage: 'learn', text: await page.locator('body').innerText() }));
    if (courseId === 'igbo') {
      await page.getByTestId('master-preview-coverage').filter({ hasText: '4 of 4 planned lessons' }).waitFor();
      await page.getByRole('button', { name: /Igbo full course path/ }).click();
      await page.getByRole('button', { name: /1 Foundations Greetings 4 planned lessons/ }).click();
      await page.getByRole('button', { name: 'Greetings 1, Play draft lesson', exact: true }).click();
    } else await page.getByRole('button', { name: firstLessonName }).click();
    const firstHintExercise = buildCourseTopicExercises(courseId, topics[0].id, {
      concepts: curriculum.concepts,
      vocabulary: curriculum.courseVocabulary.filter(row => row.courseId === courseId),
      hasAudio: () => false,
      hasImage: hasCourseImage,
    })[0];
    let selectedResponse;
    if (firstHintExercise.choices || firstHintExercise.imageChoices) {
      const radio = page.getByRole('radio').first();
      await radio.click();
      selectedResponse = { kind: 'radio', label: await radio.getAttribute('aria-label') };
      await page.waitForFunction(() => document.querySelector('[role="radio"][aria-checked="true"]'));
    } else if (firstHintExercise.pairs) {
      const phrase = firstHintExercise.leftItems[0].value;
      await page.getByRole('button', { name: `Phrase: ${phrase}, not selected`, exact: true }).click();
      selectedResponse = { kind: 'match', phrase };
      await page.getByRole('button', { name: `Phrase: ${phrase}, selected`, exact: true }).waitFor();
    } else {
      const word = firstHintExercise.answerTokens[0];
      await page.getByRole('button', { name: `Add word: ${word}`, exact: true }).click();
      selectedResponse = { kind: 'word', word };
      await page.getByText('1 words placed', { exact: true }).waitFor();
    }
    await page.getByRole('button', { name: 'Close lesson', exact: true }).click();
    await page.getByText('Leave this lesson?', { exact: true }).waitFor();
    await page.screenshot({ path: `outputs/browser-smoke/exit-${courseId}.png` });
    await page.getByRole('button', { name: 'Keep learning', exact: true }).click();
    if (selectedResponse.kind === 'radio'
      && await page.getByRole('radio', { name: selectedResponse.label, exact: true }).getAttribute('aria-checked') !== 'true') {
      throw new Error('Cancelling exit must preserve the selected answer.');
    }
    if (selectedResponse.kind === 'match') {
      await page.getByRole('button', { name: `Phrase: ${selectedResponse.phrase}, selected`, exact: true }).waitFor();
    }
    if (selectedResponse.kind === 'word') await page.getByText('1 words placed', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Close lesson', exact: true }).click();
    await page.getByRole('button', { name: 'Leave lesson', exact: true }).click();
    await page.getByText(`0 of ${topics.length} topics complete`, { exact: true }).waitFor();
    await page.getByLabel('0 experience points', { exact: true }).waitFor();
    await page.getByRole('button', { name: firstLessonName }).click();
    if (await page.getByRole('radio', { checked: true }).count()
      || await page.getByRole('button', { name: /, selected$/ }).count()
      || await page.getByText('1 words placed', { exact: true }).count()) {
      throw new Error('An intentionally exited lesson must restart with a fresh response.');
    }
    if (!firstHintExercise?.studyPhrase || !firstHintExercise?.studyTranslation) {
      throw new Error('The first lesson exercise must expose a verified phrase hint.');
    }
    const firstHintToken = firstHintExercise.studyPhrase.split(/\s+/u)[0];
    const firstHintButton = page.getByRole('button', {
      name: `Word ${firstHintToken}, show phrase translation`,
      exact: true,
    });
    await firstHintButton.click();
    const phraseHintBubble = page.getByTestId('phrase-translation-bubble');
    await phraseHintBubble.getByText(firstHintExercise.studyTranslation, { exact: true }).waitFor();
    await phraseHintBubble.getByText('This is the verified meaning of the complete phrase.', { exact: true }).waitFor();
    await page.screenshot({ path: `outputs/browser-smoke/phrase-hint-${courseId}.png` });
    await firstHintButton.click();
    await phraseHintBubble.waitFor({ state: 'detached' });
    if (await page.getByRole('radio', { checked: true }).count()) {
      throw new Error('Opening a phrase hint must not select an answer.');
    }
    console.log(`Tapped ${firstHintToken}; verified contextual phrase translation without changing the answer.`);
    console.log('Lesson exit cancelled without losing selection; confirmed exit left the topic incomplete.');
    if (process.env.DIASPORA_TEST_GUIDE_MOTION === 'true') {
      await checkGuideImage('lesson-prompt-guide');
      if ((await sampleGuideMotion()).length !== 1) throw new Error('Reduced motion must keep the guide still.');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      if ((await sampleGuideMotion()).length < 2) throw new Error('The guide must animate when motion is enabled.');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.waitForFunction(() => {
        const node = document.querySelector('[data-testid="lesson-prompt-guide"]');
        const matrix = new DOMMatrixReadOnly(getComputedStyle(node).transform);
        return matrix.isIdentity;
      });
      console.log('Guide breathing animates and stops at rest when reduced motion is enabled.');
    }
    const { CORRECT_ANSWER_XP } = require('../src/lessonEngine/lessonXpReward.cjs');
    const testedTopics = process.env.DIASPORA_TEST_FULL_CHAPTER === 'true' ? topics : topics.slice(0, 1);
    let totalXp = 0;
    const seenGuides = new Set();
    for (const [topicIndex, topic] of testedTopics.entries()) {
    const exercises = buildCourseTopicExercises(courseId, topic.id, {
      concepts: curriculum.concepts,
      vocabulary: curriculum.courseVocabulary.filter(row => row.courseId === courseId),
      hasAudio: () => false,
      hasImage: hasCourseImage,
    });
    const expectedXp = exercises.length * CORRECT_ANSWER_XP;
    const missedExercises = makeMistakes ? exercises.filter((exercise, index) => exercise.pairs || (topicIndex === 0 && index === 0)) : [];
    const testSequence = [...exercises, ...missedExercises];
    const firstExerciseAcceptsWrongChoice = Boolean(exercises[0]?.choices || exercises[0]?.imageChoices);
    const checkedAnswers = testSequence.length + (makeMistakes
      ? (topicIndex === 0 && firstExerciseAcceptsWrongChoice ? 1 : 0) + exercises.filter(exercise => exercise.pairs).length
      : 0);
    const expectedAccuracy = Math.round(testSequence.length / checkedAnswers * 100);
    if (topicIndex === 0 && makeMistakes && (exercises[0].choices || exercises[0].imageChoices)) {
    const first = exercises[0];
    const wrongIndex = first.choices
      ? first.choices.findIndex(choice => choice !== first.answer)
      : first.imageChoices.findIndex(choice => choice.conceptId !== first.answer);
    const wrongLabel = first.choices
      ? `${first.choices[wrongIndex]}, answer ${wrongIndex + 1} of ${first.choices.length}`
      : `${first.imageChoices[wrongIndex].label}, image answer ${wrongIndex + 1} of ${first.imageChoices.length}`;
    await page.getByRole('radio', { name: wrongLabel, exact: true }).click();
    await page.getByRole('button', { name: 'Check answer', exact: true }).click();
    await currentHeartCount(4);
    const wrongGuide = await checkGuideImage('lesson-feedback-guide');
    if (wrongGuide !== await page.getByTestId('lesson-prompt-guide').getAttribute('aria-label')) {
      throw new Error('Wrong-answer encouragement must keep the same speaking guide.');
    }
    await page.getByRole('button', { name: 'Try again', exact: true }).click();
    await currentHeartCount(4);
    }
    for (const [stepIndex, exercise] of testSequence.entries()) {
      const speakingGuide = await checkGuideImage('lesson-prompt-guide');
      seenGuides.add(speakingGuide);
      if (speakingGuide === 'Ayo guide' || speakingGuide === 'Safiya guide') {
        await page.getByTestId('lesson-prompt-guide').scrollIntoViewIfNeeded();
        await page.screenshot({ path: `outputs/browser-smoke/guide-${speakingGuide.split(' ')[0].toLowerCase()}.png` });
      }
      const isRecall = stepIndex >= exercises.length;
      if (isRecall) {
        await page.getByText('Mistake practice', { exact: true }).waitFor();
        await page.waitForFunction(() => {
          const rect = document.querySelector('[data-testid="mistake-practice-banner"]')?.getBoundingClientRect();
          return rect && rect.top >= 0 && rect.bottom <= innerHeight;
        });
        if (stepIndex === exercises.length && exercise.choices) {
          const secondChoice = await page.getByRole('radio').nth(1).boundingBox();
          if (!secondChoice || secondChoice.y + secondChoice.height > 750) throw new Error('Recall prompt should leave at least two answer choices visible above the phone footer.');
        }
        if (stepIndex === exercises.length) await page.screenshot({ path: `outputs/browser-smoke/recall-${courseId}.png` });
      }
      if (exercise.choices) {
        await page.getByRole('radio', { name: `${exercise.answer}, answer ${exercise.choices.indexOf(exercise.answer) + 1} of ${exercise.choices.length}`, exact: true }).click();
      } else if (exercise.imageChoices) {
        const answerIndex = exercise.imageChoices.findIndex(choice => choice.conceptId === exercise.answer);
        const answerChoice = exercise.imageChoices[answerIndex];
        await page.getByRole('radio', {
          name: `${answerChoice.label}, image answer ${answerIndex + 1} of ${exercise.imageChoices.length}`,
          exact: true,
        }).click();
      } else if (exercise.answerTokens) {
        const used = new Set();
        const selected = [];
        for (const token of exercise.answerTokens) {
          const index = exercise.wordBank.findIndex((word, index) => word === token && !used.has(index));
          if (index < 0) throw new Error(`Missing word-bank token: ${token}`);
          used.add(index);
          const duplicate = exercise.wordBank.filter(word => word === token).length > 1;
          const name = `Add word: ${token}${duplicate ? `, option ${index + 1}` : ''}`;
          await page.getByRole('button', { name, exact: true }).click();
          selected.push({ token, name });
          await page.getByText(`${selected.length} words placed`, { exact: true }).waitFor();
        }
        const last = selected.at(-1);
        await page.getByRole('button', { name: `Remove word: ${last.token}, position ${selected.length} of ${selected.length}`, exact: true }).click();
        await page.getByText(`${selected.length - 1} words placed`, { exact: true }).waitFor();
        await page.getByRole('button', { name: last.name, exact: true }).click();
        await page.getByText(`${selected.length} words placed`, { exact: true }).waitFor();
        const rtl = /[\u0600-\u06ff]/u.test(exercise.answer);
        const wordBounds = [];
        for (const [index, word] of selected.entries()) {
          wordBounds.push(await page.getByRole('button', {
            name: `Remove word: ${word.token}, position ${index + 1} of ${selected.length}`, exact: true,
          }).boundingBox());
        }
        for (let index = 1; index < wordBounds.length; index++) {
          const previous = wordBounds[index - 1];
          const current = wordBounds[index];
          if (!previous || !current) throw new Error('Selected words must remain visible.');
          if (Math.abs(previous.y - current.y) < 3 && (rtl ? previous.x <= current.x : previous.x >= current.x)) {
            throw new Error(`Answer words must flow ${rtl ? 'right-to-left' : 'left-to-right'}: ${exercise.answer}`);
          }
        }
        if (rtl) await page.screenshot({ path: `outputs/browser-smoke/rtl-${courseId}.png` });
      } else {
        if (!isRecall && makeMistakes) {
        const firstPair = exercise.pairs[0];
        const wrongPair = exercise.pairs[1];
        await page.getByRole('button', { name: new RegExp(`^Phrase: ${escapePattern(firstPair.localized)},`) }).click();
        const playsBefore = await page.evaluate(() => window.__lessonAudioPlays.length);
        await page.getByRole('button', { name: new RegExp(`^Meaning: ${escapePattern(wrongPair.meaning)},`) }).click();
        const rejected = page.getByRole('button', { name: /incorrect match$/ });
        if (await rejected.count() !== 2) throw new Error('Both mismatched cards must stay visibly rejected.');
        const rejectedColor = await rejected.first().evaluate(node => getComputedStyle(node).backgroundColor);
        if (rejectedColor !== 'rgb(255, 240, 240)') throw new Error(`Expected red mismatch background, got ${rejectedColor}`);
        const font = await page.getByText('Not a match', { exact: true }).first().evaluate(node => getComputedStyle(node).fontFamily);
        if (!font.includes('Inter')) throw new Error(`Expected readable Inter UI font, got ${font}`);
        const playsAfter = await page.evaluate(() => window.__lessonAudioPlays);
        if (muteEffects) {
          if (playsAfter.length !== playsBefore) throw new Error('Muted mismatch must not trigger a sound.');
        } else if (playsAfter.length !== playsBefore + 1 || !playsAfter.at(-1).includes('wrong')) throw new Error('Mismatch must trigger the wrong-answer sound once.');
        await refillHeartsIfEmpty();
        await rejected.first().scrollIntoViewIfNeeded();
        await page.screenshot({ path: `outputs/browser-smoke/mismatch-${courseId}.png` });
        await page.setViewportSize({ width: 1440, height: 900 });
        const desktopBounds = await rejected.first().boundingBox();
        if (!desktopBounds || desktopBounds.width > 400) throw new Error('Desktop lesson cards must remain in a readable centered column.');
        const fontLoaded = await page.evaluate(() => document.fonts.check('16px "Inter_700Bold"'));
        if (!fontLoaded) throw new Error('Inter must actually load, not fall back to a browser font.');
        await page.screenshot({ path: `outputs/browser-smoke/mismatch-desktop-${courseId}.png` });
        await page.setViewportSize({ width: 390, height: 844 });
        console.log(`Rejected pair: two red cards, Inter font, incorrect sound ${muteEffects ? 'muted' : 'triggered once'}.`);
        }
        for (const pair of exercise.pairs) {
          const phraseButton = page.getByRole('button', { name: new RegExp(`^Phrase: ${escapePattern(pair.localized)},`) });
          const meaningButton = page.getByRole('button', { name: new RegExp(`^Meaning: ${escapePattern(pair.meaning)},`) });
          await phraseButton.scrollIntoViewIfNeeded();
          await phraseButton.click();
          await meaningButton.scrollIntoViewIfNeeded();
          await meaningButton.click();
        }
      }
      await page.getByRole('button', { name: 'Check answer', exact: true }).click();
      if (await checkGuideImage('lesson-feedback-guide') !== speakingGuide) {
        throw new Error('Correct-answer celebration must keep the same speaking guide.');
      }
      if (topicIndex === 0 && stepIndex === 0) {
        if (process.env.DIASPORA_TEST_EXIT_AFTER_XP === 'true') {
          await page.getByText('+10 XP', { exact: true }).waitFor();
          await page.getByRole('button', { name: 'Close lesson', exact: true }).click();
          await page.getByRole('button', { name: 'Leave lesson', exact: true }).click();
          await page.getByText(`0 of ${topics.length} topics complete`, { exact: true }).waitFor();
          await page.getByLabel('10 experience points', { exact: true }).waitFor();
          await page.reload();
          if (useCoursePicker) await selectCourse(courseId);
          await page.getByText(`0 of ${topics.length} topics complete`, { exact: true }).waitFor({ timeout: 60000 });
          await page.getByLabel('10 experience points', { exact: true }).waitFor();
          if (errors.length || blocked.length) throw new Error('Browser errors or production request attempted');
          console.log('Confirmed exit preserved 10 saved XP after reload without completing the topic.');
          return;
        }
        await page.getByRole('button', { name: 'Close lesson', exact: true }).click();
        await page.getByRole('button', { name: 'Keep learning', exact: true }).click();
        await page.getByText('Correct!', { exact: true }).waitFor();
      }
      if (isRecall) await page.getByText('You already saved XP for this answer.', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Continue lesson', exact: true }).click({ timeout: 20000 });
    }
    await page.getByText(/^(Topic|Review|Challenge) complete!$/).waitFor();
    await checkGuideImage('lesson-complete-guide');
    await page.getByLabel(`${expectedXp} XP saved this lesson`, { exact: true }).waitFor();
    await page.getByLabel(`${expectedAccuracy} percent accuracy across ${checkedAnswers} checked answers`, { exact: true }).waitFor();
    console.log(JSON.stringify({ stage: 'completion', text: await page.locator('body').innerText() }));
    totalXp += expectedXp;
    console.log(`Completed ${topic.id}: ${exercises.length} exercises + ${missedExercises.length} recall questions, ${expectedXp} XP saved.`);
    if (topicIndex + 1 < testedTopics.length) {
      await page.getByRole('button', { name: `Start next topic: ${testedTopics[topicIndex + 1].title}`, exact: true }).click();
    }
    }
    const expectedGuides = new Set(testedTopics.flatMap(topic => {
      const exerciseCount = buildCourseTopicExercises(courseId, topic.id, {
        concepts: curriculum.concepts,
        vocabulary: curriculum.courseVocabulary.filter(row => row.courseId === courseId),
        hasAudio: () => false,
        hasImage: hasCourseImage,
      }).length;
      return Array.from({ length: exerciseCount }, (_, index) => `${getPromptGuideName(topic.guide, index)} guide`);
    }));
    for (const expectedGuide of expectedGuides) {
      if (!seenGuides.has(expectedGuide)) throw new Error(`Expected lesson guide was not shown: ${expectedGuide}`);
    }
    await page.getByRole('button', { name: 'Back to chapter', exact: true }).click();
    if (courseId === 'igbo' && testedTopics.length === topics.length) {
      await page.getByText(/^Chapter complete\./).first().waitFor();
      if (await page.getByText('Available drafts complete', { exact: true }).count()) throw new Error('A fully available planned chapter must use the complete state.');
    }
    if (useCoursePicker) {
      const untouchedCourseId = previewCourses.find(id => id !== courseId);
      await selectCourse(untouchedCourseId);
      await page.getByText(`0 of ${courseTopics(untouchedCourseId).length} topics complete`, { exact: true }).waitFor();
      await selectCourse(courseId);
      await page.getByText(`${testedTopics.length} of ${topics.length} topics complete`, { exact: true }).waitFor();
      console.log('Switching languages preserved separate topic progress.');
    }
    await page.reload();
    if (useCoursePicker) await selectCourse(courseId);
    await page.getByText(`${testedTopics.length} of ${topics.length} topics complete`, { exact: true }).waitFor({ timeout: 60000 });
    await page.getByLabel(`${totalXp} experience points`, { exact: true }).waitFor();
    console.log(`Reload preserved ${totalXp} XP and ${testedTopics.length} completed topics for ${courseId}.`);
    await page.getByRole('tab', { name: /Progress, 2 of 3/ }).click();
    const progressPercent = Math.round((testedTopics.length / topics.length) * 100);
    await page.getByRole('heading', { name: 'Progress', exact: true }).waitFor();
    await page.getByLabel(`${testedTopics.length} of ${topics.length} topics complete, ${progressPercent} percent`, { exact: true }).waitFor();
    await page.getByLabel(`Total XP: ${totalXp}`, { exact: true }).waitFor();
    await page.getByText('Words covered', { exact: true }).waitFor();
    await page.screenshot({ path: `outputs/browser-smoke/progress-${courseId}.png`, fullPage: true });
    console.log(`Progress dashboard verified at ${progressPercent}% with ${totalXp} saved XP.`);
    await page.getByRole('tab', { name: /Leaderboard, 3 of 3/ }).click();
    await page.getByRole('button', { name: 'Join leaderboard', exact: true }).click();
    await page.getByRole('button', { name: 'Leave leaderboard', exact: true }).waitFor();
    await page.getByText('Local Learner', { exact: true }).first().waitFor();
    console.log(JSON.stringify({ stage: 'leaderboard-joined', text: await page.locator('body').innerText() }));
    await page.getByRole('button', { name: 'Leave leaderboard', exact: true }).click();
    await page.getByRole('button', { name: 'Join leaderboard', exact: true }).waitFor();
    console.log('Leaderboard opt-in and opt-out completed.');
    await page.getByRole('tab', { name: /Learn, 1 of 3/ }).click();
    await page.getByRole('button', { name: 'Account', exact: true }).click();
    await page.getByText(email, { exact: true }).waitFor();
    if (await soundSwitch.isChecked() === muteEffects) throw new Error('Sound preference changed after completing a lesson.');
    await page.screenshot({ path: `outputs/browser-smoke/account-${courseId}.png` });
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await page.getByText('I already have an account', { exact: true }).click();
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill('LocalOnly123!');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    if (useCoursePicker) await selectCourse(courseId);
    await page.getByText(`${testedTopics.length} of ${topics.length} topics complete`, { exact: true }).waitFor({ timeout: 60000 });
    await page.getByLabel(`${totalXp} experience points`, { exact: true }).waitFor();
    console.log(`Sign-out and sign-in preserved ${totalXp} XP and ${testedTopics.length} completed topics.`);
    await page.getByRole('button', { name: 'Account', exact: true }).click();
    if (await soundSwitch.isChecked() === muteEffects) throw new Error('Sound preference must survive sign-out and sign-in.');
    await page.getByRole('button', { name: 'Close account', exact: true }).click();
    console.log(JSON.stringify({ text: await page.locator('body').innerText(), errors, blocked }));
    await page.screenshot({ path: `outputs/browser-smoke/core-loop-${courseId}.png`, fullPage: true });
    if (errors.length || blocked.length) throw new Error('Browser errors or production request attempted');
  } catch (error) {
    if (page) {
      console.error(JSON.stringify({
        stage: 'failure', errors, networkFailures,
        pendingRequests: [...pendingRequests.values()],
        document: await page.evaluate(() => ({
          readyState: document.readyState,
          rootChildren: document.getElementById('root')?.childElementCount,
          progressIndicators: document.querySelectorAll('[role="progressbar"]').length,
          fontStatus: document.fonts.status,
        })).catch(() => null),
        text: await page.locator('body').innerText().catch(() => ''),
      }));
      await page.screenshot({ path: `outputs/browser-smoke/failure-${courseId}.png` }).catch(() => {});
    }
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
