const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const XLSX = require('xlsx');

const projectRoot = path.resolve(__dirname, '..');
const workbookPath = path.join(projectRoot, 'patois_learn_database_1.xlsx');
const generatedPath = path.join(projectRoot, 'src', 'data', 'generatedCurriculum.cjs');

function workbookRows(sheetName) {
  const workbook = XLSX.readFile(workbookPath);
  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
}

test('the workbook defines the exact deterministic Patois runtime steps', () => {
  const steps = workbookRows('lesson_steps').filter(({ course_id: courseId }) => courseId === 'jamaican-patois');
  const topics = workbookRows('topics').filter(({ course_id: courseId }) => courseId === 'jamaican-patois');
  const vocabulary = workbookRows('course_vocabulary').filter(({ course_id: courseId }) => courseId === 'jamaican-patois');

  assert.equal(topics.length, 9);
  assert.equal(vocabulary.length, 39);
  assert.equal(steps.length, 64);
  assert.equal(new Set(steps.map(({ step_id: stepId }) => stepId)).size, 64);
  assert.deepEqual(
    [...new Set(steps.map(({ exercise_type: type }) => type))].sort(),
    [
      'listen-choice',
      'match-pairs',
      'sentence-build-target',
      'translate-to-meaning',
      'translate-to-target',
      'word-tray-meaning',
    ]
  );
  assert.ok(steps.every(({ prompt, publication_state: state }) => prompt && state === 'preview'));
  assert.ok(steps.filter(({ exercise_type: type }) => type === 'match-pairs').every(({ concept_refs_json: refs }) => JSON.parse(refs).length >= 3));
  assert.ok(vocabulary.every(({ voice_cast: voice }) => /^target-patois-(denzel|annakay)$/.test(voice)));
});

test('generated runtime curriculum is a byte-hash-matched projection of the workbook', () => {
  assert.ok(fs.existsSync(generatedPath), 'Run npm run content:build to generate src/data/generatedCurriculum.cjs.');
  delete require.cache[require.resolve(generatedPath)];
  const { GENERATED_CURRICULUM } = require(generatedPath);
  const sourceHash = crypto.createHash('sha256').update(fs.readFileSync(workbookPath)).digest('hex');

  assert.equal(GENERATED_CURRICULUM.meta.sourceWorkbook, 'patois_learn_database_1.xlsx');
  assert.equal(GENERATED_CURRICULUM.meta.sourceSha256, sourceHash);
  assert.equal(GENERATED_CURRICULUM.concepts.length, 39);
  assert.equal(GENERATED_CURRICULUM.courses.length, 9);
  assert.equal(GENERATED_CURRICULUM.courseVocabulary.length, 351);
  assert.equal(GENERATED_CURRICULUM.topics.length, 81);
  assert.equal(GENERATED_CURRICULUM.lessonSteps.length, 64);
});

test('runtime curriculum adapters expose only workbook-generated content', () => {
  const { GENERATED_CURRICULUM } = require('../src/data/generatedCurriculum.cjs');
  const { CONCEPTS, COURSE_CATALOG, TOPICS } = require('../src/data/curriculumContract.cjs');
  const { JAMAICAN_PATOIS_VOCABULARY } = require('../src/data/jamaicanPatoisVocabulary.cjs');
  const { buildPatoisTopicExercises } = require('../src/lessonEngine/patoisLessonSteps.cjs');

  assert.deepEqual(CONCEPTS, GENERATED_CURRICULUM.concepts);
  assert.deepEqual(COURSE_CATALOG, GENERATED_CURRICULUM.courses);
  assert.deepEqual(TOPICS, GENERATED_CURRICULUM.topics.filter(({ courseId }) => courseId === 'jamaican-patois'));
  assert.deepEqual(
    JAMAICAN_PATOIS_VOCABULARY,
    GENERATED_CURRICULUM.courseVocabulary.filter(({ courseId }) => courseId === 'jamaican-patois')
  );

  const runtimeSteps = TOPICS.flatMap(({ id }) => buildPatoisTopicExercises(id, { hasAudio: () => true }));
  const workbookSteps = GENERATED_CURRICULUM.lessonSteps.filter(({ courseId }) => courseId === 'jamaican-patois');
  assert.deepEqual(runtimeSteps.map(({ sourceStepId }) => sourceStepId), workbookSteps.map(({ id }) => id));
});

test('the content build command regenerates the canonical workbook projection', () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));

  assert.equal(
    packageJson.scripts['content:build'],
    'node scripts/generate-runtime-curriculum.mjs'
  );
  for (const requiredContract of [
    'tests/workbookRuntimeSource.test.cjs',
    'tests/contentValidator.test.cjs',
    'tests/mvpProgressPersistence.test.cjs',
  ]) {
    assert.match(packageJson.scripts['test:rebuild-contracts'], new RegExp(requiredContract.replaceAll('.', '\\.')));
  }
});
