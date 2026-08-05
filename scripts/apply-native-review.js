const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const XLSX = require('xlsx');

const { validateContent } = require('./lib/content-validator.cjs');
const {
  applyApprovedNativeReview,
  buildNativeReviewEvidencePaths,
  buildNativeReviewReceipt,
  buildNativeReviewPlan,
} = require('./lib/native-review-import.cjs');

const projectRoot = path.resolve(__dirname, '..');
const canonicalWorkbookPath = path.join(projectRoot, 'patois_learn_database_1.xlsx');
const generatedCurriculumPath = path.join(projectRoot, 'src', 'data', 'generatedCurriculum.cjs');

function parseOptions(argv) {
  const options = { apply: false, confirmed: false, courseId: '', reviewPath: '' };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--apply') options.apply = true;
    else if (token === '--confirm-native-review') options.confirmed = true;
    else if (token === '--course') options.courseId = String(argv[++index] || '').trim();
    else if (token === '--review') options.reviewPath = path.resolve(projectRoot, argv[++index] || '');
    else throw new Error(`Unknown option: ${token}`);
  }
  if (!options.courseId) throw new Error('--course is required.');
  if (!options.reviewPath) throw new Error('--review is required.');
  if (options.apply && !options.confirmed) {
    throw new Error('--apply also requires --confirm-native-review after the qualified reviewer has approved all 39 rows.');
  }
  return options;
}

function sheetRows(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`Workbook is missing required sheet ${sheetName}.`);
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

function sheetMatrix(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`Review workbook is missing required sheet ${sheetName}.`);
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
}

function canonicalRowsForCourse(workbook, courseId) {
  const concepts = sheetRows(workbook, 'concepts')
    .sort((left, right) => Number(left.topic_order) - Number(right.topic_order) || Number(left.concept_order) - Number(right.concept_order));
  const orderByConcept = new Map(concepts.map((row, index) => [String(row.concept_id), index + 1]));
  return sheetRows(workbook, 'course_vocabulary')
    .filter((row) => String(row.course_id) === courseId)
    .map((row) => ({
      courseId,
      conceptId: String(row.concept_id),
      localized: String(row.localized_form),
      pronunciation: String(row.pronunciation),
      reviewStatus: String(row.review_status),
      publicationState: String(row.publication_state),
      order: orderByConcept.get(String(row.concept_id)) || 0,
    }))
    .sort((left, right) => left.order - right.order);
}

function setCellValue(sheet, rowIndex, columnIndex, value) {
  const address = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
  const cell = sheet[address] || {};
  cell.t = typeof value === 'number' ? 'n' : 's';
  cell.v = value;
  delete cell.f;
  sheet[address] = cell;
}

function updateSheetRows(sheet, keyColumns, replacementRows, fields) {
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const headers = (matrix[0] || []).map((value) => String(value).trim());
  const headerIndex = Object.fromEntries(headers.map((header, index) => [header, index]));
  for (const column of [...keyColumns, ...fields]) {
    if (!Number.isInteger(headerIndex[column])) throw new Error(`Sheet is missing required column ${column}.`);
  }
  const keyOf = (row) => keyColumns.map((column) => String(row[column] ?? '')).join('\u0000');
  const replacements = new Map(replacementRows.map((row) => [keyOf(row), row]));
  let updated = 0;
  for (let rowIndex = 1; rowIndex < matrix.length; rowIndex += 1) {
    const current = Object.fromEntries(headers.map((header, columnIndex) => [header, matrix[rowIndex][columnIndex]]));
    const replacement = replacements.get(keyOf(current));
    if (!replacement) continue;
    for (const field of fields) setCellValue(sheet, rowIndex, headerIndex[field], replacement[field]);
    updated += 1;
  }
  return updated;
}

function timestamp() {
  return new Date().toISOString().replace(/[-:.]/g, '').replace('Z', 'Z');
}

