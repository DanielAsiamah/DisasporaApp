const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const ROOT = path.join(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

test('Igbo starter artwork has a static course-owned Metro registry without cross-language fallback', () => {
  const source = read('src/data/igboImageRegistry.js');
  const requires = [...source.matchAll(
    /require\(['"]\.\.\/\.\.\/assets\/images\/vocab\/igbo\/([^'"]+\.png)['"]\)/g,
  )];
  const expected = [
    'igbo_u01_01_hello.png',
    'igbo_u01_02_good_morning.png',
    'igbo_u01_03_good_afternoon.png',
    'igbo_u01_04_good_evening.png',
    'igbo_u01_05_good_night.png',
    'igbo_u01_06_goodbye.png',
    'igbo_u01_07_see_you_later.png',
    'igbo_u01_08_welcome.png',
    'igbo_u01_09_how_are_you.png',
    'igbo_u01_10_i_am_fine.png',
    'igbo_u01_11_whats_up.png',
    'igbo_u01_12_nice_to_meet_you.png',
  ];

  assert.deepEqual(requires.map(match => match[1]).sort(), expected);
  assert.doesNotMatch(source, /jamaican-patois|swahili|wolof|haitian-creole|sudanese-arabic|nobiin/);
  const images = expected.map(filename => fs.readFileSync(
    path.join(ROOT, 'assets/images/vocab/igbo', filename),
  ));
  for (const [index, image] of images.entries()) {
    assert.deepEqual([...image.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], expected[index]);
    assert.equal(image.readUInt32BE(16), 768, `${expected[index]} width`);
    assert.equal(image.readUInt32BE(20), 768, `${expected[index]} height`);
    assert.equal(image[25], 6, `${expected[index]} must retain an alpha channel`);
    assert.ok(image.length <= 800 * 1024, `${expected[index]} exceeds the mobile asset budget`);
  }
  assert.equal(new Set(images.map(image => createHash('sha256').update(image).digest('hex'))).size, 12);
});

test('the shared course registry resolves the dedicated Igbo visual set', () => {
  const source = read('src/data/courseImageRegistry.js');

  assert.match(source, /import \{ IGBO_IMAGE_REGISTRY \} from ['"]\.\/igboImageRegistry['"]/);
  assert.match(source, /igbo:\s*IGBO_IMAGE_REGISTRY/);
});
