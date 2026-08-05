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

test('Nobiin remains blocked for native wording instead of shipping unreviewed translations', () => {
  const course = GENERATED_CURRICULUM.courses.find((item) => item.id === 'nobiin');
  const rows = GENERATED_CURRICULUM.courseVocabulary.filter((item) => item.courseId === 'nobiin');
  const steps = GENERATED_CURRICULUM.lessonSteps.filter((item) => item.courseId === 'nobiin');

  assert.equal(course?.availability, 'backlog');
  assert.equal(course?.writingSystem, 'Latin with Arabic pronunciation aid');
  assert.equal(rows.length, 39);
  assert.equal(new Set(rows.map((item) => item.conceptId)).size, 39);
  assert.ok(rows.every((item) => item.localized === ''));
  assert.ok(rows.every((item) => item.pronunciation === ''));
  assert.ok(rows.every((item) => item.scriptAid === ''));
  assert.ok(rows.every((item) => item.reviewStatus === 'backlog'));
  assert.ok(rows.every((item) => item.publicationState === 'unavailable'));
  assert.equal(steps.length, 0);
});

test('Nobiin has one audited transparent illustration for every concept', () => {
  const directory = path.join(ROOT, 'assets', 'images', 'vocab', 'nobiin');
  const expectedIds = GENERATED_CURRICULUM.concepts.map((item) => item.id);
  const expectedFiles = expectedIds.map((id) => `${id}.png`).sort();
  const actualFiles = fs.readdirSync(directory)
    .filter((name) => name.toLowerCase().endsWith('.png'))
    .sort();

  assert.equal(expectedIds.length, 39);
  assert.deepEqual(actualFiles, expectedFiles);

  for (const filename of actualFiles) {
    const result = auditPngBuffer(fs.readFileSync(path.join(directory, filename)), {
      label: `assets/images/vocab/nobiin/${filename}`,
      expectedWidth: EXPECTED_VOCAB_SIZE,
      expectedHeight: EXPECTED_VOCAB_SIZE,
    });
    assert.deepEqual(result.failures, [], `${filename}: ${JSON.stringify(result.failures)}`);
  }
});

test('course-scoped image audit verifies the complete Nobiin art, registry, workbook, and hero set', () => {
  const report = auditCourseImageSet(ROOT, 'nobiin');

  assert.equal(report.ok, true, formatCourseImageAuditReport(report));
  assert.deepEqual(report.summary, {
    courseId: 'nobiin',
    expectedConceptCount: 39,
    vocabPngCount: 39,
    auditedPngCount: 39,
    registryEntryCount: 39,
    failureCount: 0,
  });
});
