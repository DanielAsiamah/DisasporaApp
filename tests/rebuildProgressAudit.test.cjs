const assert = require('node:assert/strict');
const test = require('node:test');

const {
  auditRebuildProgress,
} = require('../scripts/lib/rebuild-progress-audit.cjs');

const COURSE_IDS = [
  'jamaican-patois',
  'swahili',
  'wolof',
  'haitian-creole',
  'sudanese-arabic',
  'nobiin',
  'igbo',
  'belizean-kriol',
  'aave',
];

function fixture() {
  const vocabulary = [];
  const topics = [];
  const existingFiles = new Set();
  for (const courseId of COURSE_IDS) {
    for (let index = 1; index <= 39; index += 1) {
      const conceptId = `concept-${String(index).padStart(2, '0')}`;
      const imagePath = `assets/images/vocab/${courseId}/${conceptId}.png`;
      const audioPath = `assets/audio/${courseId}/${conceptId}.mp3`;
      vocabulary.push({
        course_id: courseId,
        concept_id: conceptId,
        review_status: 'approved',
        image_path: imagePath,
        audio_path: audioPath,
      });
      existingFiles.add(imagePath);
      existingFiles.add(audioPath);
    }
    for (let index = 1; index <= 9; index += 1) {
      topics.push({ course_id: courseId, topic_id: `${courseId}-topic-${index}` });
    }
  }
  return {
    courseIds: COURSE_IDS,
    vocabulary,
    topics,
    fileExists: (filePath) => existingFiles.has(filePath),
  };
}

test('whole-plan audit proves the exact nine-course 351-row and 351-asset target', () => {
  const report = auditRebuildProgress(fixture());

  assert.equal(report.complete, true, report.errors.join('\n'));
  assert.deepEqual(report.totals, {
    courses: 9,
    vocabularyRows: 351,
    approvedRows: 351,
    topics: 81,
    illustrations: 351,
    audioFiles: 351,
  });
  assert.ok(report.courses.every((course) => (
    course.structurallyComplete && course.releaseAssetsComplete
  )));
});

test('whole-plan audit identifies the exact review, image, audio, and duplicate gaps', () => {
  const input = fixture();
  const first = input.vocabulary[0];
  first.review_status = 'needs-native-review';
  const originalFileExists = input.fileExists;
  input.fileExists = (filePath) => (
    filePath !== first.image_path
    && filePath !== first.audio_path
    && originalFileExists(filePath)
  );
  input.vocabulary[1].concept_id = input.vocabulary[2].concept_id;

  const report = auditRebuildProgress(input);
  const patois = report.courses.find((course) => course.courseId === 'jamaican-patois');

  assert.equal(report.complete, false);
  assert.equal(patois.uniqueConcepts, 38);
  assert.equal(patois.approvedRows, 38);
  assert.equal(patois.illustrations, 37);
  assert.equal(patois.audioFiles, 37);
  assert.match(report.errors.join('\n'), /Jamaican Patois/i);
});
