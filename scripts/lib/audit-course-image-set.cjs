const fs = require('node:fs');
const path = require('node:path');

const {
  EXPECTED_VOCAB_SIZE,
  auditPngBuffer,
  compareConceptImageFiles,
} = require('./audit-vocab-images.cjs');

const EXPECTED_CONCEPT_COUNT = 39;
const EXPECTED_TOPIC_COUNT = 9;
const WORKBOOK_PATH = 'patois_learn_database_1.xlsx';
const GENERATED_CURRICULUM_PATH = 'src/data/generatedCurriculum.cjs';
const REGISTRY_PATHS = Object.freeze({
  'jamaican-patois': 'src/data/jamaicanPatoisImageRegistry.js',
  swahili: 'src/data/swahiliImageRegistry.js',
  wolof: 'src/data/wolofImageRegistry.js',
  'haitian-creole': 'src/data/haitianCreoleImageRegistry.js',
  'sudanese-arabic': 'src/data/sudaneseArabicImageRegistry.js',
  nobiin: 'src/data/nobiinImageRegistry.js',
});
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function failure(code, target, message, details = {}) {
  return { code, target, message, details };
}

function relativeUnix(root, filePath) {
  return path.relative(root, filePath).replace(/\\/g, '/');
}

function readGeneratedCurriculum(projectRoot) {
  const modulePath = path.join(projectRoot, GENERATED_CURRICULUM_PATH);
  if (!fs.existsSync(modulePath)) {
    return {
      curriculum: null,
      failures: [failure(
        'MISSING_GENERATED_CURRICULUM',
        GENERATED_CURRICULUM_PATH,
        'Generated curriculum is required to audit a course image set.'
      )],
    };
  }

  try {
    delete require.cache[require.resolve(modulePath)];
    return { curriculum: require(modulePath).GENERATED_CURRICULUM, failures: [] };
  } catch (error) {
    return {
      curriculum: null,
      failures: [failure(
        'INVALID_GENERATED_CURRICULUM',
        GENERATED_CURRICULUM_PATH,
        `Could not load generated curriculum: ${error.message}`
      )],
    };
  }
}

function readWorkbookRows(projectRoot) {
  const workbookPath = path.join(projectRoot, WORKBOOK_PATH);
  if (!fs.existsSync(workbookPath)) {
    return {
      vocabularyRows: [],
      chapterRows: [],
      failures: [failure('MISSING_WORKBOOK', WORKBOOK_PATH, 'Workbook is required to audit course image references.')],
    };
  }

  try {
    const XLSX = require('xlsx');
    const workbook = XLSX.readFile(workbookPath, { cellDates: false });
    const vocabularySheet = workbook.Sheets.course_vocabulary;
    const chaptersSheet = workbook.Sheets.chapters;
    if (!vocabularySheet || !chaptersSheet) {
      return {
        vocabularyRows: [],
        chapterRows: [],
        failures: [failure(
          'MISSING_WORKBOOK_SHEET',
          WORKBOOK_PATH,
          'Workbook must contain course_vocabulary and chapters sheets.'
        )],
      };
    }
    return {
      vocabularyRows: XLSX.utils.sheet_to_json(vocabularySheet, { defval: '' }),
      chapterRows: XLSX.utils.sheet_to_json(chaptersSheet, { defval: '' }),
      failures: [],
    };
  } catch (error) {
    return {
      vocabularyRows: [],
      chapterRows: [],
      failures: [failure('INVALID_WORKBOOK', WORKBOOK_PATH, `Could not read workbook: ${error.message}`)],
    };
  }
}

