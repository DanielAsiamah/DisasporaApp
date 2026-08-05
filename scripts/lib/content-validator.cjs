const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const XLSX = require('xlsx');

const REQUIRED_COLUMNS = Object.freeze({
  concepts: ['concept_id', 'english_meaning', 'topic_id', 'topic_order', 'concept_order'],
  courses: ['course_id', 'base_language', 'display_name', 'writing_system', 'onboarding', 'availability'],
  course_vocabulary: [
    'course_id',
    'concept_id',
    'localized_form',
    'pronunciation',
    'script_aid',
    'image_path',
    'audio_path',
    'voice_cast',
    'review_status',
    'publication_state',
  ],
  chapters: ['course_id', 'chapter_id', 'title', 'hero_asset', 'topic_count', 'word_count', 'publication_state'],
  topics: ['course_id', 'topic_id', 'title', 'topic_order', 'type', 'unlock_requirement', 'guide'],
  lesson_steps: [
    'course_id',
    'topic_id',
    'step_id',
    'step_order',
    'exercise_type',
    'prompt',
    'answer',
    'distractors_json',
    'concept_refs_json',
    'voice_cast',
    'publication_state',
  ],
});

const COURSE_AVAILABILITY = new Set(['unavailable', 'backlog', 'preview', 'published']);
const PUBLICATION_STATES = new Set(['unavailable', 'backlog', 'preview', 'published']);
const REVIEW_STATES = new Set(['backlog', 'needs-native-review', 'approved']);

