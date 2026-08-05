const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const XLSX = require('xlsx');

const { validateContent } = require('./lib/content-validator.cjs');
const {
  buildCourseCandidateStagingPlan,
  serializeCourseProductionAudioRegistry,
  validateTargetAudioFiles,
} = require('./lib/course-candidate-staging.cjs');
const { hasVerifiedCourseRelease } = require('../src/data/verifiedCourseReleases.cjs');
const { GENERATED_CURRICULUM } = require('../src/data/generatedCurriculum.cjs');

const projectRoot = path.resolve(__dirname, '..');
const workbookPath = path.join(projectRoot, 'patois_learn_database_1.xlsx');
const generatedPath = path.join(projectRoot, 'src', 'data', 'generatedCurriculum.cjs');
const COURSE_REGISTRY_TARGETS = Object.freeze({
  swahili: Object.freeze({
    exportName: 'SWAHILI_PRODUCTION_AUDIO_REGISTRY',
    path: 'src/audio/swahiliProductionAudioRegistry.js',
    roleId: 'target-swahili-yna',
  }),
});

function parseOptions(argv) {
  const options = {
    apply: false,
    confirmed: false,
    courseId: '',
    targetManifestPath: '',
    approvalPath: '',
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--apply') options.apply = true;
    else if (token === '--confirm-release-candidate') options.confirmed = true;
    else if (token === '--course') options.courseId = String(argv[++index] || '').trim();
    else if (token === '--target-manifest') {
      options.targetManifestPath = path.resolve(projectRoot, argv[++index] || '');
    } else if (token === '--approval') {
      options.approvalPath = path.resolve(projectRoot, argv[++index] || '');
    } else throw new Error(`Unknown option: ${token}`);
  }
  if (!options.courseId) throw new Error('--course is required.');
  if (!options.targetManifestPath) throw new Error('--target-manifest is required.');
  if (!options.approvalPath) throw new Error('--approval is required.');
  if (options.apply && !options.confirmed) {
    throw new Error('--apply also requires --confirm-release-candidate after approved audio is present.');
  }
  return options;
}

function sheetRows(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`Workbook is missing required sheet ${sheetName}.`);
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

function workbookData(workbook) {
  return {
    courses: sheetRows(workbook, 'courses'),
    course_vocabulary: sheetRows(workbook, 'course_vocabulary'),
    chapters: sheetRows(workbook, 'chapters'),
    topics: sheetRows(workbook, 'topics'),
    lesson_steps: sheetRows(workbook, 'lesson_steps'),
  };
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
  const columns = Object.fromEntries(headers.map((header, index) => [header, index]));
  for (const column of [...keyColumns, ...fields]) {
    if (!Number.isInteger(columns[column])) throw new Error(`Sheet is missing required column ${column}.`);
  }
  const keyOf = (row) => keyColumns.map((column) => String(row[column] ?? '')).join('\u0000');
  const replacements = new Map(replacementRows.map((row) => [keyOf(row), row]));
  let updated = 0;
  for (let rowIndex = 1; rowIndex < matrix.length; rowIndex += 1) {
    const current = Object.fromEntries(
      headers.map((header, columnIndex) => [header, matrix[rowIndex][columnIndex]])
    );
    const replacement = replacements.get(keyOf(current));
    if (!replacement) continue;
    for (const field of fields) setCellValue(sheet, rowIndex, columns[field], replacement[field]);
    updated += 1;
  }
  return updated;
}

function timestamp() {
  return new Date().toISOString().replace(/[-:.]/g, '');
}

