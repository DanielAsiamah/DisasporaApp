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
const ARABIC_SCRIPT_PATTERN = /[\u0600-\u06FF]/;

test('Sudanese Arabic has 39 Arabic-script candidate rows in a single unreleased state', () => {
  const course = GENERATED_CURRICULUM.courses.find((item) => item.id === 'sudanese-arabic');
  const rows = GENERATED_CURRICULUM.courseVocabulary.filter((item) => item.courseId === 'sudanese-arabic');

  assert.equal(course?.availability, 'backlog');
  assert.equal(course?.writingSystem, 'Arabic');
  assert.equal(rows.length, 39);
  assert.equal(new Set(rows.map((item) => item.conceptId)).size, 39);
  assert.ok(rows.every((item) => item.localized.trim().length > 0));
  assert.ok(rows.every((item) => ARABIC_SCRIPT_PATTERN.test(item.localized)));
  assert.ok(rows.every((item) => item.pronunciation.trim().length > 0));
  assert.ok(rows.every((item) => item.scriptAid.trim().length > 0));
  assert.ok(rows.every((item) => item.reviewStatus === 'needs-native-review'));
  assert.ok(rows.every((item) => item.publicationState === 'unavailable'));
  assert.ok(rows.every((item) => item.audio === ''));
  assert.ok(rows.every((item) => item.voiceId === ''));
  assert.equal(new Set(rows.map((item) => item.localized.normalize('NFKC'))).size, 39);
  assert.ok(rows.some((item) => item.localized === 'أيوه'));
  assert.ok(rows.some((item) => item.localized === 'شكراً'));
});

test('Sudanese Arabic owns 64 workbook-authored lesson steps across all nine topics', () => {
  const steps = GENERATED_CURRICULUM.lessonSteps.filter((item) => item.courseId === 'sudanese-arabic');
  const topics = GENERATED_CURRICULUM.topics.filter((item) => item.courseId === 'sudanese-arabic');
  const reusedMarkers = /\b(?:Nuh|Mebbe|Awright|yuh|Ndiyo|Hapana|Labda|Sawa|Waaw|Jerejef|Jërëjëf|Wi|Petèt|Dakò)\b/i;

  assert.equal(topics.length, 9);
  assert.equal(steps.length, 64);
  assert.equal(new Set(steps.map((item) => item.id)).size, 64);
  assert.ok(steps.every((item) => item.id.startsWith('sudanese-arabic-')));
  assert.equal(new Set(steps.map((item) => item.topicId)).size, 9);
  assert.ok(steps.every((item) => item.publicationState === 'unavailable'));
  assert.ok(steps.every((item) => item.voiceId === ''));
  assert.ok(steps.every((item) => item.prompt.trim().length > 0));
  assert.ok(steps.every((item) => item.answer.trim().length > 0));
  assert.ok(steps.some((item) => item.prompt.includes('Sudanese Arabic')));
  assert.ok(steps.some((item) => ARABIC_SCRIPT_PATTERN.test(item.answer)));
  assert.ok(steps.every((item) => !reusedMarkers.test(`${item.prompt} ${item.answer}`)));
});

test('Sudanese Arabic has one audited transparent illustration for every concept', () => {
  const directory = path.join(ROOT, 'assets', 'images', 'vocab', 'sudanese-arabic');
  const expectedIds = GENERATED_CURRICULUM.concepts.map((item) => item.id);
  const expectedFiles = expectedIds.map((id) => `${id}.png`).sort();
  const actualFiles = fs.readdirSync(directory)
    .filter((name) => name.toLowerCase().endsWith('.png'))
    .sort();

  assert.equal(expectedIds.length, 39);
  assert.deepEqual(actualFiles, expectedFiles);

  for (const filename of actualFiles) {
    const result = auditPngBuffer(fs.readFileSync(path.join(directory, filename)), {
      label: `assets/images/vocab/sudanese-arabic/${filename}`,
      expectedWidth: EXPECTED_VOCAB_SIZE,
      expectedHeight: EXPECTED_VOCAB_SIZE,
    });
    assert.deepEqual(result.failures, [], `${filename}: ${JSON.stringify(result.failures)}`);
  }
});

test('course-scoped image audit verifies the complete Sudanese Arabic art, registry, workbook, and hero set', () => {
  const report = auditCourseImageSet(ROOT, 'sudanese-arabic');

  assert.equal(report.ok, true, formatCourseImageAuditReport(report));
  assert.deepEqual(report.summary, {
    courseId: 'sudanese-arabic',
    expectedConceptCount: 39,
    vocabPngCount: 39,
    auditedPngCount: 39,
    registryEntryCount: 39,
    failureCount: 0,
  });
});
