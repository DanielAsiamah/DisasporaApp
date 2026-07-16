const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { buildVocabularyImagePath, validateVocabularyImageManifest } = require('../src/data/vocabularyImageManifest.cjs');
const { CONCEPTS } = require('../src/data/curriculumContract.cjs');

test('new vocabulary art uses course/concept paths and never legacy filenames', () => {
  assert.equal(buildVocabularyImagePath('jamaican-patois', 'good-afternoon'), 'assets/images/vocab/jamaican-patois/good-afternoon.png');
  const paths = Array.from({ length: 39 }, (_, index) => `assets/images/vocab/jamaican-patois/concept-${String(index + 1).padStart(2, '0')}.png`);
  assert.deepEqual(validateVocabularyImageManifest(paths, { expectedCount: 39 }), []);
  assert.match(validateVocabularyImageManifest([...paths.slice(0, 38), 'assets/images/old/plantain.png'], { expectedCount: 39 }).join('\n'), /legacy|vocab/i);
});

test('all 39 Patois illustrations exist as RGBA PNGs and are statically registered', () => {
  const projectRoot = path.resolve(__dirname, '..');
  const assetDirectory = path.join(projectRoot, 'assets', 'images', 'vocab', 'jamaican-patois');
  const files = fs.readdirSync(assetDirectory).filter((file) => file.endsWith('.png')).sort();
  const expectedFiles = CONCEPTS.map(({ id }) => `${id}.png`).sort();

  assert.deepEqual(files, expectedFiles);
  for (const file of files) {
    const header = fs.readFileSync(path.join(assetDirectory, file)).subarray(0, 26);
    assert.deepEqual([...header.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], `${file} must be a PNG`);
    assert.equal(header[25], 6, `${file} must use PNG color type 6 (RGBA)`);
  }

  const registrySource = fs.readFileSync(path.join(projectRoot, 'src', 'data', 'jamaicanPatoisImageRegistry.js'), 'utf8');
  for (const { id } of CONCEPTS) {
    assert.match(registrySource, new RegExp(`['\"]${id}['\"]\\s*:\\s*require\\(['\"]\\.\\.\\/\\.\\.\\/assets\\/images\\/vocab\\/jamaican-patois\\/${id}\\.png['\"]\\)`));
  }
});
