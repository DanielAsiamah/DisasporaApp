const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

test('the welcome screen reflects the approved MVP story instead of the retired region-coming-soon pitch', () => {
  const source = fs.readFileSync(path.join(root, 'src/screens/WelcomeScreen.js'), 'utf8');

  assert.match(source, /Languages carry us home/);
  assert.match(source, /Start with six live MVP courses: Jamaican Patois, Swahili, Wolof, Haitian Creole, Sudanese Arabic, and Nobiin\./);
  assert.match(source, /const COURSE_LANES = \[/);
  assert.match(source, /English speakers/);
  assert.match(source, /French speakers/);
  assert.match(source, /Arabic speakers/);
  assert.match(source, /START YOUR PATH/);
  assert.match(source, /I already have an account/);
  assert.doesNotMatch(source, /South America/);
  assert.doesNotMatch(source, /COMING SOON/);
  assert.doesNotMatch(source, /MEET THE DIASPORA/);
  assert.doesNotMatch(source, /Learn the languages\\{['"]?\\n['"]?\\}of the diaspora/);
});