async function applyPlan({ sourceWorkbook, sourceBytes, courseId, plan, reviewPath }) {
  const vocabularyRows = sheetRows(sourceWorkbook, 'course_vocabulary');
  const lessonStepRows = sheetRows(sourceWorkbook, 'lesson_steps');
  const applied = applyApprovedNativeReview({ courseId, workbookRows: vocabularyRows, lessonStepRows, plan });

  const vocabularyUpdated = updateSheetRows(
    sourceWorkbook.Sheets.course_vocabulary,
    ['course_id', 'concept_id'],
    applied.workbookRows.filter((row) => String(row.course_id) === courseId),
    ['localized_form', 'pronunciation', 'review_status']
  );
  const lessonsUpdated = updateSheetRows(
    sourceWorkbook.Sheets.lesson_steps,
    ['course_id', 'step_id'],
    applied.lessonStepRows.filter((row) => String(row.course_id) === courseId),
    ['prompt', 'answer', 'distractors_json']
  );
  if (vocabularyUpdated !== 39) throw new Error(`Expected to update 39 vocabulary rows; updated ${vocabularyUpdated}.`);
  if (
    applied.summary.lessonStepsApplied < 1
    || lessonsUpdated !== applied.summary.lessonStepsApplied
  ) {
    throw new Error(
      `Expected to update all ${applied.summary.lessonStepsApplied} course lesson steps; updated ${lessonsUpdated}.`
    );
  }

  const proposedWorkbookBytes = XLSX.write(sourceWorkbook, { type: 'buffer', bookType: 'xlsx', compression: true });
  const generatorUrl = pathToFileURL(path.join(__dirname, 'generate-runtime-curriculum.mjs')).href;
  const { buildGeneratedCurriculum, serializeGeneratedCurriculum } = await import(generatorUrl);
  const proposedCurriculum = buildGeneratedCurriculum(proposedWorkbookBytes);
  const proposedGeneratedSource = serializeGeneratedCurriculum(proposedCurriculum);

  const tempRoot = path.join(projectRoot, 'tmp');
  fs.mkdirSync(tempRoot, { recursive: true });
  const tempDirectory = fs.mkdtempSync(path.join(tempRoot, 'native-review-'));
  const tempWorkbookPath = path.join(tempDirectory, 'patois_learn_database_1.xlsx');
  const tempGeneratedPath = path.join(tempDirectory, 'generatedCurriculum.cjs');
  fs.writeFileSync(tempWorkbookPath, proposedWorkbookBytes);
  fs.writeFileSync(tempGeneratedPath, proposedGeneratedSource, 'utf8');

  try {
    const validation = validateContent({
      projectRoot,
      workbookPath: tempWorkbookPath,
      generatedPath: tempGeneratedPath,
    });
    if (!validation.ok) throw new Error(`Proposed native-review import failed validation:\n${validation.errors.join('\n')}`);

    const backupDirectory = path.join(projectRoot, 'outputs', 'native-review-backups', timestamp());
    fs.mkdirSync(backupDirectory, { recursive: true });
    fs.writeFileSync(path.join(backupDirectory, 'patois_learn_database_1.xlsx'), sourceBytes);
    fs.copyFileSync(generatedCurriculumPath, path.join(backupDirectory, 'generatedCurriculum.cjs'));

    const reviewWorkbookBytes = fs.readFileSync(reviewPath);
    const evidencePaths = buildNativeReviewEvidencePaths({
      courseId,
      sourceWorkbookSha256After: proposedCurriculum.meta.sourceSha256,
    });
    const evidenceDirectory = path.join(projectRoot, ...evidencePaths.directory.split('/'));
    const reviewEvidencePath = path.join(projectRoot, ...evidencePaths.reviewWorkbookPath.split('/'));
    const receiptPath = path.join(projectRoot, ...evidencePaths.receiptPath.split('/'));
    fs.mkdirSync(evidenceDirectory, { recursive: true });
    fs.writeFileSync(reviewEvidencePath, reviewWorkbookBytes);
    const receipt = buildNativeReviewReceipt({
      courseId,
      plan,
      sourceWorkbookSha256Before: crypto.createHash('sha256').update(sourceBytes).digest('hex'),
      sourceWorkbookSha256After: proposedCurriculum.meta.sourceSha256,
      reviewWorkbookPath: evidencePaths.reviewWorkbookPath,
      reviewWorkbookBytes,
      appliedAt: new Date().toISOString(),
    });
    const receiptBytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
    fs.writeFileSync(receiptPath, receiptBytes);

    fs.writeFileSync(canonicalWorkbookPath, proposedWorkbookBytes);
    fs.writeFileSync(generatedCurriculumPath, proposedGeneratedSource, 'utf8');
    return {
      backupDirectory,
      reviewWorkbookPath: evidencePaths.reviewWorkbookPath,
      sourceSha256: proposedCurriculum.meta.sourceSha256,
      receiptPath: evidencePaths.receiptPath,
      receiptSha256: crypto.createHash('sha256').update(receiptBytes).digest('hex'),
      vocabularyUpdated,
      lessonStepsChecked: lessonsUpdated,
      validation: validation.stats,
    };
  } finally {
    const resolvedTemp = path.resolve(tempDirectory);
    if (!resolvedTemp.startsWith(`${path.resolve(tempRoot)}${path.sep}`)) throw new Error('Refusing to clean an unexpected temp path.');
    fs.rmSync(resolvedTemp, { recursive: true, force: true });
  }
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  if (!fs.existsSync(options.reviewPath)) throw new Error(`Review workbook does not exist: ${options.reviewPath}`);

  const sourceBytes = fs.readFileSync(canonicalWorkbookPath);
  const sourceSha256 = crypto.createHash('sha256').update(sourceBytes).digest('hex');
  const sourceWorkbook = XLSX.read(sourceBytes, { type: 'buffer', cellStyles: true });
  const reviewWorkbook = XLSX.readFile(options.reviewPath);
  const plan = buildNativeReviewPlan({
    courseId: options.courseId,
    sourceSha256,
    sourceWorkbook: path.basename(canonicalWorkbookPath),
    canonicalRows: canonicalRowsForCourse(sourceWorkbook, options.courseId),
    reviewMatrix: sheetMatrix(reviewWorkbook, 'Review'),
    metadataMatrix: sheetMatrix(reviewWorkbook, 'Metadata'),
  });

  if (!plan.ready) {
    console.error(JSON.stringify({ status: 'not-ready', courseId: options.courseId, summary: plan.summary, errors: plan.errors }, null, 2));
    process.exitCode = 2;
    return;
  }
  if (!options.apply) {
    console.log(JSON.stringify({ status: 'ready', mode: 'check-only', courseId: options.courseId, summary: plan.summary }, null, 2));
    return;
  }

  const result = await applyPlan({
    sourceWorkbook,
    sourceBytes,
    courseId: options.courseId,
    plan,
    reviewPath: options.reviewPath,
  });
  console.log(JSON.stringify({ status: 'applied', courseId: options.courseId, summary: plan.summary, ...result }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
