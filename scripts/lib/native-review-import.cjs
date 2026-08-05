const crypto = require('node:crypto');

const REVIEW_HEADERS = Object.freeze([
  'Order',
  'Topic',
  'Concept ID',
  'English meaning',
  'Current localized form',
  'Current pronunciation',
  'Review focus',
  'Source status',
  'Review decision',
  'Final localized form',
  'Final pronunciation',
  'Reviewer notes',
  'Reviewer / date',
]);

const REVIEW_DECISIONS = new Set(['approved', 'needs changes', 'unreviewed']);
const AMBIGUITY_NOTE_CONCEPTS = new Set([
  'good-afternoon',
  'excuse-me',
  'sorry',
  'he-lives-here',
  'she-works-here',
  'daughter',
  'grandfather',
]);

function text(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function normalized(value) {
  return text(value).toLocaleLowerCase('en');
}

function metadataMap(matrix) {
  const metadata = new Map();
  for (const row of matrix || []) {
    const key = text(row?.[0]);
    if (key && normalized(key) !== 'field') metadata.set(key, text(row?.[1]));
  }
  return metadata;
}

function reviewObjects(matrix, errors) {
  const rows = Array.isArray(matrix) ? matrix : [];
  const headerIndex = rows.findIndex((row) => text(row?.[0]) === REVIEW_HEADERS[0]);
  if (headerIndex < 0) {
    errors.push('Review sheet is missing the canonical header row.');
    return [];
  }

  const headers = (rows[headerIndex] || []).map(text);
  for (const header of REVIEW_HEADERS) {
    if (!headers.includes(header)) errors.push(`Review sheet is missing required column ${header}.`);
  }
  if (errors.some((message) => message.startsWith('Review sheet is missing required column'))) return [];

  const column = Object.fromEntries(REVIEW_HEADERS.map((header) => [header, headers.indexOf(header)]));
  return rows.slice(headerIndex + 1)
    .filter((row) => text(row?.[column['Concept ID']]))
    .map((row) => ({
      order: Number(row[column.Order]),
      conceptId: text(row[column['Concept ID']]),
      currentLocalized: text(row[column['Current localized form']]),
      currentPronunciation: text(row[column['Current pronunciation']]),
      decision: normalized(row[column['Review decision']]),
      finalLocalized: text(row[column['Final localized form']]),
      finalPronunciation: text(row[column['Final pronunciation']]),
      notes: text(row[column['Reviewer notes']]),
      reviewer: text(row[column['Reviewer / date']]),
    }));
}

function buildNativeReviewPlan({
  courseId,
  sourceSha256,
  sourceWorkbook,
  canonicalRows,
  reviewMatrix,
  metadataMatrix,
}) {
  const errors = [];
  const canonical = [...(canonicalRows || [])].sort((left, right) => left.order - right.order);
  const metadata = metadataMap(metadataMatrix);

  if (!text(courseId)) errors.push('A course ID is required.');
  if (metadata.get('Course ID') !== courseId) errors.push(`Review workbook course ID does not match ${courseId}.`);
  if (metadata.get('Source workbook') !== sourceWorkbook) errors.push('Review workbook source filename does not match the canonical workbook.');
  if (metadata.get('Source workbook SHA-256') !== sourceSha256) {
    errors.push('Review workbook is stale: its source workbook SHA-256 does not match the current canonical workbook.');
  }
  if (Number(metadata.get('Vocabulary rows')) !== 39) errors.push('Review workbook metadata must declare exactly 39 vocabulary rows.');
  if (canonical.length !== 39) errors.push(`Canonical course ${courseId} must contain exactly 39 rows; found ${canonical.length}.`);

  const reviewRows = reviewObjects(reviewMatrix, errors);
  if (reviewRows.length !== 39) errors.push(`Review sheet must contain exactly 39 vocabulary rows; found ${reviewRows.length}.`);

  const canonicalByConcept = new Map(canonical.map((row) => [row.conceptId, row]));
  const counts = new Map();
  for (const row of reviewRows) counts.set(row.conceptId, (counts.get(row.conceptId) || 0) + 1);
  for (const [conceptId, count] of counts) {
    if (count > 1) errors.push(`Review sheet contains duplicate concept ${conceptId}.`);
    if (!canonicalByConcept.has(conceptId)) errors.push(`Review sheet contains unknown concept ${conceptId}.`);
  }
  for (const conceptId of canonicalByConcept.keys()) {
    if (!counts.has(conceptId)) errors.push(`Review sheet is missing concept ${conceptId}.`);
  }

  const rows = reviewRows.map((reviewRow) => {
    const source = canonicalByConcept.get(reviewRow.conceptId);
    if (source) {
      if (reviewRow.currentLocalized !== text(source.localized)) {
        errors.push(`Review source text for ${reviewRow.conceptId} does not match the canonical localized form.`);
      }
      if (reviewRow.currentPronunciation !== text(source.pronunciation)) {
        errors.push(`Review source text for ${reviewRow.conceptId} does not match the canonical pronunciation.`);
      }
      if (reviewRow.order !== source.order) errors.push(`Review order for ${reviewRow.conceptId} does not match the canonical order.`);
    }
    if (!REVIEW_DECISIONS.has(reviewRow.decision)) {
      errors.push(`Review decision for ${reviewRow.conceptId} must be Approved, Needs changes, or Unreviewed.`);
    }
    if (reviewRow.decision === 'approved' && !reviewRow.reviewer) {
      errors.push(`Approved concept ${reviewRow.conceptId} requires a reviewer and date.`);
    }
    if (reviewRow.decision === 'approved' && AMBIGUITY_NOTE_CONCEPTS.has(reviewRow.conceptId) && !reviewRow.notes) {
      errors.push(`Approved concept ${reviewRow.conceptId} requires a context note.`);
    }

    const finalLocalized = reviewRow.finalLocalized || reviewRow.currentLocalized;
    const finalPronunciation = reviewRow.finalPronunciation || reviewRow.currentPronunciation;
    if (reviewRow.decision === 'approved' && !finalLocalized) errors.push(`Approved concept ${reviewRow.conceptId} has no final localized form.`);
    if (reviewRow.decision === 'approved' && !finalPronunciation) errors.push(`Approved concept ${reviewRow.conceptId} has no final pronunciation.`);

    return Object.freeze({
      ...reviewRow,
      finalLocalized,
      finalPronunciation,
      changed: Boolean(source) && (finalLocalized !== text(source.localized) || finalPronunciation !== text(source.pronunciation)),
    });
  });

  const summary = Object.freeze({
    total: rows.length,
    approved: rows.filter((row) => row.decision === 'approved').length,
    needsChanges: rows.filter((row) => row.decision === 'needs changes').length,
    unreviewed: rows.filter((row) => row.decision === 'unreviewed').length,
    changes: rows.filter((row) => row.changed).length,
  });
  const ready = errors.length === 0 && summary.total === 39 && summary.approved === 39;

  return Object.freeze({ courseId, sourceSha256, ready, summary, errors: Object.freeze(errors), rows: Object.freeze(rows) });
}

function applyApprovedNativeReview({ courseId, workbookRows, lessonStepRows = [], plan }) {
  if (!plan?.ready || plan.courseId !== courseId) throw new Error(`Native review for ${courseId} is not ready to apply.`);
  const approvedByConcept = new Map(plan.rows.map((row) => [row.conceptId, row]));
  if (approvedByConcept.size !== 39) throw new Error(`Native review for ${courseId} does not contain 39 unique concepts.`);

  let appliedCount = 0;
  const nextWorkbookRows = workbookRows.map((row) => {
    if (text(row.course_id) !== courseId) return { ...row };
    const approved = approvedByConcept.get(text(row.concept_id));
    if (!approved) throw new Error(`Native review for ${courseId} is missing ${row.concept_id}.`);
    appliedCount += 1;
    return {
      ...row,
      localized_form: approved.finalLocalized,
      pronunciation: approved.finalPronunciation,
      review_status: 'approved',
    };
  });
  if (appliedCount !== 39) throw new Error(`Canonical workbook contains ${appliedCount} rows for ${courseId}; expected 39.`);

  const replacementsByConcept = new Map(
    plan.rows
      .filter((row) => row.currentLocalized !== row.finalLocalized)
      .map((row) => [row.conceptId, {
        current: row.currentLocalized,
        final: row.finalLocalized,
      }])
  );
  const exactTargetTextReplacements = new Map(
    [...replacementsByConcept.values()].map(({ current, final }) => [current, final])
  );
  let lessonStepsApplied = 0;
  const nextLessonStepRows = lessonStepRows.map((row) => {
    if (text(row.course_id) !== courseId) return { ...row };
    lessonStepsApplied += 1;
    let distractors;
    let conceptRefs;
    try {
      distractors = JSON.parse(row.distractors_json || '[]');
    } catch (error) {
      throw new Error(`Lesson step ${row.step_id} has invalid distractors_json: ${error.message}`);
    }
    if (!Array.isArray(distractors)) throw new Error(`Lesson step ${row.step_id} distractors_json must be an array.`);
    try {
      conceptRefs = JSON.parse(row.concept_refs_json || '[]');
    } catch (error) {
      throw new Error(`Lesson step ${row.step_id} has invalid concept_refs_json: ${error.message}`);
    }
    if (!Array.isArray(conceptRefs)) throw new Error(`Lesson step ${row.step_id} concept_refs_json must be an array.`);
    const relevantConceptIds = [...new Set([
      text(row.concept_id),
      ...conceptRefs.map(text),
    ].filter(Boolean))];
    const relevantReplacements = relevantConceptIds
      .map((conceptId) => replacementsByConcept.get(conceptId))
      .filter(Boolean)
      .sort((left, right) => right.current.length - left.current.length);
    const replaceReferencedPromptText = (value) => {
      let next = text(value);
      for (const replacement of relevantReplacements) {
        next = next.split(replacement.current).join(replacement.final);
      }
      return next;
    };
    const replaceReferencedExactText = (value) => {
      const currentValue = text(value);
      return exactTargetTextReplacements.get(currentValue) || value;
    };
    return {
      ...row,
      prompt: replaceReferencedPromptText(row.prompt),
      answer: replaceReferencedExactText(row.answer),
      distractors_json: JSON.stringify(
        distractors.map(replaceReferencedExactText)
      ),
    };
  });

  return Object.freeze({
    workbookRows: nextWorkbookRows,
    lessonStepRows: nextLessonStepRows,
    summary: Object.freeze({
      vocabularyRowsApplied: appliedCount,
      lessonStepsApplied,
    }),
  });
}

function buildNativeReviewEvidencePaths({ courseId, sourceWorkbookSha256After }) {
  const normalizedCourseId = String(courseId || '').trim();
  const normalizedSha = String(sourceWorkbookSha256After || '').trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedCourseId)) {
    throw new Error('Native-review evidence has an invalid course ID.');
  }
  if (!/^[a-f0-9]{64}$/.test(normalizedSha)) {
    throw new Error('Native-review evidence requires a valid SHA-256.');
  }
  const directory = `content/release-evidence/native-review/${normalizedCourseId}/${normalizedSha}`;
  return Object.freeze({
    directory,
    reviewWorkbookPath: `${directory}/review.xlsx`,
    receiptPath: `${directory}/receipt.json`,
  });
}