async function applyPlan({ courseId, plan, registryTarget, sourceBytes, sourceWorkbook, targetManifest }) {
  const courseRows = plan.data.courses.filter((row) => String(row.course_id) === courseId);
  const vocabularyRows = plan.data.course_vocabulary.filter((row) => String(row.course_id) === courseId);
  const chapterRows = plan.data.chapters.filter((row) => String(row.course_id) === courseId);
  const lessonStepRows = plan.data.lesson_steps.filter((row) => String(row.course_id) === courseId);
  const updates = {
    courses: updateSheetRows(sourceWorkbook.Sheets.courses, ['course_id'], courseRows, ['availability']),
    vocabulary: updateSheetRows(
      sourceWorkbook.Sheets.course_vocabulary,
      ['course_id', 'concept_id'],
      vocabularyRows,
      ['audio_path', 'voice_cast', 'publication_state']
    ),
    chapters: updateSheetRows(
      sourceWorkbook.Sheets.chapters,
      ['course_id', 'chapter_id'],
      chapterRows,
      ['publication_state']
    ),
    lessonSteps: updateSheetRows(
      sourceWorkbook.Sheets.lesson_steps,
      ['course_id', 'step_id'],
      lessonStepRows,
      ['voice_cast', 'publication_state']
    ),
  };
  if (
    updates.courses !== 1
    || updates.vocabulary !== 39
    || updates.chapters !== 1
    || updates.lessonSteps !== plan.summary.lessonSteps
  ) {
    throw new Error(`Candidate staging update counts are inconsistent: ${JSON.stringify(updates)}.`);
  }

  const proposedWorkbook = XLSX.write(sourceWorkbook, {
    type: 'buffer',
    bookType: 'xlsx',
    compression: true,
  });
  const generatorUrl = pathToFileURL(path.join(__dirname, 'generate-runtime-curriculum.mjs')).href;
  const { buildGeneratedCurriculum, serializeGeneratedCurriculum } = await import(generatorUrl);
  const curriculum = buildGeneratedCurriculum(proposedWorkbook);
  const generatedSource = serializeGeneratedCurriculum(curriculum);
  const registrySource = serializeCourseProductionAudioRegistry({
    courseId,
    exportName: registryTarget.exportName,
    entries: targetManifest.entries,
  });

  const tempRoot = path.join(projectRoot, 'tmp');
  fs.mkdirSync(tempRoot, { recursive: true });
  const tempDirectory = fs.mkdtempSync(path.join(tempRoot, 'course-candidate-'));
  const tempWorkbook = path.join(tempDirectory, 'patois_learn_database_1.xlsx');
  const tempGenerated = path.join(tempDirectory, 'generatedCurriculum.cjs');
  fs.writeFileSync(tempWorkbook, proposedWorkbook);
  fs.writeFileSync(tempGenerated, generatedSource, 'utf8');
  try {
    const validation = validateContent({
      projectRoot,
      workbookPath: tempWorkbook,
      generatedPath: tempGenerated,
    });
    if (!validation.ok) {
      throw new Error(`Proposed release candidate failed validation:\n${validation.errors.join('\n')}`);
    }
    const backupDirectory = path.join(projectRoot, 'outputs', 'candidate-staging-backups', timestamp());
    fs.mkdirSync(backupDirectory, { recursive: true });
    fs.writeFileSync(path.join(backupDirectory, 'patois_learn_database_1.xlsx'), sourceBytes);
    fs.copyFileSync(generatedPath, path.join(backupDirectory, 'generatedCurriculum.cjs'));
    const registryPath = path.join(projectRoot, ...registryTarget.path.split('/'));
    fs.copyFileSync(registryPath, path.join(backupDirectory, path.basename(registryPath)));

    fs.writeFileSync(workbookPath, proposedWorkbook);
    fs.writeFileSync(generatedPath, generatedSource, 'utf8');
    fs.writeFileSync(registryPath, registrySource, 'utf8');
    return {
      backupDirectory: path.relative(projectRoot, backupDirectory),
      sourceWorkbookSha256: curriculum.meta.sourceSha256,
      updates,
      validation: validation.stats,
    };
  } finally {
    const resolvedTemp = path.resolve(tempDirectory);
    if (!resolvedTemp.startsWith(`${path.resolve(tempRoot)}${path.sep}`)) {
      throw new Error('Refusing to clean an unexpected candidate-staging temp path.');
    }
    fs.rmSync(resolvedTemp, { recursive: true, force: true });
  }
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const registryTarget = COURSE_REGISTRY_TARGETS[options.courseId];
  if (!registryTarget) throw new Error(`No production audio registry target exists for ${options.courseId}.`);
  if (!fs.existsSync(options.targetManifestPath)) {
    console.error(JSON.stringify({
      status: 'not-ready',
      mode: 'check-only',
      courseId: options.courseId,
      errors: [`Target audio manifest is missing: ${path.relative(projectRoot, options.targetManifestPath)}.`],
    }, null, 2));
    process.exitCode = 2;
    return;
  }
  if (!fs.existsSync(options.approvalPath)) {
    console.error(JSON.stringify({
      status: 'not-ready',
      mode: 'check-only',
      courseId: options.courseId,
      errors: [`Release approval record is missing: ${path.relative(projectRoot, options.approvalPath)}.`],
    }, null, 2));
    process.exitCode = 2;
    return;
  }

  const sourceBytes = fs.readFileSync(workbookPath);
  const sourceWorkbook = XLSX.read(sourceBytes, { type: 'buffer', cellStyles: true });
  const targetManifestBytes = fs.readFileSync(options.targetManifestPath);
  const targetManifest = JSON.parse(targetManifestBytes.toString('utf8'));
  const approval = JSON.parse(fs.readFileSync(options.approvalPath, 'utf8'));
  const targetAudio = approval?.targetAudio || {};
  const requestedManifestPath = path.relative(projectRoot, options.targetManifestPath).replace(/\\/g, '/');
  const targetManifestSha256 = require('node:crypto')
    .createHash('sha256')
    .update(targetManifestBytes)
    .digest('hex');
  const approvalErrors = [];
  if (approval.courseId !== options.courseId) {
    approvalErrors.push('Release approval record course does not match the staging request.');
  }
  if (targetAudio.status !== 'approved') {
    approvalErrors.push('Target audio must be explicitly approved before candidate staging.');
  }
  if (targetAudio.manifestPath !== requestedManifestPath) {
    approvalErrors.push('Target audio approval references a different manifest path.');
  }
  if (targetAudio.manifestSha256 !== targetManifestSha256) {
    approvalErrors.push('Target audio manifest SHA-256 does not match its approval record.');
  }
  const plan = buildCourseCandidateStagingPlan({
    courseId: options.courseId,
    data: workbookData(sourceWorkbook),
    targetManifest,
    targetRoleId: registryTarget.roleId,
    targetVoiceId: targetAudio.voiceId,
    targetModelId: targetAudio.modelId,
    targetOutputFormat: targetAudio.outputFormat,
    hasVerifiedRelease: hasVerifiedCourseRelease(
      options.courseId,
      GENERATED_CURRICULUM.meta.courseContentSha256?.[options.courseId]
    ),
  });
  const errors = [
    ...approvalErrors,
    ...plan.errors,
    ...validateTargetAudioFiles(targetManifest.entries, { projectRoot }),
  ];
  if (errors.length) {
    console.error(JSON.stringify({
      status: 'not-ready',
      mode: 'check-only',
      courseId: options.courseId,
      errors,
      summary: plan.summary,
    }, null, 2));
    process.exitCode = 2;
    return;
  }
  if (!options.apply) {
    console.log(JSON.stringify({
      status: 'ready',
      mode: 'check-only',
      courseId: options.courseId,
      summary: plan.summary,
    }, null, 2));
    return;
  }

  const result = await applyPlan({
    courseId: options.courseId,
    plan,
    registryTarget,
    sourceBytes,
    sourceWorkbook,
    targetManifest,
  });
  console.log(JSON.stringify({
    status: 'staged',
    courseId: options.courseId,
    summary: plan.summary,
    ...result,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
