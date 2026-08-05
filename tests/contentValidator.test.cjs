const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const XLSX = require('xlsx');
const {
  normalizeAnswer,
  validateContent,
} = require('../scripts/lib/content-validator.cjs');

const TOPIC_COUNTS = [5, 5, 5, 5, 7, 5, 7, 0, 0];

function makeDataset({ availability = 'preview' } = {}) {
  const courseId = 'test-course';
  const topics = TOPIC_COUNTS.map((conceptCount, index) => ({
    course_id: courseId,
    topic_id: `topic-${index + 1}`,
    title: `Topic ${index + 1}`,
    topic_order: index + 1,
    type: index < 7 ? 'lesson' : index === 7 ? 'review' : 'challenge',
    unlock_requirement: Math.max(index, 0),
    guide: 'Kai',
    conceptCount,
  }));
  const concepts = [];
  let conceptIndex = 0;
  for (const topic of topics) {
    for (let offset = 0; offset < topic.conceptCount; offset += 1) {
      conceptIndex += 1;
      concepts.push({
        concept_id: `concept-${String(conceptIndex).padStart(2, '0')}`,
        english_meaning: `Meaning ${conceptIndex}`,
        topic_id: topic.topic_id,
        topic_order: topic.topic_order,
        concept_order: offset + 1,
      });
    }
  }

  const publicationState = availability === 'published' ? 'published' : 'preview';
  const courseVocabulary = concepts.map((concept, index) => ({
    course_id: courseId,
    concept_id: concept.concept_id,
    localized_form: `Target ${index + 1}`,
    pronunciation: `Pronunciation ${index + 1}`,
    script_aid: '',
    image_path: `assets/images/vocab/${courseId}/${concept.concept_id}.png`,
    audio_path: `assets/audio/${courseId}/${concept.concept_id}.mp3`,
    voice_cast: 'target-test-speaker',
    review_status: availability === 'published' ? 'approved' : 'needs-native-review',
    publication_state: publicationState,
  }));
  const lessonSteps = concepts.map((concept, index) => ({
    course_id: courseId,
    topic_id: concept.topic_id,
    step_id: `${courseId}-${concept.concept_id}-01`,
    step_order: index + 1,
    exercise_type: 'translate-to-target',
    prompt: `Choose ${concept.english_meaning}`,
    answer: courseVocabulary[index].localized_form,
    distractors_json: '[]',
    concept_refs_json: JSON.stringify([concept.concept_id]),
    concept_id: concept.concept_id,
    voice_cast: 'target-test-speaker',
    publication_state: publicationState,
  }));

  return {
    concepts,
    courses: [{
      course_id: courseId,
      base_language: 'English',
      display_name: 'Test Course',
      writing_system: 'Latin',
      onboarding: true,
      availability,
    }],
    course_vocabulary: courseVocabulary,
    chapters: [{
      course_id: courseId,
      chapter_id: `${courseId}-greetings`,
      title: 'Greetings & basic conversations',
      hero_asset: `assets/images/chapters/${courseId}-greetings.png`,
      topic_count: 9,
      word_count: 39,
      publication_state: publicationState,
    }],
    topics: topics.map(({ conceptCount: _conceptCount, ...topic }) => topic),
    lesson_steps: lessonSteps,
  };
}

function writeWorkbook(root, data) {
  const workbook = XLSX.utils.book_new();
  for (const [sheetName, rows] of Object.entries(data)) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), sheetName);
  }
  const workbookPath = path.join(root, 'patois_learn_database_1.xlsx');
  XLSX.writeFile(workbook, workbookPath);
  return workbookPath;
}

function makeTempProject(data = makeDataset()) {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'diaspora-content-validator-'));
  return {
    projectRoot,
    workbookPath: writeWorkbook(projectRoot, data),
    generatedPath: path.join(projectRoot, 'src', 'data', 'generatedCurriculum.cjs'),
    data,
  };
}

function createPublishedAssets(projectRoot, data) {
  const assetPaths = [
    ...data.course_vocabulary.flatMap((row) => [row.image_path, row.audio_path]),
    ...data.chapters.map((row) => row.hero_asset),
  ];
  for (const relativePath of assetPaths) {
    const absolutePath = path.join(projectRoot, relativePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, 'fixture');
  }
}

function createPreviewVisualAssets(projectRoot, data) {
  const assetPaths = [
    ...data.course_vocabulary.map((row) => row.image_path),
    ...data.chapters.map((row) => row.hero_asset),
  ];
  for (const relativePath of assetPaths) {
    const absolutePath = path.join(projectRoot, relativePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, 'fixture');
  }
}

