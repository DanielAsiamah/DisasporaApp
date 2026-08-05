const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { GENERATED_CURRICULUM } = require('../src/data/generatedCurriculum.cjs');
const {
  AMBIGUITY_NOTE_CONCEPTS,
  REVIEW_HEADERS,
  applyApprovedNativeReview,
  buildNativeReviewEvidencePaths,
  buildNativeReviewReceipt,
  buildNativeReviewPlan,
} = require('../scripts/lib/native-review-import.cjs');

const courseId = 'swahili';
const sourceSha256 = GENERATED_CURRICULUM.meta.sourceSha256;
const vocabulary = GENERATED_CURRICULUM.courseVocabulary
  .filter((row) => row.courseId === courseId)
  .sort((left, right) => left.order - right.order);
const projectRoot = path.resolve(__dirname, '..');

function reviewMatrices(overrides = {}) {
  const reviewRows = vocabulary.map((row) => ({
    order: row.order,
    conceptId: row.conceptId,
    localized: row.localized,
    pronunciation: row.pronunciation,
    decision: 'Approved',
    finalLocalized: '',
    finalPronunciation: '',
    notes: AMBIGUITY_NOTE_CONCEPTS.has(row.conceptId) ? 'Approved for the intended lesson context.' : '',
    reviewer: 'Qualified reviewer — 2026-07-21',
    ...(overrides[row.conceptId] || {}),
  }));

  return {
    reviewMatrix: [
      REVIEW_HEADERS,
      ...reviewRows.map((row) => [
        row.order,
        `Topic ${row.order}`,
        row.conceptId,
        `Meaning ${row.order}`,
        row.localized,
        row.pronunciation,
        AMBIGUITY_NOTE_CONCEPTS.has(row.conceptId) ? 'Review this usage.' : '',
        'needs-native-review',
        row.decision,
        row.finalLocalized,
        row.finalPronunciation,
        row.notes,
        row.reviewer,
      ]),
    ],
    metadataMatrix: [
      ['Field', 'Value'],
      ['Course ID', courseId],
      ['Vocabulary rows', 39],
      ['Source workbook', GENERATED_CURRICULUM.meta.sourceWorkbook],
      ['Source workbook SHA-256', sourceSha256],
    ],
  };
}

test('a complete native review yields a deterministic 39-row import plan', () => {
  const matrices = reviewMatrices({
    'good-afternoon': {
      finalLocalized: 'Habari za mchana',
      finalPronunciation: 'hah-BAH-ree zah m-CHAH-nah',
      notes: 'Plural agreement is preferred for this course register.',
    },
  });
  const plan = buildNativeReviewPlan({
    courseId,
    sourceSha256,
    sourceWorkbook: GENERATED_CURRICULUM.meta.sourceWorkbook,
    canonicalRows: vocabulary,
    ...matrices,
  });

  assert.equal(plan.ready, true);
  assert.deepEqual(plan.summary, { total: 39, approved: 39, needsChanges: 0, unreviewed: 0, changes: 1 });
  assert.equal(plan.errors.length, 0);
  assert.equal(plan.rows.find((row) => row.conceptId === 'good-afternoon').finalLocalized, 'Habari za mchana');
});

test('the review gate rejects incomplete, unattributed, ambiguous, or stale approvals', () => {
  const matrices = reviewMatrices({
    yes: { decision: 'Unreviewed' },
    no: { reviewer: '' },
    sorry: { notes: '' },
  });
  matrices.metadataMatrix[4][1] = 'stale-source-hash';

  const plan = buildNativeReviewPlan({
    courseId,
    sourceSha256,
    sourceWorkbook: GENERATED_CURRICULUM.meta.sourceWorkbook,
    canonicalRows: vocabulary,
    ...matrices,
  });

  assert.equal(plan.ready, false);
  assert.equal(plan.summary.approved, 38);
  assert.equal(plan.summary.unreviewed, 1);
  assert.ok(plan.errors.some((message) => /stale/i.test(message)));
  assert.ok(plan.errors.some((message) => /reviewer/i.test(message) && /no\b/i.test(message)));
  assert.ok(plan.errors.some((message) => /context note/i.test(message) && /sorry/i.test(message)));
});