function buildNativeReviewReceipt({
  courseId,
  plan,
  sourceWorkbookSha256Before,
  sourceWorkbookSha256After,
  reviewWorkbookPath,
  reviewWorkbookBytes,
  appliedAt,
}) {
  if (!plan?.ready || plan.courseId !== courseId) throw new Error(`Native review for ${courseId} is not ready for a receipt.`);
  if (!sourceWorkbookSha256Before || !sourceWorkbookSha256After) throw new Error('Native-review receipt requires before and after workbook hashes.');
  if (!reviewWorkbookPath || !Buffer.isBuffer(reviewWorkbookBytes)) throw new Error('Native-review receipt requires the reviewed workbook artifact.');
  if (!appliedAt) throw new Error('Native-review receipt requires an appliedAt timestamp.');
  const reviewers = [...new Set(plan.rows.map((row) => row.reviewer).filter(Boolean))];
  if (!reviewers.length) throw new Error('Native-review receipt requires reviewer attribution.');
  return Object.freeze({
    schemaVersion: 1,
    courseId,
    approvedRows: plan.summary.approved,
    appliedAt,
    sourceWorkbookSha256Before,
    sourceWorkbookSha256After,
    reviewWorkbookPath: String(reviewWorkbookPath).replace(/\\/g, '/'),
    reviewWorkbookSha256: crypto.createHash('sha256').update(reviewWorkbookBytes).digest('hex'),
    reviewers: Object.freeze(reviewers),
  });
}

module.exports = {
  AMBIGUITY_NOTE_CONCEPTS,
  REVIEW_HEADERS,
  applyApprovedNativeReview,
  buildNativeReviewEvidencePaths,
  buildNativeReviewReceipt,
  buildNativeReviewPlan,
};
