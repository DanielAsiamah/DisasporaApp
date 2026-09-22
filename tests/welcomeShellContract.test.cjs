const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

test('the welcome screen uses catalog availability instead of promising unreleased courses', () => {
  const source = fs.readFileSync(path.join(root, 'src/screens/WelcomeScreen.js'), 'utf8');

  assert.match(source, /Languages carry us home/);
  assert.match(source, /buildWelcomeCourseSummary/);
  assert.match(source, /courseSummary\.headline/);
  assert.match(source, /courseSummary\.description/);
  assert.match(source, /courseSummary\.lanes\.map/);
  assert.doesNotMatch(source, /six live MVP courses/i);
  assert.match(source, /START YOUR PATH/);
  assert.match(source, /I already have an account/);
  assert.doesNotMatch(source, /South America/);
  assert.doesNotMatch(source, /COMING SOON/);
  assert.doesNotMatch(source, /MEET THE DIASPORA/);
  assert.doesNotMatch(source, /Learn the languages\\{['"]?\\n['"]?\\}of the diaspora/);
});

test('splash and welcome share catalog-derived course messaging', () => {
  const source = fs.readFileSync(path.join(root, 'src/screens/SplashScreen.js'), 'utf8');
  assert.match(source, /buildWelcomeCourseSummary/);
  assert.match(source, /courseSummary\.headline/);
  assert.match(source, /courseSummary\.description/);
  assert.doesNotMatch(source, /six live MVP courses/i);
});