test('the review gate rejects duplicate or mismatched concept rows and source text', () => {
  const matrices = reviewMatrices();
  matrices.reviewMatrix[2][2] = matrices.reviewMatrix[1][2];
  matrices.reviewMatrix[3][4] = 'Unexpected edited source';

  const plan = buildNativeReviewPlan({
    courseId,
    sourceSha256,
    sourceWorkbook: GENERATED_CURRICULUM.meta.sourceWorkbook,
    canonicalRows: vocabulary,
    ...matrices,
  });

  assert.equal(plan.ready, false);
  assert.ok(plan.errors.some((message) => /duplicate/i.test(message)));
  assert.ok(plan.errors.some((message) => /missing concept/i.test(message)));
  assert.ok(plan.errors.some((message) => /does not match the canonical/i.test(message)));
});

test('applying an approved plan changes only target wording and review status', () => {
  const plan = buildNativeReviewPlan({
    courseId,
    sourceSha256,
    sourceWorkbook: GENERATED_CURRICULUM.meta.sourceWorkbook,
    canonicalRows: vocabulary,
    ...reviewMatrices({
      'good-afternoon': {
        finalLocalized: 'Habari za mchana',
        finalPronunciation: 'hah-BAH-ree zah m-CHAH-nah',
        notes: 'Plural agreement is preferred for this course register.',
      },
    }),
  });
  const rawWorkbookRows = GENERATED_CURRICULUM.courseVocabulary.map((row) => ({
    course_id: row.courseId,
    concept_id: row.conceptId,
    localized_form: row.localized,
    pronunciation: row.pronunciation,
    review_status: row.reviewStatus,
    publication_state: row.publicationState,
    image_path: row.image,
    audio_path: row.audio,
  }));

  const rawLessonSteps = GENERATED_CURRICULUM.lessonSteps.map((step) => ({
    course_id: step.courseId,
    topic_id: step.topicId,
    step_id: step.id,
    prompt: step.prompt,
    answer: step.answer,
    distractors_json: JSON.stringify(step.distractors),
    concept_id: step.conceptId || '',
    concept_refs_json: JSON.stringify(step.conceptRefs),
    publication_state: step.publicationState,
  }));
  rawLessonSteps.push({
    course_id: courseId,
    topic_id: 'getting-started',
    step_id: 'swahili-unrelated-text-guard',
    prompt: 'Do not rewrite the unrelated example Habari ya mchana.',
    answer: 'Ndiyo',
    distractors_json: JSON.stringify(['Hapana']),
    concept_id: 'yes',
    concept_refs_json: JSON.stringify(['yes', 'no']),
    publication_state: 'unavailable',
  });

  const applied = applyApprovedNativeReview({
    courseId,
    workbookRows: rawWorkbookRows,
    lessonStepRows: rawLessonSteps,
    plan,
  });
  const changed = applied.workbookRows.find(
    (row) => row.course_id === courseId && row.concept_id === 'good-afternoon'
  );
  const changedPrompt = applied.lessonStepRows.find(
    (row) => row.step_id === 'swahili-easy-greetings-01-good-afternoon'
  );
  const changedDistractor = applied.lessonStepRows.find(
    (row) => row.step_id === 'swahili-easy-greetings-02-nice-to-meet-you'
  );
  const otherCourse = applied.workbookRows.find((row) => row.course_id === 'jamaican-patois');
  const unrelatedPrompt = applied.lessonStepRows.find(
    (row) => row.step_id === 'swahili-unrelated-text-guard'
  );

  assert.equal(changed.localized_form, 'Habari za mchana');
  assert.equal(changed.pronunciation, 'hah-BAH-ree zah m-CHAH-nah');
  assert.equal(changed.review_status, 'approved');
  assert.equal(changed.publication_state, 'unavailable');
  assert.match(changedPrompt.prompt, /Habari za mchana/);
  assert.doesNotMatch(changedPrompt.prompt, /Habari ya mchana/);
  assert.ok(JSON.parse(changedDistractor.distractors_json).includes('Habari za mchana'));
  assert.equal(
    unrelatedPrompt.prompt,
    'Do not rewrite the unrelated example Habari ya mchana.'
  );
  assert.equal(applied.summary.lessonStepsApplied, 65);
  assert.equal(changedPrompt.publication_state, 'unavailable');
  assert.deepEqual(otherCourse, rawWorkbookRows.find((row) => row.course_id === 'jamaican-patois'));
  assert.throws(
    () => applyApprovedNativeReview({
      courseId,
      workbookRows: rawWorkbookRows,
      lessonStepRows: rawLessonSteps,
      plan: { ...plan, ready: false },
    }),
    /not ready/i
  );
});

