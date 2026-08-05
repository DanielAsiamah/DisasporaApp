const fs = require('node:fs');
const path = require('node:path');

const XLSX = require('xlsx');

const { COURSE_IDS } = require('../src/data/courseCatalog.cjs');
const { auditRebuildProgress } = require('./lib/rebuild-progress-audit.cjs');

const projectRoot = path.resolve(__dirname, '..');
const workbookPath = path.join(projectRoot, 'patois_learn_database_1.xlsx');

function sheetRows(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`Workbook is missing required sheet ${sheetName}.`);
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

function main() {
  const workbook = XLSX.readFile(workbookPath);
  const report = auditRebuildProgress({
    courseIds: COURSE_IDS,
    vocabulary: sheetRows(workbook, 'course_vocabulary'),
    topics: sheetRows(workbook, 'topics'),
    fileExists: (relativePath) => fs.existsSync(path.join(projectRoot, ...relativePath.split('/'))),
  });
  console.log(JSON.stringify(report, null, 2));
  if (!report.complete) process.exitCode = 2;
}

try {
  main();
} catch (error) {
  console.error(error.stack || error.message);
  process.exitCode = 1;
}
