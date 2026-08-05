const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { GENERATED_CURRICULUM } = require('../src/data/generatedCurriculum.cjs');
const { auditPngBuffer, EXPECTED_VOCAB_SIZE } = require('../scripts/lib/audit-vocab-images.cjs');

test('Swahili has 39 independently localized rows in one coherent candidate lifecycle state', () => {
  const course = GENERATED_CURRICULUM.courses.find((item) => item.id === 'swahili');
  const rows = GENERATED_CURRICULUM.courseVocabulary.filter((item) => item.courseId === 'swahili');
  const staged = course?.availability === 'published';

  assert.ok(['backlog', 'published'].includes(course?.availability));
  assert.equal(rows.length, 39);
  assert.equal(new Set(rows.map((item) => item.conceptId)).size, 39);
  assert.ok(rows.every((item) => item.localized.trim().length > 0));
  assert.ok(rows.every((item) => item.pronunciation.trim().length > 0));
  assert.ok(rows.every((item) => (
    item.reviewStatus === (staged ? 'approved' : 'needs-native-review')
  )));
  assert.ok(rows.every((item) => (
    item.publicationState === (staged ? 'published' : 'unavailable')
  )));
  assert.ok(rows.every((item) => (
    staged
      ? item.audio === `assets/audio/swahili/${item.conceptId}.mp3`
        && item.voiceId === 'target-swahili-yna'
      : item.audio === '' && item.voiceId === ''
  )));
  assert.equal(new Set(rows.map((item) => item.localized.toLocaleLowerCase('sw'))).size, 39);
});

test('Swahili distinguishes son from the broader word for child', () => {
  const son = GENERATED_CURRICULUM.courseVocabulary.find((item) => (
    item.courseId === 'swahili' && item.conceptId === 'son'
  ));

  assert.ok(son?.localized && son.localized.toLocaleLowerCase('sw') !== 'mtoto');
  assert.ok(son?.pronunciation);
  assert.ok(['needs-native-review', 'approved'].includes(son?.reviewStatus));
  assert.ok(['unavailable', 'published'].includes(son?.publicationState));
});

test('Swahili has one audited transparent illustration for every concept', () => {
  const root = path.resolve(__dirname, '..');
  const directory = path.join(root, 'assets', 'images', 'vocab', 'swahili');
  const expectedIds = GENERATED_CURRICULUM.concepts.map((item) => item.id);
  const expectedFiles = expectedIds.map((id) => `${id}.png`).sort();
  const actualFiles = fs.readdirSync(directory)
    .filter((name) => name.toLowerCase().endsWith('.png'))
    .sort();

  assert.equal(expectedIds.length, 39);
  assert.deepEqual(actualFiles, expectedFiles);

  for (const filename of actualFiles) {
    const result = auditPngBuffer(fs.readFileSync(path.join(directory, filename)), {
      label: `assets/images/vocab/swahili/${filename}`,
      expectedWidth: EXPECTED_VOCAB_SIZE,
      expectedHeight: EXPECTED_VOCAB_SIZE,
    });
    assert.deepEqual(result.failures, [], `${filename}: ${JSON.stringify(result.failures)}`);
  }
});

test('Swahili owns 64 workbook-authored lesson steps across all nine topics', () => {
  const steps = GENERATED_CURRICULUM.lessonSteps.filter((item) => item.courseId === 'swahili');
  const course = GENERATED_CURRICULUM.courses.find((item) => item.id === 'swahili');
  const staged = course?.availability === 'published';
  const patoisMarkers = /\b(?:Nuh|Mebbe|Awright|yuh|fi)\b/i;

  assert.equal(steps.length, 64);
  assert.equal(new Set(steps.map((item) => item.id)).size, 64);
  assert.ok(steps.every((item) => item.id.startsWith('swahili-')));
  assert.equal(new Set(steps.map((item) => item.topicId)).size, 9);
  assert.ok(steps.every((item) => (
    item.publicationState === (staged ? 'published' : 'unavailable')
  )));
  assert.ok(steps.every((item) => (
    item.voiceId === (staged ? 'target-swahili-yna' : '')
  )));
  assert.ok(steps.every((item) => !patoisMarkers.test(`${item.prompt} ${item.answer}`)));
  assert.ok(steps.some((item) => item.prompt.includes('Swahili')));
  assert.ok(steps.some((item) => /Ndiyo|Hapana|Labda|Sawa/.test(item.answer)));
});