function auditStaticRegistry(projectRoot, courseId, expectedIds, expectedPaths) {
  const registryPath = REGISTRY_PATHS[courseId];
  if (!registryPath) {
    return {
      entries: [],
      failures: [failure(
        'MISSING_REGISTRY_CONFIGURATION',
        courseId,
        `No static image registry is configured for course ${courseId}.`
      )],
    };
  }

  const absoluteRegistryPath = path.join(projectRoot, registryPath);
  if (!fs.existsSync(absoluteRegistryPath)) {
    return {
      entries: [],
      failures: [failure('MISSING_REGISTRY', registryPath, `Static image registry is missing for ${courseId}.`)],
    };
  }

  const source = fs.readFileSync(absoluteRegistryPath, 'utf8');
  const entryPattern = /['"]([a-z0-9-]+)['"]\s*:\s*require\(\s*['"]([^'"]+)['"]\s*\)/g;
  const entries = [];
  let match;
  while ((match = entryPattern.exec(source))) {
    entries.push({ id: match[1], requirePath: match[2] });
  }

  const failures = [];
  if (entries.length !== expectedIds.length) {
    failures.push(failure(
      'REGISTRY_COUNT_MISMATCH',
      registryPath,
      `Expected ${expectedIds.length} static entries, found ${entries.length}.`
    ));
  }

  for (const id of expectedIds) {
    const matches = entries.filter((entry) => entry.id === id);
    if (!matches.length) {
      failures.push(failure('MISSING_REGISTRY_ENTRY', registryPath, `Missing registry entry for ${id}.`, { conceptId: id }));
      continue;
    }
    if (matches.length > 1) {
      failures.push(failure('DUPLICATE_REGISTRY_ENTRY', registryPath, `Duplicate registry entry for ${id}.`, { conceptId: id }));
    }
    const expectedRequirePath = `../../${expectedPaths.get(id)}`;
    if (matches[0].requirePath !== expectedRequirePath) {
      failures.push(failure(
        'INVALID_REGISTRY_PATH',
        registryPath,
        `${id} must require ${expectedRequirePath}; found ${matches[0].requirePath}.`,
        { conceptId: id }
      ));
    }
  }

  for (const id of new Set(entries.map((entry) => entry.id))) {
    if (!expectedIds.includes(id)) {
      failures.push(failure('UNEXPECTED_REGISTRY_ENTRY', registryPath, `Unexpected registry entry ${id}.`, { conceptId: id }));
    }
  }

  return { entries, failures };
}

function auditVocabularyReferences(courseId, expectedIds, expectedPaths, generatedRows, workbookRows) {
  const failures = [];
  const generatedTarget = `${GENERATED_CURRICULUM_PATH}#courseVocabulary`;
  const workbookTarget = `${WORKBOOK_PATH}#course_vocabulary`;

  if (generatedRows.length !== expectedIds.length) {
    failures.push(failure(
      'GENERATED_VOCABULARY_COUNT_MISMATCH',
      generatedTarget,
      `Expected ${expectedIds.length} ${courseId} rows, found ${generatedRows.length}.`
    ));
  }
  if (workbookRows.length !== expectedIds.length) {
    failures.push(failure(
      'WORKBOOK_VOCABULARY_COUNT_MISMATCH',
      workbookTarget,
      `Expected ${expectedIds.length} ${courseId} rows, found ${workbookRows.length}.`
    ));
  }

  for (const id of expectedIds) {
    const expectedImagePath = expectedPaths.get(id);
    const generatedMatches = generatedRows.filter((row) => row.conceptId === id);
    const workbookMatches = workbookRows.filter((row) => row.concept_id === id);

    if (!generatedMatches.length) {
      failures.push(failure('MISSING_GENERATED_VOCABULARY_ROW', generatedTarget, `Missing generated row for ${id}.`, { conceptId: id }));
    } else if (generatedMatches[0].image !== expectedImagePath) {
      failures.push(failure(
        'INVALID_GENERATED_IMAGE_PATH',
        generatedTarget,
        `${id} must use ${expectedImagePath}; found ${generatedMatches[0].image || '(blank)'}.`,
        { conceptId: id }
      ));
    }
    if (generatedMatches.length > 1) {
      failures.push(failure('DUPLICATE_GENERATED_VOCABULARY_ROW', generatedTarget, `Duplicate generated row for ${id}.`, { conceptId: id }));
    }

    if (!workbookMatches.length) {
      failures.push(failure('MISSING_WORKBOOK_VOCABULARY_ROW', workbookTarget, `Missing workbook row for ${id}.`, { conceptId: id }));
    } else if (workbookMatches[0].image_path !== expectedImagePath) {
      failures.push(failure(
        'INVALID_WORKBOOK_IMAGE_PATH',
        workbookTarget,
        `${id} must use ${expectedImagePath}; found ${workbookMatches[0].image_path || '(blank)'}.`,
        { conceptId: id }
      ));
    }
    if (workbookMatches.length > 1) {
      failures.push(failure('DUPLICATE_WORKBOOK_VOCABULARY_ROW', workbookTarget, `Duplicate workbook row for ${id}.`, { conceptId: id }));
    }
  }

  for (const row of generatedRows) {
    if (!expectedIds.includes(row.conceptId)) {
      failures.push(failure(
        'UNEXPECTED_GENERATED_VOCABULARY_ROW',
        generatedTarget,
        `Unexpected generated concept ${row.conceptId || '(blank)'}.`
      ));
    }
  }
  for (const row of workbookRows) {
    if (!expectedIds.includes(row.concept_id)) {
      failures.push(failure(
        'UNEXPECTED_WORKBOOK_VOCABULARY_ROW',
        workbookTarget,
        `Unexpected workbook concept ${row.concept_id || '(blank)'}.`
      ));
    }
  }

  return failures;
}

function readBasicPngHeader(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 33 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error('File does not have a valid PNG signature.');
  }
  if (buffer.readUInt32BE(8) !== 13 || buffer.subarray(12, 16).toString('ascii') !== 'IHDR') {
    throw new Error('PNG is missing its 13-byte IHDR header.');
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    bitDepth: buffer[24],
    colorType: buffer[25],
    compression: buffer[26],
    filter: buffer[27],
    interlace: buffer[28],
  };
}

function auditChapterHero(projectRoot, courseId, generatedChapters, workbookChapters) {
  const failures = [];
  const generatedTarget = `${GENERATED_CURRICULUM_PATH}#chapters`;
  const workbookTarget = `${WORKBOOK_PATH}#chapters`;
  const canonicalHeroPath = `assets/images/chapters/${courseId}-greetings.png`;

  if (generatedChapters.length !== 1) {
    failures.push(failure(
      'GENERATED_CHAPTER_COUNT_MISMATCH',
      generatedTarget,
      `Expected one ${courseId} chapter, found ${generatedChapters.length}.`
    ));
  }
  if (workbookChapters.length !== 1) {
    failures.push(failure(
      'WORKBOOK_CHAPTER_COUNT_MISMATCH',
      workbookTarget,
      `Expected one ${courseId} chapter, found ${workbookChapters.length}.`
    ));
  }

  const generatedChapter = generatedChapters[0];
  const workbookChapter = workbookChapters[0];
  if (generatedChapter) {
    if (generatedChapter.heroAsset !== canonicalHeroPath) {
      failures.push(failure(
        'INVALID_GENERATED_CHAPTER_HERO_REFERENCE',
        generatedTarget,
        `Expected ${canonicalHeroPath}; found ${generatedChapter.heroAsset || '(blank)'}.`
      ));
    }
    if (Number(generatedChapter.topicCount) !== EXPECTED_TOPIC_COUNT || Number(generatedChapter.wordCount) !== EXPECTED_CONCEPT_COUNT) {
      failures.push(failure(
        'INVALID_GENERATED_CHAPTER_COUNTS',
        generatedTarget,
        `Chapter must report ${EXPECTED_TOPIC_COUNT} topics and ${EXPECTED_CONCEPT_COUNT} words.`
      ));
    }
  }
  if (workbookChapter) {
    if (workbookChapter.hero_asset !== canonicalHeroPath) {
      failures.push(failure(
        'INVALID_WORKBOOK_CHAPTER_HERO_REFERENCE',
        workbookTarget,
        `Expected ${canonicalHeroPath}; found ${workbookChapter.hero_asset || '(blank)'}.`
      ));
    }
    if (Number(workbookChapter.topic_count) !== EXPECTED_TOPIC_COUNT || Number(workbookChapter.word_count) !== EXPECTED_CONCEPT_COUNT) {
      failures.push(failure(
        'INVALID_WORKBOOK_CHAPTER_COUNTS',
        workbookTarget,
        `Chapter must report ${EXPECTED_TOPIC_COUNT} topics and ${EXPECTED_CONCEPT_COUNT} words.`
      ));
    }
  }

  const absoluteHeroPath = path.join(projectRoot, canonicalHeroPath);
  if (!fs.existsSync(absoluteHeroPath)) {
    failures.push(failure('MISSING_CHAPTER_HERO', canonicalHeroPath, `Chapter hero is missing for ${courseId}.`));
    return failures;
  }

  try {
    const header = readBasicPngHeader(fs.readFileSync(absoluteHeroPath));
    if (
      header.bitDepth !== 8
      || ![2, 6].includes(header.colorType)
      || header.compression !== 0
      || header.filter !== 0
      || header.width < 600
      || header.height < 240
      || header.width <= header.height
    ) {
      failures.push(failure(
        'INVALID_CHAPTER_HERO',
        canonicalHeroPath,
        `Chapter hero must be a landscape 8-bit RGB/RGBA PNG at least 600x240; found ${header.width}x${header.height}, color type ${header.colorType}.`,
        header
      ));
    }
  } catch (error) {
    failures.push(failure('INVALID_CHAPTER_HERO', canonicalHeroPath, error.message));
  }

  return failures;
}

function auditCourseImageSet(projectRoot, courseId) {
  const absoluteRoot = path.resolve(projectRoot);
  const normalizedCourseId = String(courseId || '').trim().toLowerCase();
  const failures = [];

  const generatedResult = readGeneratedCurriculum(absoluteRoot);
  failures.push(...generatedResult.failures);
  const curriculum = generatedResult.curriculum;
  if (!curriculum) {
    return buildReport(normalizedCourseId, [], [], [], failures);
  }

  const course = curriculum.courses.find((item) => item.id === normalizedCourseId);
  if (!course) {
    failures.push(failure('UNKNOWN_COURSE', GENERATED_CURRICULUM_PATH, `Unknown course ${normalizedCourseId || '(blank)'}.`));
    return buildReport(normalizedCourseId, curriculum.concepts, [], [], failures);
  }

  const expectedIds = curriculum.concepts.map((concept) => concept.id);
  if (expectedIds.length !== EXPECTED_CONCEPT_COUNT) {
    failures.push(failure(
      'CONCEPT_COUNT_MISMATCH',
      GENERATED_CURRICULUM_PATH,
      `Expected exactly ${EXPECTED_CONCEPT_COUNT} concepts, found ${expectedIds.length}.`
    ));
  }
  const expectedPaths = new Map(expectedIds.map((id) => [
    id,
    `assets/images/vocab/${normalizedCourseId}/${id}.png`,
  ]));

  const courseDirectory = path.join(absoluteRoot, 'assets', 'images', 'vocab', normalizedCourseId);
  const actualFiles = fs.existsSync(courseDirectory)
    ? fs.readdirSync(courseDirectory, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.png'))
      .map((entry) => entry.name)
      .sort()
    : [];
  const expectedFilenameSet = new Set(expectedIds.map((id) => `${id}.png`));
  failures.push(...compareConceptImageFiles(
    expectedIds,
    actualFiles,
    relativeUnix(absoluteRoot, courseDirectory)
  ));

  for (const id of expectedIds) {
    const filename = `${id}.png`;
    if (!actualFiles.includes(filename)) continue;
    const projectPath = expectedPaths.get(id);
    const imageAudit = auditPngBuffer(fs.readFileSync(path.join(courseDirectory, filename)), {
      label: projectPath,
      expectedWidth: EXPECTED_VOCAB_SIZE,
      expectedHeight: EXPECTED_VOCAB_SIZE,
    });
    failures.push(...imageAudit.failures);
  }

  const generatedRows = curriculum.courseVocabulary.filter((row) => row.courseId === normalizedCourseId);
  const generatedChapters = curriculum.chapters.filter((chapter) => chapter.courseId === normalizedCourseId);
  const workbook = readWorkbookRows(absoluteRoot);
  failures.push(...workbook.failures);
  const workbookRows = workbook.vocabularyRows.filter((row) => row.course_id === normalizedCourseId);
  const workbookChapters = workbook.chapterRows.filter((row) => row.course_id === normalizedCourseId);

  failures.push(...auditVocabularyReferences(
    normalizedCourseId,
    expectedIds,
    expectedPaths,
    generatedRows,
    workbookRows
  ));
  const registry = auditStaticRegistry(absoluteRoot, normalizedCourseId, expectedIds, expectedPaths);
  failures.push(...registry.failures);
  failures.push(...auditChapterHero(
    absoluteRoot,
    normalizedCourseId,
    generatedChapters,
    workbookChapters
  ));

  return buildReport(normalizedCourseId, expectedIds, actualFiles, registry.entries, failures, expectedFilenameSet);
}

function buildReport(courseId, expectedIds, actualFiles, registryEntries, failures, expectedFilenameSet = new Set()) {
  return {
    ok: failures.length === 0,
    failures,
    summary: {
      courseId,
      expectedConceptCount: expectedIds.length,
      vocabPngCount: actualFiles.length,
      auditedPngCount: actualFiles.filter((filename) => expectedFilenameSet.has(filename)).length,
      registryEntryCount: registryEntries.length,
      failureCount: failures.length,
    },
  };
}

function formatCourseImageAuditReport(result) {
  const courseName = result.summary.courseId || 'unknown course';
  const status = result.ok ? 'PASSED' : 'FAILED';
  const lines = [
    `${courseName} image audit: ${status}`,
    '===================================',
    `Expected concepts: ${result.summary.expectedConceptCount}`,
    `Canonical PNGs found: ${result.summary.vocabPngCount}`,
    `Canonical PNGs audited: ${result.summary.auditedPngCount}`,
    `Static registry entries: ${result.summary.registryEntryCount}`,
    `Failures: ${result.summary.failureCount}`,
  ];
  if (result.failures.length) {
    lines.push('', 'Failure details:');
    result.failures.forEach((item, index) => {
      lines.push(`${String(index + 1).padStart(3, ' ')}. [${item.code}] ${item.target}: ${item.message}`);
    });
  } else {
    lines.push('', 'All canonical vocabulary PNGs, workbook/runtime references, static registry entries, and the chapter hero passed.');
  }
  return lines.join('\n');
}

module.exports = {
  REGISTRY_PATHS,
  auditCourseImageSet,
  formatCourseImageAuditReport,
};