function text(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function isBlank(value) {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
}

function normalizeAnswer(value) {
  return text(value)
    .normalize('NFKC')
    .toLocaleLowerCase('und')
    .replace(/[\p{P}\p{S}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toBoolean(value) {
  if (typeof value === 'boolean') return value;
  const normalized = text(value).toLocaleLowerCase('en');
  if (normalized === 'true' || normalized === 'yes' || normalized === '1') return true;
  if (normalized === 'false' || normalized === 'no' || normalized === '0') return false;
  return value;
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : value;
}

function normalizeRelativePath(value) {
  return text(value).replaceAll('\\', '/').replace(/^\.\//, '');
}

function readWorkbook(workbookPath, errors) {
  if (!workbookPath || !fs.existsSync(workbookPath)) {
    errors.push(`Workbook does not exist: ${workbookPath || '(missing path)'}.`);
    return Object.fromEntries(Object.keys(REQUIRED_COLUMNS).map((name) => [name, []]));
  }

  let workbook;
  try {
    workbook = XLSX.readFile(workbookPath);
  } catch (error) {
    errors.push(`Workbook could not be read: ${error.message}`);
    return Object.fromEntries(Object.keys(REQUIRED_COLUMNS).map((name) => [name, []]));
  }

  const data = {};
  for (const [sheetName, requiredColumns] of Object.entries(REQUIRED_COLUMNS)) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      errors.push(`Missing required sheet: ${sheetName}.`);
      data[sheetName] = [];
      continue;
    }
    const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    const headers = (matrix[0] || []).map((header) => text(header));
    for (const column of requiredColumns) {
      if (!headers.includes(column)) errors.push(`${sheetName}: missing required column ${column}.`);
    }
    data[sheetName] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  }
  return data;
}

function requireFields(sheetName, rows, fields, errors, predicate = () => true) {
  rows.forEach((row, index) => {
    if (!predicate(row)) return;
    for (const field of fields) {
      if (isBlank(row[field])) errors.push(`${sheetName} row ${index + 2}: missing required field ${field}.`);
    }
  });
}

function findDuplicates(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

function validateStateValues(data, errors) {
  data.courses.forEach((row, index) => {
    const state = text(row.availability).toLocaleLowerCase('en');
    if (state && !COURSE_AVAILABILITY.has(state)) {
      errors.push(`courses row ${index + 2}: invalid availability ${row.availability}.`);
    }
  });
  for (const sheetName of ['course_vocabulary', 'chapters', 'lesson_steps']) {
    data[sheetName].forEach((row, index) => {
      const state = text(row.publication_state).toLocaleLowerCase('en');
      if (state && !PUBLICATION_STATES.has(state)) {
        errors.push(`${sheetName} row ${index + 2}: invalid publication_state ${row.publication_state}.`);
      }
    });
  }
  data.course_vocabulary.forEach((row, index) => {
    const state = text(row.review_status).toLocaleLowerCase('en');
    if (state && !REVIEW_STATES.has(state)) {
      errors.push(`course_vocabulary row ${index + 2}: invalid review_status ${row.review_status}.`);
    }
  });
}

function validateReferences(data, errors) {
  const courseIds = new Set(data.courses.map((row) => text(row.course_id)).filter(Boolean));
  const conceptIds = new Set(data.concepts.map((row) => text(row.concept_id)).filter(Boolean));
  const topicIdsByCourse = new Map();
  for (const row of data.topics) {
    const courseId = text(row.course_id);
    const topicId = text(row.topic_id);
    if (!topicIdsByCourse.has(courseId)) topicIdsByCourse.set(courseId, new Set());
    topicIdsByCourse.get(courseId).add(topicId);
    if (!courseIds.has(courseId)) errors.push(`topics: unknown course_id ${courseId || '(blank)'}.`);
  }

  const conceptTopicIds = new Set(data.concepts.map((row) => text(row.topic_id)).filter(Boolean));
  for (const courseId of courseIds) {
    const courseTopicIds = topicIdsByCourse.get(courseId) || new Set();
    for (const topicId of conceptTopicIds) {
      if (!courseTopicIds.has(topicId)) errors.push(`Course ${courseId} is missing concept topic ${topicId}.`);
    }
  }

  const vocabularyKeys = [];
  data.course_vocabulary.forEach((row, index) => {
    const courseId = text(row.course_id);
    const conceptId = text(row.concept_id);
    vocabularyKeys.push(`${courseId}\u0000${conceptId}`);
    if (!courseIds.has(courseId)) errors.push(`course_vocabulary row ${index + 2}: unknown course_id ${courseId || '(blank)'}.`);
    if (!conceptIds.has(conceptId)) errors.push(`course_vocabulary row ${index + 2}: unknown concept_id ${conceptId || '(blank)'}.`);
  });
  for (const duplicate of findDuplicates(vocabularyKeys)) {
    const [courseId, conceptId] = duplicate.split('\u0000');
    errors.push(`Duplicate course_vocabulary row for ${courseId}/${conceptId}.`);
  }

  data.chapters.forEach((row, index) => {
    if (!courseIds.has(text(row.course_id))) errors.push(`chapters row ${index + 2}: unknown course_id ${row.course_id || '(blank)'}.`);
  });

  const stepIds = [];
  data.lesson_steps.forEach((row, index) => {
    const courseId = text(row.course_id);
    const topicId = text(row.topic_id);
    const stepId = text(row.step_id);
    stepIds.push(stepId);
    if (!courseIds.has(courseId)) errors.push(`lesson_steps row ${index + 2}: unknown course_id ${courseId || '(blank)'}.`);
    if (!(topicIdsByCourse.get(courseId) || new Set()).has(topicId)) {
      errors.push(`lesson_steps row ${index + 2}: unknown topic_id ${topicId || '(blank)'} for ${courseId || '(blank course)'}.`);
    }
    for (const field of ['distractors_json', 'concept_refs_json']) {
      try {
        const parsed = JSON.parse(row[field]);
        if (!Array.isArray(parsed)) throw new Error('must be a JSON array');
        if (field === 'concept_refs_json') {
          for (const conceptId of parsed) {
            if (!conceptIds.has(text(conceptId))) {
              errors.push(`lesson_steps row ${index + 2}: unknown concept reference ${conceptId}.`);
            }
          }
        }
      } catch (error) {
        errors.push(`lesson_steps row ${index + 2}: invalid ${field} (${error.message}).`);
      }
    }
  });
  for (const duplicate of findDuplicates(stepIds.filter(Boolean))) errors.push(`Duplicate lesson step_id ${duplicate}.`);

  for (const courseId of courseIds) {
    const rows = data.course_vocabulary.filter((row) => text(row.course_id) === courseId);
    const uniqueConceptIds = new Set(rows.map((row) => text(row.concept_id)).filter(Boolean));
    if (rows.length !== 39 || uniqueConceptIds.size !== 39) {
      errors.push(`Course ${courseId} must contain exactly 39 unique concepts; found ${rows.length} rows and ${uniqueConceptIds.size} unique concepts.`);
    }
    const missingConcepts = [...conceptIds].filter((conceptId) => !uniqueConceptIds.has(conceptId));
    if (conceptIds.size === 39 && missingConcepts.length) {
      errors.push(`Course ${courseId} is missing concepts: ${missingConcepts.join(', ')}.`);
    }

    const topicRows = data.topics.filter((row) => text(row.course_id) === courseId);
    const uniqueTopicIds = new Set(topicRows.map((row) => text(row.topic_id)).filter(Boolean));
    if (topicRows.length !== 9 || uniqueTopicIds.size !== 9) {
      errors.push(`Course ${courseId} must contain exactly 9 topics; found ${topicRows.length} rows and ${uniqueTopicIds.size} unique topics.`);
    }

    const normalizedAnswers = rows
      .map((row) => normalizeAnswer(row.localized_form))
      .filter(Boolean);
    for (const duplicate of findDuplicates(normalizedAnswers)) {
      errors.push(`Course ${courseId} contains duplicate normalized answer "${duplicate}".`);
    }
  }
}

function isSafeProjectFile(projectRoot, relativePath) {
  const normalized = normalizeRelativePath(relativePath);
  const absolute = path.resolve(projectRoot, normalized);
  const rootWithSeparator = `${path.resolve(projectRoot)}${path.sep}`;
  return absolute.startsWith(rootWithSeparator) && fs.existsSync(absolute) && fs.statSync(absolute).isFile();
}

function validateAssets(data, projectRoot, errors) {
  const visualCourseIds = new Set(
    data.courses
      .filter((row) => ['preview', 'published'].includes(text(row.availability).toLocaleLowerCase('en')))
      .map((row) => text(row.course_id))
  );
  const publishedCourseIds = new Set(
    data.courses
      .filter((row) => text(row.availability).toLocaleLowerCase('en') === 'published')
      .map((row) => text(row.course_id))
  );

  data.course_vocabulary.forEach((row, index) => {
    const courseId = text(row.course_id);
    const conceptId = text(row.concept_id);
    const imagePath = normalizeRelativePath(row.image_path);
    const audioPath = normalizeRelativePath(row.audio_path);
    const expectedImage = `assets/images/vocab/${courseId}/${conceptId}.png`;
    const expectedAudio = `assets/audio/${courseId}/${conceptId}.mp3`;
    if (imagePath && imagePath !== expectedImage) {
      errors.push(`course_vocabulary row ${index + 2}: legacy or non-canonical image_path ${imagePath}; expected ${expectedImage}.`);
    }
    if (audioPath && audioPath !== expectedAudio) {
      errors.push(`course_vocabulary row ${index + 2}: legacy or non-canonical audio_path ${audioPath}; expected ${expectedAudio}.`);
    }
    if (visualCourseIds.has(courseId) && !isSafeProjectFile(projectRoot, imagePath)) {
      errors.push(`course_vocabulary row ${index + 2}: missing image file ${imagePath}.`);
    }
    if (publishedCourseIds.has(courseId) && !isSafeProjectFile(projectRoot, audioPath)) {
      errors.push(`course_vocabulary row ${index + 2}: missing audio file ${audioPath}.`);
    }
  });

  data.chapters.forEach((row, index) => {
    const courseId = text(row.course_id);
    const chapterId = text(row.chapter_id);
    const heroAsset = normalizeRelativePath(row.hero_asset);
    const expectedHero = `assets/images/chapters/${chapterId}.png`;
    if (heroAsset && heroAsset !== expectedHero) {
      errors.push(`chapters row ${index + 2}: legacy or non-canonical hero_asset ${heroAsset}; expected ${expectedHero}.`);
    }
    if (visualCourseIds.has(courseId) && !isSafeProjectFile(projectRoot, heroAsset)) {
      errors.push(`chapters row ${index + 2}: missing hero file ${heroAsset}.`);
    }
  });
}

function validatePublishedCourses(data, errors) {
  const publishedCourseIds = data.courses
    .filter((row) => text(row.availability).toLocaleLowerCase('en') === 'published')
    .map((row) => text(row.course_id));

  for (const courseId of publishedCourseIds) {
    const vocabularyRows = data.course_vocabulary.filter((row) => text(row.course_id) === courseId);
    for (const [index, row] of data.course_vocabulary.entries()) {
      if (text(row.course_id) !== courseId) continue;
      if (text(row.review_status).toLocaleLowerCase('en') !== 'approved') {
        errors.push(`course_vocabulary row ${index + 2}: published course ${courseId} must be approved.`);
      }
      if (text(row.publication_state).toLocaleLowerCase('en') !== 'published') {
        errors.push(`course_vocabulary row ${index + 2}: published course ${courseId} must use publication_state published.`);
      }
    }
    if (!vocabularyRows.length) errors.push(`Published course ${courseId} has no vocabulary rows.`);

    const chapterRows = data.chapters.filter((row) => text(row.course_id) === courseId);
    if (!chapterRows.length) errors.push(`Published course ${courseId} has no chapter.`);
    for (const row of chapterRows) {
      if (toNumber(row.topic_count) !== 9 || toNumber(row.word_count) !== 39) {
        errors.push(`Published course ${courseId} chapter must declare 9 topics and 39 words.`);
      }
      if (text(row.publication_state).toLocaleLowerCase('en') !== 'published') {
        errors.push(`Published course ${courseId} chapter must use publication_state published.`);
      }
    }

    const stepRows = data.lesson_steps.filter((row) => text(row.course_id) === courseId);
    if (!stepRows.length) errors.push(`Published course ${courseId} has no lesson steps.`);
    if (stepRows.some((row) => text(row.publication_state).toLocaleLowerCase('en') !== 'published')) {
      errors.push(`Published course ${courseId} contains non-published lesson steps.`);
    }
  }
}

function canonicalWorkbookData(data) {
  return {
    concepts: data.concepts.map((row) => ({
      id: text(row.concept_id),
      meaning: text(row.english_meaning),
      topicId: text(row.topic_id),
      topicOrder: toNumber(row.topic_order),
      order: toNumber(row.concept_order),
    })),
    courses: data.courses.map((row) => ({
      id: text(row.course_id),
      baseLanguage: text(row.base_language),
      displayName: text(row.display_name),
      writingSystem: text(row.writing_system),
      onboarding: toBoolean(row.onboarding),
      availability: text(row.availability),
    })),
    courseVocabulary: data.course_vocabulary.map((row) => ({
      courseId: text(row.course_id),
      conceptId: text(row.concept_id),
      localized: text(row.localized_form),
      pronunciation: text(row.pronunciation),
      scriptAid: text(row.script_aid),
      image: normalizeRelativePath(row.image_path),
      audio: normalizeRelativePath(row.audio_path),
      voiceId: text(row.voice_cast),
      reviewStatus: text(row.review_status),
      publicationState: text(row.publication_state),
    })),
    chapters: data.chapters.map((row) => ({
      courseId: text(row.course_id),
      id: text(row.chapter_id),
      title: text(row.title),
      heroAsset: normalizeRelativePath(row.hero_asset),
      topicCount: toNumber(row.topic_count),
      wordCount: toNumber(row.word_count),
      publicationState: text(row.publication_state),
    })),
    topics: data.topics.map((row) => ({
      courseId: text(row.course_id),
      id: text(row.topic_id),
      title: text(row.title),
      order: toNumber(row.topic_order),
      type: text(row.type),
      unlockRequirement: toNumber(row.unlock_requirement),
      guide: text(row.guide),
    })),
    lessonSteps: data.lesson_steps.map((row) => ({
      courseId: text(row.course_id),
      topicId: text(row.topic_id),
      id: text(row.step_id),
      order: toNumber(row.step_order),
      type: text(row.exercise_type),
      prompt: text(row.prompt),
      answer: text(row.answer),
      distractors: JSON.parse(row.distractors_json),
      conceptRefs: JSON.parse(row.concept_refs_json),
      conceptId: text(row.concept_id),
      voiceId: text(row.voice_cast),
      publicationState: text(row.publication_state),
    })),
  };
}

function canonicalGeneratedData(generated) {
  const curriculum = generated?.GENERATED_CURRICULUM || generated;
  const rows = (name) => (Array.isArray(curriculum?.[name]) ? curriculum[name] : []);
  const canonical = {
    concepts: rows('concepts').map((row) => ({
      id: text(row.id),
      meaning: text(row.meaning),
      topicId: text(row.topicId),
      topicOrder: toNumber(row.topicOrder),
      order: toNumber(row.order),
    })),
    courses: rows('courses').map((row) => ({
      id: text(row.id),
      baseLanguage: text(row.baseLanguage),
      displayName: text(row.displayName),
      writingSystem: text(row.writingSystem),
      onboarding: toBoolean(row.onboarding),
      availability: text(row.availability),
    })),
    courseVocabulary: rows('courseVocabulary').map((row) => ({
      courseId: text(row.courseId),
      conceptId: text(row.conceptId),
      localized: text(row.localized),
      pronunciation: text(row.pronunciation),
      scriptAid: text(row.scriptAid),
      image: normalizeRelativePath(row.image),
      audio: normalizeRelativePath(row.audio),
      voiceId: text(row.voiceId),
      reviewStatus: text(row.reviewStatus),
      publicationState: text(row.publicationState),
    })),
    chapters: rows('chapters').map((row) => ({
      courseId: text(row.courseId),
      id: text(row.id),
      title: text(row.title),
      heroAsset: normalizeRelativePath(row.heroAsset),
      topicCount: toNumber(row.topicCount),
      wordCount: toNumber(row.wordCount),
      publicationState: text(row.publicationState),
    })),
    topics: rows('topics').map((row) => ({
      courseId: text(row.courseId),
      id: text(row.id),
      title: text(row.title),
      order: toNumber(row.order),
      type: text(row.type),
      unlockRequirement: toNumber(row.unlockRequirement),
      guide: text(row.guide),
    })),
    lessonSteps: rows('lessonSteps').map((row) => ({
      courseId: text(row.courseId),
      topicId: text(row.topicId),
      id: text(row.id),
      order: toNumber(row.order),
      type: text(row.exerciseType ?? row.type),
      prompt: text(row.prompt),
      answer: text(row.answer),
      distractors: Array.isArray(row.distractors) ? row.distractors : [],
      conceptRefs: Array.isArray(row.conceptRefs) ? row.conceptRefs : [],
      conceptId: text(row.conceptId),
      voiceId: text(row.voiceId),
      publicationState: text(row.publicationState),
    })),
  };
  return { curriculum, canonical };
}

function validateGeneratedArtifact({ data, workbookPath, generatedPath, errors, stats }) {
  if (!generatedPath || !fs.existsSync(generatedPath)) {
    stats.generatedArtifact = 'not-present';
    return;
  }
  if (!workbookPath || !fs.existsSync(workbookPath)) {
    errors.push('Generated runtime artifact cannot be verified because the source workbook is missing.');
    stats.generatedArtifact = 'unverifiable';
    return;
  }

  let loaded;
  try {
    const resolved = require.resolve(generatedPath);
    delete require.cache[resolved];
    loaded = require(resolved);
  } catch (error) {
    errors.push(`Generated runtime artifact could not be loaded: ${error.message}`);
    stats.generatedArtifact = 'invalid';
    return;
  }

  const { curriculum, canonical } = canonicalGeneratedData(loaded);
  const expectedHash = crypto.createHash('sha256').update(fs.readFileSync(workbookPath)).digest('hex');
  if (curriculum?.meta?.sourceWorkbook !== path.basename(workbookPath)) {
    errors.push(`Generated runtime sourceWorkbook does not agree with ${path.basename(workbookPath)}.`);
  }
  if (curriculum?.meta?.sourceSha256 !== expectedHash) {
    errors.push('Generated runtime sourceSha256 does not agree with the current workbook bytes.');
  }

  let workbookCanonical;
  try {
    workbookCanonical = canonicalWorkbookData(data);
  } catch (error) {
    errors.push(`Workbook rows could not be projected for generated-data comparison: ${error.message}`);
    stats.generatedArtifact = 'invalid';
    return;
  }
  for (const [name, expected] of Object.entries(workbookCanonical)) {
    if (JSON.stringify(canonical[name]) !== JSON.stringify(expected)) {
      errors.push(`Generated ${name} does not agree with the workbook.`);
    }
  }
  stats.generatedArtifact = errors.some((error) => error.startsWith('Generated ')) ? 'mismatch' : 'verified';
}

function validateContent(options = {}) {
  const projectRoot = path.resolve(options.projectRoot || path.resolve(__dirname, '..', '..'));
  const workbookPath = path.resolve(options.workbookPath || path.join(projectRoot, 'patois_learn_database_1.xlsx'));
  const generatedPath = path.resolve(options.generatedPath || path.join(projectRoot, 'src', 'data', 'generatedCurriculum.cjs'));
  const errors = [];
  const warnings = [];
  const data = readWorkbook(workbookPath, errors);

  requireFields('concepts', data.concepts, REQUIRED_COLUMNS.concepts, errors);
  requireFields('courses', data.courses, REQUIRED_COLUMNS.courses, errors);
  requireFields(
    'course_vocabulary',
    data.course_vocabulary,
    ['course_id', 'concept_id', 'image_path', 'review_status', 'publication_state'],
    errors
  );
  requireFields(
    'course_vocabulary',
    data.course_vocabulary,
    ['localized_form', 'pronunciation', 'voice_cast'],
    errors,
    (row) => ['preview', 'published'].includes(text(row.publication_state).toLocaleLowerCase('en'))
  );
  requireFields(
    'course_vocabulary',
    data.course_vocabulary,
    ['audio_path'],
    errors,
    (row) => text(row.publication_state).toLocaleLowerCase('en') === 'published'
  );
  requireFields('chapters', data.chapters, REQUIRED_COLUMNS.chapters, errors);
  requireFields('topics', data.topics, REQUIRED_COLUMNS.topics, errors);
  requireFields(
    'lesson_steps',
    data.lesson_steps,
    REQUIRED_COLUMNS.lesson_steps.filter((field) => field !== 'voice_cast'),
    errors
  );
  requireFields(
    'lesson_steps',
    data.lesson_steps,
    ['voice_cast'],
    errors,
    (row) => ['preview', 'published'].includes(text(row.publication_state).toLocaleLowerCase('en'))
  );

  if (data.concepts.length !== 39 || new Set(data.concepts.map((row) => text(row.concept_id))).size !== 39) {
    errors.push(`Workbook must define exactly 39 unique concepts; found ${data.concepts.length} rows.`);
  }
  if (data.courses.length === 0) errors.push('Workbook must define at least one course.');

  validateStateValues(data, errors);
  validateReferences(data, errors);
  validateAssets(data, projectRoot, errors);
  validatePublishedCourses(data, errors);

  const stats = {
    concepts: data.concepts.length,
    courses: data.courses.length,
    courseVocabulary: data.course_vocabulary.length,
    chapters: data.chapters.length,
    topics: data.topics.length,
    lessonSteps: data.lesson_steps.length,
    publishedCourses: data.courses.filter((row) => text(row.availability).toLocaleLowerCase('en') === 'published').length,
    generatedArtifact: 'not-present',
  };
  validateGeneratedArtifact({ data, workbookPath, generatedPath, errors, stats });

  return { ok: errors.length === 0, errors, warnings, stats };
}

module.exports = {
  REQUIRED_COLUMNS,
  canonicalWorkbookData,
  normalizeAnswer,
  validateContent,
};
