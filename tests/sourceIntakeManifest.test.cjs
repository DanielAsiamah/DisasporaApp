const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { auditSourceIntake } = require('../scripts/lib/source-intake-audit.cjs');

const projectRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(projectRoot, 'content', 'source-intake', 'quizlet', 'manifest.json');

test('Quizlet intake manifest tracks the deferred language sources without enabling them in runtime', () => {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const report = auditSourceIntake({
    manifest,
    projectRoot,
  });

  assert.equal(report.ok, true, report.errors.join('\n'));
  assert.deepEqual(report.summary, {
    entries: 19,
    trackedAssets: 18,
    csvEntries: 18,
    apkgEntries: 1,
    uniqueLanguages: 10,
    duplicates: 1,
    existingCatalogMatches: 10,
    futureLanguageSources: 8,
    reviewOnlySources: 1,
  });
});

test('duplicate and low-quality Quizlet sources stay documented instead of silently promoted', () => {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const report = auditSourceIntake({
    manifest,
    projectRoot,
  });
  const duplicate = report.entries.find((entry) => entry.id === 'hausa-quizlet-duplicate-export');
  const aaveCsv = report.entries.find((entry) => entry.id === 'aave-quizlet-notes');

  assert.ok(duplicate);
  assert.equal(duplicate.importDisposition, 'duplicate');
  assert.equal(duplicate.trackedAssetPath, '');
  assert.equal(duplicate.duplicateOf, 'hausa-quizlet-core');

  assert.ok(aaveCsv);
  assert.equal(aaveCsv.importDisposition, 'review-only');
  assert.match(aaveCsv.intakeNotes, /not direct runtime import/i);
});