function generatedProjection(data, sourceSha256) {
  return {
    meta: { sourceWorkbook: 'patois_learn_database_1.xlsx', sourceSha256 },
    concepts: data.concepts.map((row) => ({
      id: row.concept_id,
      meaning: row.english_meaning,
      topicId: row.topic_id,
      topicOrder: row.topic_order,
      order: row.concept_order,
    })),
    courses: data.courses.map((row) => ({
      id: row.course_id,
      baseLanguage: row.base_language,
      displayName: row.display_name,
      writingSystem: row.writing_system,
      onboarding: row.onboarding,
      availability: row.availability,
    })),
    courseVocabulary: data.course_vocabulary.map((row) => ({
      courseId: row.course_id,
      conceptId: row.concept_id,
      localized: row.localized_form,
      pronunciation: row.pronunciation,
      scriptAid: row.script_aid,
      image: row.image_path,
      audio: row.audio_path,
      voiceId: row.voice_cast,
      reviewStatus: row.review_status,
      publicationState: row.publication_state,
    })),
    chapters: data.chapters.map((row) => ({
      courseId: row.course_id,
      id: row.chapter_id,
      title: row.title,
      heroAsset: row.hero_asset,
      topicCount: row.topic_count,
      wordCount: row.word_count,
      publicationState: row.publication_state,
    })),
    topics: data.topics.map((row) => ({
      courseId: row.course_id,
      id: row.topic_id,
      title: row.title,
      order: row.topic_order,
      type: row.type,
      unlockRequirement: row.unlock_requirement,
      guide: row.guide,
    })),
    lessonSteps: data.lesson_steps.map((row) => ({
      courseId: row.course_id,
      topicId: row.topic_id,
      id: row.step_id,
      order: row.step_order,
      type: row.exercise_type,
      prompt: row.prompt,
      answer: row.answer,
      distractors: JSON.parse(row.distractors_json),
      conceptRefs: JSON.parse(row.concept_refs_json),
      conceptId: row.concept_id,
      voiceId: row.voice_cast,
      publicationState: row.publication_state,
    })),
  };
}

function writeGeneratedArtifact(generatedPath, projection) {
  fs.mkdirSync(path.dirname(generatedPath), { recursive: true });
  fs.writeFileSync(
    generatedPath,
    `module.exports = { GENERATED_CURRICULUM: ${JSON.stringify(projection)} };\n`,
    'utf8'
  );
}

test('normalizes Unicode, punctuation, case, and whitespace before duplicate checks', () => {
  assert.equal(normalizeAnswer('  Long\u2014TIME...  No  See! '), 'long time no see');
});

test('preview content passes without physical production audio after visual assets exist', () => {
  const fixture = makeTempProject();
  createPreviewVisualAssets(fixture.projectRoot, fixture.data);
  const report = validateContent(fixture);

  assert.equal(report.ok, true, report.errors.join('\n'));
  assert.equal(report.stats.concepts, 39);
  assert.equal(report.stats.topics, 9);
  assert.equal(report.stats.courseVocabulary, 39);
});

test('preview content requires its referenced images and hero but not audio', () => {
  const fixture = makeTempProject();
  const report = validateContent(fixture);

  assert.equal(report.ok, false);
  assert.match(report.errors.join('\n'), /missing image file/i);
  assert.match(report.errors.join('\n'), /missing hero file/i);
  assert.doesNotMatch(report.errors.join('\n'), /missing audio file/i);
});

test('unavailable lesson steps may remain silent until a voice is approved', () => {
  const data = makeDataset({ availability: 'backlog' });
  data.course_vocabulary.forEach((row) => {
    row.audio_path = '';
    row.publication_state = 'unavailable';
  });
  data.chapters.forEach((row) => { row.publication_state = 'unavailable'; });
  data.lesson_steps.forEach((row) => {
    row.voice_cast = '';
    row.publication_state = 'unavailable';
  });
  const fixture = makeTempProject(data);
  const report = validateContent(fixture);

  assert.equal(report.ok, true, report.errors.join('\n'));
});

test('published vocabulary still requires an audio path', () => {
  const data = makeDataset({ availability: 'published' });
  const fixture = makeTempProject(data);
  createPublishedAssets(fixture.projectRoot, data);
  data.course_vocabulary[0].audio_path = '';
  fixture.workbookPath = writeWorkbook(fixture.projectRoot, data);
  const report = validateContent(fixture);

  assert.equal(report.ok, false);
  assert.match(report.errors.join('\n'), /course_vocabulary row 2: missing required field audio_path/i);
});

test('preview lesson steps still require an approved voice cast', () => {
  const data = makeDataset();
  data.lesson_steps[0].voice_cast = '';
  const fixture = makeTempProject(data);
  createPreviewVisualAssets(fixture.projectRoot, data);
  const report = validateContent(fixture);

  assert.equal(report.ok, false);
  assert.match(report.errors.join('\n'), /lesson_steps row 2: missing required field voice_cast/i);
});

