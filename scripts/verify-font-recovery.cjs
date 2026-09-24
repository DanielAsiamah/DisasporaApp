const assert = require('node:assert/strict');
const { chromium } = require(process.env.DIASPORA_PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const url = new URL(process.env.DIASPORA_APP_URL || 'http://localhost:8086');
  if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.protocol !== 'http:') {
    throw new Error('Only local previews may be tested.');
  }
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.DIASPORA_CHROMIUM_EXECUTABLE || undefined,
  });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const errors = [];
    const productionRequests = [];
    let rejectedFonts = 0;
    page.on('pageerror', error => errors.push(error.message));
    await page.route(/https:\/\/(identitytoolkit|firestore|securetoken)\.googleapis\.com\//, route => {
      productionRequests.push(new URL(route.request().url()).hostname);
      return route.abort();
    });
    const fontPattern = /Nunito[^?]*\.(ttf|otf)(\?|$)/i;
    await page.route(fontPattern, route => {
      rejectedFonts += 1;
      return route.abort('failed');
    });
    await page.goto(url.href, { timeout: 120000 });
    await page.getByText('Could not load the app fonts', { exact: true }).waitFor({ timeout: 30000 });
    assert.ok(rejectedFonts > 0, 'The failure scenario must reject a real Nunito download.');
    assert.equal(await page.getByText('START YOUR PATH', { exact: true }).count(), 0);
    await page.evaluate(() => localStorage.setItem('diaspora:test:font-recovery', 'preserve-me'));
    await page.unroute(fontPattern);
    await page.getByRole('button', { name: 'Retry loading fonts', exact: true }).click();
    await page.getByText('START YOUR PATH', { exact: true }).waitFor({ timeout: 60000 });
    assert.ok(await page.evaluate(() => document.fonts.check('16px "Nunito_800ExtraBold"')));
    assert.equal(await page.evaluate(() => localStorage.getItem('diaspora:test:font-recovery')), 'preserve-me');
    assert.deepEqual(errors, []);
    assert.deepEqual(productionRequests, []);
    console.log('Font failure displayed recovery UI; retry loaded Nunito and opened Welcome.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
