const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const {
  auditCourseImageSet,
  formatCourseImageAuditReport,
} = require('../scripts/lib/audit-course-image-set.cjs');

const root = path.resolve(__dirname, '..');

test('course-scoped image audit verifies the complete Swahili art, registry, workbook, and hero set', () => {
  const report = auditCourseImageSet(root, 'swahili');

  assert.equal(report.ok, true, formatCourseImageAuditReport(report));
  assert.deepEqual(report.summary, {
    courseId: 'swahili',
    expectedConceptCount: 39,
    vocabPngCount: 39,
    auditedPngCount: 39,
    registryEntryCount: 39,
    failureCount: 0,
  });
});

test('image audit command accepts an explicit course and package evidence names that course', () => {
  const fs = require('node:fs');
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const source = fs.readFileSync(path.join(root, 'scripts', 'audit-images.js'), 'utf8');

  assert.match(source, /--course/);
  assert.match(source, /auditCourseImageSet/);
  assert.equal(
    packageJson.scripts['images:audit:swahili'],
    'node scripts/audit-images.js --course swahili'
  );
});