test('the native-review command defaults to validation and requires a second explicit apply confirmation', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
  const scriptPath = path.join(projectRoot, 'scripts', 'apply-native-review.js');
  const source = fs.readFileSync(scriptPath, 'utf8');

  assert.equal(
    pkg.scripts['native-review:swahili:check'],
    'node scripts/apply-native-review.js --course swahili --review outputs/swahili-review/swahili-native-review.xlsx'
  );
  assert.doesNotMatch(pkg.scripts['native-review:swahili:check'], /--apply|--confirm-native-review/);
  assert.match(source, /--apply/);
  assert.match(source, /--confirm-native-review/);
  assert.match(source, /validateContent/);
  assert.match(source, /native-review-backups/);
  assert.match(source, /buildNativeReviewEvidencePaths/);
});

test('approved native-review evidence is stored at immutable tracked paths', () => {
  const sourceWorkbookSha256After = 'a'.repeat(64);
  const paths = buildNativeReviewEvidencePaths({
    courseId,
    sourceWorkbookSha256After,
  });

  assert.deepEqual(paths, {
    directory: `content/release-evidence/native-review/${courseId}/${sourceWorkbookSha256After}`,
    reviewWorkbookPath: `content/release-evidence/native-review/${courseId}/${sourceWorkbookSha256After}/review.xlsx`,
    receiptPath: `content/release-evidence/native-review/${courseId}/${sourceWorkbookSha256After}/receipt.json`,
  });
  assert.throws(
    () => buildNativeReviewEvidencePaths({ courseId: '../swahili', sourceWorkbookSha256After }),
    /invalid course ID/i
  );
  assert.throws(
    () => buildNativeReviewEvidencePaths({ courseId, sourceWorkbookSha256After: 'not-a-sha' }),
    /SHA-256/i
  );
});

test('an applied native review produces a source-bound receipt for the release gate', () => {
  const plan = buildNativeReviewPlan({
    courseId,
    sourceSha256,
    sourceWorkbook: GENERATED_CURRICULUM.meta.sourceWorkbook,
    canonicalRows: vocabulary,
    ...reviewMatrices(),
  });
  const reviewWorkbookBytes = Buffer.from('review-workbook');
  const receipt = buildNativeReviewReceipt({
    courseId,
    plan,
    sourceWorkbookSha256Before: sourceSha256,
    sourceWorkbookSha256After: 'after-import-sha',
    reviewWorkbookPath: 'outputs/swahili-review/swahili-native-review.xlsx',
    reviewWorkbookBytes,
    appliedAt: '2026-07-21T15:00:00Z',
  });

  assert.equal(receipt.approvedRows, 39);
  assert.equal(receipt.sourceWorkbookSha256After, 'after-import-sha');
  assert.match(receipt.reviewWorkbookSha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(receipt.reviewers, ['Qualified reviewer — 2026-07-21']);
  assert.throws(
    () => buildNativeReviewReceipt({
      courseId,
      plan: { ...plan, ready: false },
      sourceWorkbookSha256Before: sourceSha256,
      sourceWorkbookSha256After: 'after-import-sha',
      reviewWorkbookPath: 'review.xlsx',
      reviewWorkbookBytes,
      appliedAt: '2026-07-21T15:00:00Z',
    }),
    /not ready/i
  );
});
