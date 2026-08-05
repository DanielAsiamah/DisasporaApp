const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { GENERATED_CURRICULUM } = require('../src/data/generatedCurriculum.cjs');
const { auditPngBuffer, EXPECTED_VOCAB_SIZE } = require('../scripts/lib/audit-vocab-images.cjs');
const {
  auditCourseImageSet,
  formatCourseImageAuditReport,
} = require('../scripts/lib/audit-course-image-set.cjs');

const ROOT = path.resolve(__dirname, '..');

test('Haitian Creole has 39 independently localized candidate rows in a single unreleased state', () => {
  const course = GENERATED_CURRICULUM.courses.find((item) => item.id === 'haitian-creole');
  const rows = GENERATED_CURRICULUM.courseVocabulary.filter((item) => item.courseId === 'haitian-creole');

  assert.equal(course?.availability, 'backlog');
  assert.equal(rows.length, 39);
  assert.equal(new Set(rows.map((item) => item.conceptId)).size, 39);
  assert.ok(rows.every((item) => item.localized.trim().length > 0));
  assert.ok(rows.every((item) => item.pronunciation.trim().length > 0));
  assert.ok(rows.every((item) => item.scriptAid.trim().length > 0));
  assert.ok(rows.every((item) => item.reviewStatus === 'needs-native-review'));
  assert.ok(rows.every((item) => item.publicationState === 'unavailable'));
  assert.ok(rows.every((item) => item.audio === ''));
  assert.ok(rows.every((item) => item.voiceId === ''));
  assert.equal(new Set(rows.map((item) => item.localized.toLocaleLowerCase('ht'))).size, 39);
});

test('Haitian Creole owns 64 workbook-authored lesson steps across all nine topics', () => {
  const steps = GENERATED_CURRICULUM.lessonSteps.filter((item) => item.courseId === 'haitian-creole');
  const topics = GENERATED_CURRICULUM.topics.filter((item) => item.courseId === 'haitian-creole');
  const reusedMarkers = /\b(?:Nuh|Mebbe|Awright|yuh|Ndiyo|Hapana|Labda|Sawa|Waaw|Jerejef|Jërëjëf)\b/i;

  assert.equal(topics.length, 9);
  assert.equal(steps.length, 64);
  assert.equal(new Set(steps.map((item) => item.id)).size, 64);
  assert.ok(steps.every((item) => item.id.startsWith('haitian-creole-')));
  assert.equal(new Set(steps.map((item) => item.topicId)).size, 9);
  assert.ok(steps.every((item) => item.publicationState === 'unavailable'));
  assert.ok(steps.every((item) => item.voiceId === ''));
  assert.ok(steps.every((item) => item.prompt.trim().length > 0));
  assert.ok(steps.every((item) => item.answer.trim().length > 0));
  assert.ok(steps.every((item) => !reusedMarkers.test(`${item.prompt} ${item.answer}`)));
  assert.ok(steps.some((item) => item.prompt.includes('Haitian Creole')));
  assert.ok(steps.some((item) => /Wi|Non|M\u00e8si/.test(item.answer)));
});

test('Haitian Creole has one audited transparent illustration for every concept', () => {
  const directory = path.join(ROOT, 'assets', 'images', 'vocab', 'haitian-creole');
  const expectedIds = GENERATED_CURRICULUM.concepts.map((item) => item.id);
  const expectedFiles = expectedIds.map((id) => `${id}.png`).sort();
  const actualFiles = fs.readdirSync(directory)
    .filter((name) => name.toLowerCase().endsWith('.png'))
    .sort();

  assert.equal(expectedIds.length, 39);
  assert.deepEqual(actualFiles, expectedFiles);

  for (const filename of actualFiles) {
    const result = auditPngBuffer(fs.readFileSync(path.join(directory, filename)), {
      label: `assets/images/vocab/haitian-creole/${filename}`,
      expectedWidth: EXPECTED_VOCAB_SIZE,
      expectedHeight: EXPECTED_VOCAB_SIZE,
    });
    assert.deepEqual(result.failures, [], `${filename}: ${JSON.stringify(result.failures)}`);
  }
});

test('course-scoped image audit verifies the complete Haitian Creole art, registry, workbook, and hero set', () => {
  const report = auditCourseImageSet(ROOT, 'haitian-creole');

  assert.equal(report.ok, true, formatCourseImageAuditReport(report));
  assert.deepEqual(report.summary, {
    courseId: 'haitian-creole',
    expectedConceptCount: 39,
    vocabPngCount: 39,
    auditedPngCount: 39,
    registryEntryCount: 39,
    failureCount: 0,
  });
});
