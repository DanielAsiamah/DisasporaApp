const { chromium } = require(process.env.DIASPORA_PLAYWRIGHT_MODULE || 'playwright');
const escapePattern = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
(async () => {
  const appUrl = new URL(process.env.DIASPORA_APP_URL || 'http://localhost:8086');
  if (!['localhost', '127.0.0.1'].includes(appUrl.hostname) || appUrl.protocol !== 'http:') throw new Error('Only local emulator previews may be tested.');
  const courseId = process.env.DIASPORA_TEST_COURSE || 'jamaican-patois';
  if (!['jamaican-patois', 'swahili'].includes(courseId)) throw new Error('This test supports Patois and the opt-in Swahili preview.');
  require('node:fs').mkdirSync('outputs/browser-smoke', { recursive: true });
  const hub = await fetch('http://127.0.0.1:4400/emulators', { signal: AbortSignal.timeout(5000) }).then(response => response.json());
  if (!hub.auth || !hub.firestore) throw new Error('Start the local Firebase emulators first.');
  const browser = await chromium.launch({ headless: true, executablePath: process.env.DIASPORA_CHROMIUM_EXECUTABLE || undefined });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await page.addInitScript(() => {
      window.__lessonAudioPlays = [];
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function (...args) {
        window.__lessonAudioPlays.push(this.src);
        return play.apply(this, args);
      };
    });
    const errors = [];
    const blocked = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route(/https:\/\/(identitytoolkit|firestore|securetoken)\.googleapis\.com\//, (route) => {
      blocked.push(new URL(route.request().url()).hostname);
      return route.abort();
    });
    await page.goto(appUrl.href, { timeout: 120000 });
    await page.getByText('START YOUR PATH', { exact: true }).click({ timeout: 120000 });
    await page.getByLabel('Preferred name', { exact: true }).fill('Local Learner');
    await page.getByRole('button', { name: 'CONTINUE', exact: true }).click();
    for (const choice of ['English', 'Jamaican Patois', 'Heritage', '10 minutes', 'New learner']) {
      await page.getByText(choice, { exact: true }).click();
      await page.getByRole('button', { name: 'CONTINUE', exact: true }).click();
    }
    await page.getByRole('button', { name: 'START LEARNING.', exact: true }).click();
    await page.getByText('CONTINUE WITH EMAIL', { exact: true }).click();
    await page.getByLabel('Email', { exact: true }).fill(`local-${Date.now()}@example.test`);
    await page.getByLabel('Password', { exact: true }).fill('LocalOnly123!');
    await page.getByLabel('Confirm password', { exact: true }).fill('LocalOnly123!');
    await page.getByRole('button', { name: 'Create account', exact: true }).click();
    await page.getByText('Verify your email', { exact: true }).waitFor({ timeout: 60000 });
    await page.getByText('Continue for now', { exact: true }).click();
    await page.getByRole('tab', { name: /Learn, 1 of 2/ }).waitFor({ timeout: 60000 });
    console.log(JSON.stringify({ stage: 'learn', text: await page.locator('body').innerText() }));
    await page.getByRole('button', { name: /Getting Started\. Lesson/ }).click();
    const { GENERATED_CURRICULUM: curriculum } = require('../src/data/generatedCurriculum.cjs');
    const { CONCEPTS } = require('../src/data/curriculumContract.cjs');
    const { buildCourseTopicExercises } = require('../src/lessonEngine/patoisLessonSteps.cjs');
    const { CORRECT_ANSWER_XP } = require('../src/lessonEngine/lessonXpReward.cjs');
    const exercises = buildCourseTopicExercises(courseId, 'getting-started', {
      concepts: CONCEPTS,
      vocabulary: curriculum.courseVocabulary.filter(row => row.courseId === courseId),
      hasAudio: () => false,
    });
    const expectedXp = exercises.length * CORRECT_ANSWER_XP;
    const checkedAnswers = exercises.length + 1 + exercises.filter(exercise => exercise.pairs).length;
    const expectedAccuracy = Math.round(exercises.length / checkedAnswers * 100);
    const topicCount = curriculum.topics.filter(topic => topic.courseId === courseId).length;
    const first = exercises[0];
    const wrongIndex = first.choices.findIndex(choice => choice !== first.answer);
    await page.getByRole('radio', { name: `${first.choices[wrongIndex]}, answer ${wrongIndex + 1} of ${first.choices.length}`, exact: true }).click();
    await page.getByRole('button', { name: 'Check answer', exact: true }).click();
    await page.getByRole('button', { name: 'Try again', exact: true }).click();
    for (const exercise of exercises) {
      if (exercise.choices) {
        await page.getByRole('radio', { name: `${exercise.answer}, answer ${exercise.choices.indexOf(exercise.answer) + 1} of ${exercise.choices.length}`, exact: true }).click();
      } else if (exercise.answerTokens) {
        for (const token of exercise.answerTokens) await page.getByRole('button', { name: `Add word: ${token}`, exact: true }).click();
      } else {
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
        if (!font.includes('Nunito')) throw new Error(`Expected friendly Nunito font, got ${font}`);
        const playsAfter = await page.evaluate(() => window.__lessonAudioPlays);
        if (playsAfter.length !== playsBefore + 1 || !playsAfter.at(-1).includes('wrong')) throw new Error('Mismatch must trigger the wrong-answer sound once.');
        await rejected.first().scrollIntoViewIfNeeded();
        await page.screenshot({ path: `outputs/browser-smoke/mismatch-${courseId}.png` });
        await page.setViewportSize({ width: 1440, height: 900 });
        const desktopBounds = await rejected.first().boundingBox();
        if (!desktopBounds || desktopBounds.width > 400) throw new Error('Desktop lesson cards must remain in a readable centered column.');
        const fontLoaded = await page.evaluate(() => document.fonts.check('16px "Nunito_800ExtraBold"'));
        if (!fontLoaded) throw new Error('Nunito must actually load, not fall back to a browser font.');
        await page.screenshot({ path: `outputs/browser-smoke/mismatch-desktop-${courseId}.png` });
        await page.setViewportSize({ width: 390, height: 844 });
        console.log('Rejected pair: two red cards, Nunito font, incorrect sound triggered once.');
        for (const pair of exercise.pairs) {
          await page.getByRole('button', { name: new RegExp(`^Phrase: ${escapePattern(pair.localized)},`) }).click();
          await page.getByRole('button', { name: new RegExp(`^Meaning: ${escapePattern(pair.meaning)},`) }).click();
        }
      }
      await page.getByRole('button', { name: 'Check answer', exact: true }).click();
      await page.getByRole('button', { name: 'Continue lesson', exact: true }).click({ timeout: 20000 });
    }
    await page.getByText('Topic complete!', { exact: true }).waitFor();
    await page.getByLabel(`${expectedXp} XP saved this lesson`, { exact: true }).waitFor();
    await page.getByLabel(`${expectedAccuracy} percent accuracy across ${checkedAnswers} checked answers`, { exact: true }).waitFor();
    console.log(JSON.stringify({ stage: 'completion', text: await page.locator('body').innerText() }));
    await page.getByRole('button', { name: 'Back to chapter', exact: true }).click();
    await page.reload();
    await page.getByText(`1 of ${topicCount} topics complete`, { exact: true }).waitFor({ timeout: 60000 });
    await page.getByLabel(`${expectedXp} experience points`, { exact: true }).waitFor();
    console.log(`Reload preserved ${expectedXp} XP and 1 completed topic for ${courseId}.`);
    await page.getByRole('tab', { name: /Leaderboard, 2 of 2/ }).click();
    await page.getByRole('button', { name: 'Join leaderboard', exact: true }).click();
    await page.getByRole('button', { name: 'Leave leaderboard', exact: true }).waitFor();
    await page.getByText('Local Learner', { exact: true }).first().waitFor();
    console.log(JSON.stringify({ stage: 'leaderboard-joined', text: await page.locator('body').innerText() }));
    await page.getByRole('button', { name: 'Leave leaderboard', exact: true }).click();
    await page.getByRole('button', { name: 'Join leaderboard', exact: true }).waitFor();
    console.log('Leaderboard opt-in and opt-out completed.');
    console.log(JSON.stringify({ text: await page.locator('body').innerText(), errors, blocked }));
    await page.screenshot({ path: `outputs/browser-smoke/core-loop-${courseId}.png`, fullPage: true });
    if (errors.length || blocked.length) throw new Error('Browser errors or production request attempted');
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
