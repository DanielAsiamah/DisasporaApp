import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import XLSX from 'xlsx';
import courseContentFingerprint from './lib/course-content-fingerprint.cjs';

const { buildCourseContentSha256ById } = courseContentFingerprint;

const projectRoot = path.resolve(import.meta.dirname, '..');
const workbookPath = path.join(projectRoot, 'patois_learn_database_1.xlsx');
const outputPath = path.join(projectRoot, 'src', 'data', 'generatedCurriculum.cjs');

const REQUIRED_SHEETS = [
  'concepts',
  'courses',
  'course_vocabulary',
  'chapters',
  'topics',
  'lesson_steps',
];

function readRows(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`Workbook is missing required sheet: ${sheetName}`);
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

function integer(value, field) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) throw new Error(`${field} must be an integer; received ${JSON.stringify(value)}.`);
  return parsed;
}

function boolean(value) {
  if (value === true || value === 1 || String(value).toLowerCase() === 'true') return true;
  if (value === false || value === 0 || String(value).toLowerCase() === 'false') return false;
  throw new Error(`Expected a boolean value; received ${JSON.stringify(value)}.`);
}

function jsonArray(value, field) {
  try {
    const parsed = JSON.parse(value || '[]');
    if (!Array.isArray(parsed)) throw new Error('not an array');
    return parsed;
  } catch (error) {
    throw new Error(`${field} must contain a JSON array: ${error.message}`);
  }
}

function stableSort(rows, selectors) {
  return [...rows].sort((left, right) => {
    for (const selector of selectors) {
      const comparison = String(selector(left)).localeCompare(String(selector(right)), 'en', { numeric: true });
      if (comparison) return comparison;
    }
    return 0;
  });
}

export function buildGeneratedCurriculum(workbookBytes) {
  const workbook = XLSX.read(workbookBytes, { type: 'buffer' });
  for (const sheetName of REQUIRED_SHEETS) {
    if (!workbook.SheetNames.includes(sheetName)) throw new Error(`Workbook is missing required sheet: ${sheetName}`);
  }

  const rawConcepts = readRows(workbook, 'concepts');
  const concepts = stableSort(rawConcepts.map((row) => ({
    id: String(row.concept_id),
    meaning: String(row.english_meaning),
    topicId: String(row.topic_id),
    topicOrder: integer(row.topic_order, `concept ${row.concept_id} topic_order`),
    order: integer(row.concept_order, `concept ${row.concept_id} concept_order`),
  })), [(row) => row.topicOrder, (row) => row.order]);
  const conceptGlobalOrder = new Map(concepts.map((concept, index) => [concept.id, index + 1]));
  const conceptCounts = new Map();
  for (const concept of concepts) conceptCounts.set(concept.topicId, (conceptCounts.get(concept.topicId) || 0) + 1);

  const courses = readRows(workbook, 'courses').map((row) => ({
    id: String(row.course_id),
    baseLanguage: String(row.base_language),
    displayName: String(row.display_name),
    writingSystem: String(row.writing_system),
    onboarding: boolean(row.onboarding),
    availability: String(row.availability),
  }));

  const courseVocabulary = stableSort(readRows(workbook, 'course_vocabulary').map((row) => ({
    courseId: String(row.course_id),
    conceptId: String(row.concept_id),
    localized: String(row.localized_form),
    pronunciation: String(row.pronunciation),
    scriptAid: String(row.script_aid),
    image: String(row.image_path),
    audio: String(row.audio_path),
    voiceId: String(row.voice_cast),
    reviewStatus: String(row.review_status),
    publicationState: String(row.publication_state),
    order: conceptGlobalOrder.get(String(row.concept_id)) || 0,
  })), [(row) => courses.findIndex(({ id }) => id === row.courseId), (row) => row.order]);

  const chapters = readRows(workbook, 'chapters').map((row) => ({
    courseId: String(row.course_id),
    id: String(row.chapter_id),
    title: String(row.title),
    heroAsset: String(row.hero_asset),
    topicCount: integer(row.topic_count, `chapter ${row.chapter_id} topic_count`),
    wordCount: integer(row.word_count, `chapter ${row.chapter_id} word_count`),
    publicationState: String(row.publication_state),
  }));

  const topics = stableSort(readRows(workbook, 'topics').map((row) => ({
    courseId: String(row.course_id),
    id: String(row.topic_id),
    title: String(row.title),
    order: integer(row.topic_order, `topic ${row.course_id}/${row.topic_id} topic_order`),
    type: String(row.type),
    unlockRequirement: integer(row.unlock_requirement, `topic ${row.course_id}/${row.topic_id} unlock_requirement`),
    guide: String(row.guide),
    conceptCount: conceptCounts.get(String(row.topic_id)) || 0,
  })), [(row) => courses.findIndex(({ id }) => id === row.courseId), (row) => row.order]);

  const lessonSteps = stableSort(readRows(workbook, 'lesson_steps').map((row) => ({
    courseId: String(row.course_id),
    topicId: String(row.topic_id),
    id: String(row.step_id),
    order: integer(row.step_order, `lesson step ${row.step_id} step_order`),
    exerciseType: String(row.exercise_type),
    prompt: String(row.prompt),
    answer: String(row.answer),
    distractors: jsonArray(row.distractors_json, `lesson step ${row.step_id} distractors_json`),
    conceptId: row.concept_id ? String(row.concept_id) : null,
    conceptRefs: jsonArray(row.concept_refs_json, `lesson step ${row.step_id} concept_refs_json`),
    voiceId: String(row.voice_cast),
    primary: boolean(row.is_primary),
    publicationState: String(row.publication_state),
  })), [(row) => courses.findIndex(({ id }) => id === row.courseId), (row) => topics.find((topic) => topic.courseId === row.courseId && topic.id === row.topicId)?.order || 0, (row) => row.order]);

  const curriculum = {
    concepts,
    courses,
    courseVocabulary,
    chapters,
    topics,
    lessonSteps,
  };
  return {
    meta: {
      schemaVersion: 1,
      sourceWorkbook: 'patois_learn_database_1.xlsx',
      sourceSha256: crypto.createHash('sha256').update(workbookBytes).digest('hex'),
      courseContentSha256: buildCourseContentSha256ById(curriculum),
    },
    ...curriculum,
  };
}

export function serializeGeneratedCurriculum(curriculum) {
  return [
    '// GENERATED FILE. Edit patois_learn_database_1.xlsx, then run npm run content:build.',
    `const GENERATED_CURRICULUM = Object.freeze(${JSON.stringify(curriculum, null, 2)});`,
    '',
    'module.exports = { GENERATED_CURRICULUM };',
    '',
  ].join('\n');
}

async function main() {
  const workbookBytes = await fs.readFile(workbookPath);
  const curriculum = buildGeneratedCurriculum(workbookBytes);
  await fs.writeFile(outputPath, serializeGeneratedCurriculum(curriculum), 'utf8');
  console.log(JSON.stringify({
    outputPath,
    sourceSha256: curriculum.meta.sourceSha256,
    concepts: curriculum.concepts.length,
    courses: curriculum.courses.length,
    courseVocabulary: curriculum.courseVocabulary.length,
    topics: curriculum.topics.length,
    lessonSteps: curriculum.lessonSteps.length,
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  await main();
}
