const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const XLSX = require('xlsx');
const { createHash } = require('node:crypto');
const { buildMasterPreview } = require('../scripts/lib/master-preview-curriculum.cjs');
const root = path.resolve(__dirname, '..');
const manifest = require('../content/master-preview/igbo-greetings.json');
const workbook = XLSX.readFile(path.join(root, 'content/source-intake/workbooks/diaspora_10000_content_master.xlsx'));
const rows = sheet => XLSX.utils.sheet_to_json(workbook.Sheets[sheet], { defval: '' });
const sourceBook = XLSX.read(fs.readFileSync(path.join(root, manifest.sourcePath), 'utf8'), { type: 'string' });
const sourceRows = XLSX.utils.sheet_to_json(sourceBook.Sheets[sourceBook.SheetNames[0]], { defval: '' });
const referenceSources = Object.fromEntries(manifest.referenceSources.map(source => [
  source.id,
  JSON.parse(fs.readFileSync(path.join(root, source.path), 'utf8')),
]));
const input = { languages: rows('Languages'), units: rows('Unit_Roadmap'), lessons: rows('Lessons'), vocabulary: rows('Vocabulary_Master') };
const build = (m = manifest, data = input, source = sourceRows, references = referenceSources) => buildMasterPreview(data, m, source, references);

test('checked-in master artifact is bound to current workbook, candidates and source bytes', () => {
  const { GENERATED_MASTER_PREVIEW: artifact } = require('../src/data/generatedMasterPreview.cjs');
  const hash = relative => createHash('sha256').update(fs.readFileSync(path.join(root, relative))).digest('hex');
  assert.equal(artifact.meta.sourceSha256, hash(artifact.meta.sourceWorkbook));
  assert.equal(artifact.meta.candidateSha256, hash(artifact.meta.candidatePath));
  assert.equal(manifest.sourceSha256, hash(manifest.sourcePath));
  assert.deepEqual(artifact.meta.referenceSources, manifest.referenceSources.map(source => ({
    id: source.id, path: source.path, sha256: hash(source.path),
  })));
  const { meta, ...projection } = artifact;
  assert.deepEqual(projection, build());
});

test('master preview preserves workbook IDs, order, wording and complete-lesson coverage', () => {
  const curriculum = build();
  assert.deepEqual(curriculum.topics.map(topic => topic.id), ['igbo_u01_l01', 'igbo_u01_l02', 'igbo_u01_l03']);
  assert.deepEqual(curriculum.topics.map(topic => topic.title), ['Greetings 1', 'Greetings 2', 'Greetings 3']);
  assert.equal(curriculum.courseVocabulary.length, 9);
  assert.equal(curriculum.courseVocabulary[1].localized, '\u1ee4t\u1ee5t\u1ee5 \u1ecdma');
  assert.ok(curriculum.courseVocabulary.every(row => row.reviewStatus === 'needs-native-review'));
  assert.ok(curriculum.courses.every(course => course.availability === 'unavailable'));
  assert.equal(curriculum.courseVocabulary.find(row => row.conceptId === 'igbo_u01_08_welcome').localized, 'Nnọọ');
  assert.equal(curriculum.courseVocabulary.find(row => row.conceptId === 'igbo_u01_08_welcome').source.url, referenceSources['harvard-igbo-greetings'].sourceUrl);
  assert.equal(curriculum.chapters[0].topicCount, 3);
  assert.equal(curriculum.chapters[0].wordCount, 9);
  assert.equal(curriculum.chapters[0].plannedTopicCount, 4);
  assert.deepEqual(build(), curriculum);
});

test('partial translations never expose partial lessons or skip earlier missing lessons', () => {
  assert.deepEqual(build({ ...manifest, candidates: manifest.candidates.slice(0, 2) }).topics, []);
  assert.deepEqual(build({ ...manifest, candidates: manifest.candidates.slice(0, 4) }).topics.map(t => t.id), ['igbo_u01_l01']);
  assert.deepEqual(build({ ...manifest, candidates: manifest.candidates.slice(0, 8) }).topics.map(t => t.id), ['igbo_u01_l01', 'igbo_u01_l02']);
  assert.deepEqual(build({ ...manifest, candidates: manifest.candidates.slice(3) }).topics, []);
});

test('stale source text, unrelated wording, duplicate IDs and false approvals fail closed', () => {
  const changed = changes => ({ ...manifest, candidates: [{ ...manifest.candidates[0], ...changes }, ...manifest.candidates.slice(1)] });
  assert.throws(() => build(changed({ english: 'goodbye' })), /meaning/i);
  assert.throws(() => build(changed({ localized: 'invented translation' })), /source/i);
  assert.throws(() => build(changed({ contentId: 'missing' })), /unknown/i);
  assert.throws(() => build({ ...manifest, candidates: [...manifest.candidates, manifest.candidates[0]] }), /duplicate/i);
  assert.throws(() => build(manifest, input, sourceRows.slice(2)), /source/i);
  const staleReference = structuredClone(referenceSources);
  staleReference['harvard-igbo-greetings'].facts[0].localized = 'Invented';
  assert.throws(() => build(manifest, input, sourceRows, staleReference), /reference/i);
  assert.throws(() => build({ ...manifest, candidates: manifest.candidates.map(candidate => candidate.referenceEvidenceId === 'welcome' ? { ...candidate, referenceEvidenceId: 'missing' } : candidate) }), /reference/i);
  assert.throws(() => build({ ...manifest, reviewStatus: 'approved' }), /review/i);
});

test('generated exercises carry only lesson-owned concept and reward identities', () => {
  const curriculum = build();
  assert.equal(new Set(curriculum.lessonSteps.map(step => step.id)).size, curriculum.lessonSteps.length);
  for (const topic of curriculum.topics) {
    const concepts = new Set(curriculum.concepts.filter(row => row.topicId === topic.id).map(row => row.id));
    const steps = curriculum.lessonSteps.filter(step => step.topicId === topic.id);
    assert.ok(steps.length >= 6);
    assert.ok(steps.some(step => step.exerciseType === 'match-pairs'));
    assert.ok(steps.some(step => step.exerciseType === 'sentence-build-target'));
    for (const step of steps) {
      assert.ok(step.conceptRefs.every(id => concepts.has(id)));
      assert.match(step.id, /^[A-Za-z0-9_-]+$/);
    }
  }
});
