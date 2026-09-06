const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const XLSX = require('xlsx');

const root = path.join(__dirname, '..');
const workbookPath = path.join(root, 'content', 'source-intake', 'workbooks', 'diaspora_10000_content_master.xlsx');

test('Diaspora 10000 master workbook is tracked as intake source with required planning sheets', () => {
  assert.equal(fs.existsSync(workbookPath), true);

  const workbook = XLSX.readFile(workbookPath, { sheetRows: 8 });
  for (const sheetName of [
    'Languages',
    'English_Source',
    'Unit_Roadmap',
    'Lessons',
    'Vocabulary_Master',
    'Review_Checklist',
  ]) {
    assert.equal(workbook.SheetNames.includes(sheetName), true, `${sheetName} sheet missing`);
  }
});

test('master workbook content is not silently promoted when translations still need native review', () => {
  const workbook = XLSX.readFile(workbookPath, { sheetRows: 30 });
  const vocabularyRows = XLSX.utils.sheet_to_json(workbook.Sheets.Vocabulary_Master, { defval: '' });

  assert.equal(vocabularyRows.length > 0, true);
  assert.equal(vocabularyRows.some((row) => row.target_text === ''), true);
  assert.equal(vocabularyRows.some((row) => row.needs_native_review === true), true);
});
