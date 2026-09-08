'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const XLSX = require('xlsx');
const { buildAlignment } = require('./lib/master-workbook-alignment.cjs');
const { GENERATED_CURRICULUM } = require('../src/data/generatedCurriculum.cjs');

const root = path.resolve(__dirname, '..');
const source = path.resolve(process.argv[2] || path.join(root, 'content/source-intake/workbooks/diaspora_10000_content_master.xlsx'));
const bytes = fs.readFileSync(source);
const workbook = XLSX.read(bytes, { type: 'buffer' });
function rows(name) {
  if (!workbook.Sheets[name]) throw new Error(`Missing sheet: ${name}`);
  return XLSX.utils.sheet_to_json(workbook.Sheets[name], { defval: '' });
}
const alignment = buildAlignment({ lessons: rows('Lessons'), vocabulary: rows('Vocabulary_Master') }, GENERATED_CURRICULUM);
const summary = {
  sourceWorkbook: path.basename(source),
  sourceSha256: crypto.createHash('sha256').update(bytes).digest('hex'),
  runtimeSourceSha256: GENERATED_CURRICULUM.meta.sourceSha256,
  languages: rows('Languages').length,
  units: rows('Unit_Roadmap').length,
  lessons: alignment.lessons.length,
  vocabularyItems: alignment.items.length,
  workbookTranslations: alignment.items.filter((row) => row.matchState === 'workbook-translation').length,
  existingCandidates: alignment.items.filter((row) => row.matchState === 'existing-candidate').length,
  missing: alignment.items.filter((row) => row.matchState === 'missing').length,
  ambiguous: alignment.items.filter((row) => row.matchState === 'ambiguous').length,
  lessonsWithTranslationCoverage: alignment.lessons.filter((row) => row.translationCoverageComplete).length,
};
const output = path.join(root, 'outputs/master-workbook-alignment');
fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(path.join(output, 'alignment.json'), `${JSON.stringify({ summary, ...alignment }, null, 2)}\n`);
const reviewWorkbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(reviewWorkbook, XLSX.utils.json_to_sheet(alignment.items.map(({ candidates, ...item }) => ({
  ...item,
  candidate_translations: candidates.map((row) => row.localized).join(' | '),
  candidate_concept_ids: candidates.map((row) => row.conceptId).join(' | '),
  candidate_review_status: candidates.map((row) => row.reviewStatus).join(' | '),
}))), 'Translation_Matching');
XLSX.utils.book_append_sheet(reviewWorkbook, XLSX.utils.json_to_sheet(alignment.lessons), 'Lesson_Coverage');
XLSX.writeFile(reviewWorkbook, path.join(output, 'translation-matching.xlsx'));
console.log(JSON.stringify({ ...summary, output }, null, 2));