test('published content requires exactly 39 unique concepts, nine topics, and unique normalized answers', () => {
  const data = makeDataset({ availability: 'published' });
  data.course_vocabulary.pop();
  data.topics.pop();
  data.course_vocabulary[1].localized_form = ' target-1!! ';
  const fixture = makeTempProject(data);
  const report = validateContent(fixture);

  assert.equal(report.ok, false);
  assert.match(report.errors.join('\n'), /exactly 39 unique concepts/i);
  assert.match(report.errors.join('\n'), /exactly 9 topics/i);
  assert.match(report.errors.join('\n'), /duplicate normalized answer/i);
});

test('published content requires approved rows and every referenced production asset', () => {
  const data = makeDataset({ availability: 'published' });
  const fixture = makeTempProject(data);
  createPublishedAssets(fixture.projectRoot, data);
  fs.rmSync(path.join(fixture.projectRoot, data.course_vocabulary[0].audio_path));
  data.course_vocabulary[1].review_status = 'needs-native-review';
  fixture.workbookPath = writeWorkbook(fixture.projectRoot, data);

  const report = validateContent(fixture);
  assert.equal(report.ok, false);
  assert.match(report.errors.join('\n'), /must be approved/i);
  assert.match(report.errors.join('\n'), /missing audio file/i);
});

test('rejects missing schema fields, malformed references, and legacy asset paths', () => {
  const data = makeDataset();
  delete data.courses[0].writing_system;
  data.course_vocabulary[0].image_path = 'assets/images/vocab/greetings/old-wave.png';
  data.chapters[0].hero_asset = 'assets/images/chapters/legacy-brown.png';
  data.lesson_steps[0].concept_refs_json = 'not-json';
  const fixture = makeTempProject(data);
  const report = validateContent(fixture);

  assert.equal(report.ok, false);
  assert.match(report.errors.join('\n'), /missing required column.*writing_system/i);
  assert.match(report.errors.join('\n'), /legacy or non-canonical image_path/i);
  assert.match(report.errors.join('\n'), /legacy or non-canonical hero_asset/i);
  assert.match(report.errors.join('\n'), /invalid concept_refs_json/i);
});

test('accepts a byte-hash-matched generated projection of the workbook', () => {
  const fixture = makeTempProject();
  createPreviewVisualAssets(fixture.projectRoot, fixture.data);
  const sourceSha256 = crypto.createHash('sha256').update(fs.readFileSync(fixture.workbookPath)).digest('hex');
  writeGeneratedArtifact(fixture.generatedPath, generatedProjection(fixture.data, sourceSha256));

  const report = validateContent(fixture);
  assert.equal(report.ok, true, report.errors.join('\n'));
  assert.equal(report.stats.generatedArtifact, 'verified');
});

test('compares workbook-backed fields while allowing generated runtime metadata', () => {
  const fixture = makeTempProject();
  createPreviewVisualAssets(fixture.projectRoot, fixture.data);
  const sourceSha256 = crypto.createHash('sha256').update(fs.readFileSync(fixture.workbookPath)).digest('hex');
  const projection = generatedProjection(fixture.data, sourceSha256);
  projection.courseVocabulary.forEach((row, index) => { row.order = index + 1; });
  projection.topics.forEach((row) => { row.conceptCount = 0; });
  projection.lessonSteps.forEach((row) => {
    row.exerciseType = row.type;
    row.primary = true;
    delete row.type;
  });
  writeGeneratedArtifact(fixture.generatedPath, projection);

  const report = validateContent(fixture);
  assert.equal(report.ok, true, report.errors.join('\n'));
});

test('rejects stale or content-divergent generated runtime data', () => {
  const fixture = makeTempProject();
  createPreviewVisualAssets(fixture.projectRoot, fixture.data);
  const sourceSha256 = crypto.createHash('sha256').update(fs.readFileSync(fixture.workbookPath)).digest('hex');
  const projection = generatedProjection(fixture.data, sourceSha256);
  projection.courseVocabulary[0].localized = 'Stale answer';
  writeGeneratedArtifact(fixture.generatedPath, projection);

  const report = validateContent(fixture);
  assert.equal(report.ok, false);
  assert.match(report.errors.join('\n'), /generated courseVocabulary does not agree/i);
});

test('reports a missing workbook without trusting or crashing on an existing artifact', () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'diaspora-content-validator-'));
  const generatedPath = path.join(projectRoot, 'src', 'data', 'generatedCurriculum.cjs');
  writeGeneratedArtifact(generatedPath, { meta: { sourceWorkbook: 'missing.xlsx', sourceSha256: 'stale' } });

  const report = validateContent({
    projectRoot,
    workbookPath: path.join(projectRoot, 'missing.xlsx'),
    generatedPath,
  });
  assert.equal(report.ok, false);
  assert.match(report.errors.join('\n'), /workbook does not exist/i);
});
