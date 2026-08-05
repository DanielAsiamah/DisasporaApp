function text(value) {
  return String(value || '').trim();
}

function isSha256(value) {
  return /^[a-f0-9]{64}$/i.test(text(value));
}

function buildVerifiedReleaseRecord({ courseId, approval, report } = {}) {
  if (!report?.ready || report.courseId !== courseId) {
    throw new Error(`${courseId || '(blank)'} has not passed the complete release gate.`);
  }
  const publication = approval?.publicationApproval;
  if (
    publication?.status !== 'approved'
    || !text(approval?.candidateDigest)
    || publication.candidateDigest !== approval.candidateDigest
  ) {
    throw new Error('Publication approval does not match the approved release candidate.');
  }
  if (
    !isSha256(approval.candidateDigest)
    || !isSha256(approval.sourceWorkbookSha256)
    || !isSha256(report.courseContentSha256)
  ) {
    throw new Error('Verified release requires valid candidate, workbook, and course content SHA-256 identity.');
  }
  if (!text(publication.approvedBy) || !text(publication.approvedAt)) {
    throw new Error('Verified release requires publication approver attribution and date.');
  }
  return Object.freeze({
    candidateDigest: approval.candidateDigest,
    sourceWorkbookSha256: approval.sourceWorkbookSha256,
    courseContentSha256: report.courseContentSha256,
    approvedBy: publication.approvedBy,
    approvedAt: publication.approvedAt,
  });
}

function serializedRecord(record) {
  return {
    candidateDigest: text(record?.candidateDigest),
    sourceWorkbookSha256: text(record?.sourceWorkbookSha256),
    courseContentSha256: text(record?.courseContentSha256),
    approvedBy: text(record?.approvedBy),
    approvedAt: text(record?.approvedAt),
  };
}

function serializeVerifiedCourseReleases(records = {}) {
  const entries = Object.keys(records)
    .sort()
    .map((courseId) => {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(courseId)) {
        throw new Error(`Invalid verified release course ID: ${courseId}.`);
      }
      const record = serializedRecord(records[courseId]);
      if (
        Object.values(record).some((value) => !value)
        || !isSha256(record.candidateDigest)
        || !isSha256(record.sourceWorkbookSha256)
        || !isSha256(record.courseContentSha256)
      ) {
        throw new Error(`Verified release ${courseId} is incomplete.`);
      }
      return `  ${JSON.stringify(courseId)}: Object.freeze(${JSON.stringify(record, null, 2).replace(/\n/g, '\n  ')}),`;
    });
  return `'use strict';\n\n`
    + `// Generated only by scripts/publish-course.js after the complete release gate passes.\n`
    + `// Jamaican Patois remains a temporary legacy preview and is intentionally absent.\n`
    + `const VERIFIED_COURSE_RELEASES = Object.freeze({\n${entries.join('\n')}\n});\n\n`
    + `function isSha256(value) {\n`
    + `  return /^[a-f0-9]{64}$/i.test(String(value || ''));\n`
    + `}\n\n`
    + `function hasVerifiedCourseRelease(courseId, courseContentSha256) {\n`
    + `  const record = VERIFIED_COURSE_RELEASES[courseId];\n`
    + `  return Boolean(\n`
    + `    record\n`
    + `    && isSha256(record.candidateDigest)\n`
    + `    && isSha256(record.sourceWorkbookSha256)\n`
    + `    && isSha256(record.courseContentSha256)\n`
    + `    && record.courseContentSha256 === courseContentSha256\n`
    + `    && record.approvedBy\n`
    + `    && record.approvedAt\n`
    + `  );\n`
    + `}\n\n`
    + `module.exports = {\n`
    + `  VERIFIED_COURSE_RELEASES,\n`
    + `  hasVerifiedCourseRelease,\n`
    + `};\n`;
}

module.exports = {
  buildVerifiedReleaseRecord,
  serializeVerifiedCourseReleases,
};
