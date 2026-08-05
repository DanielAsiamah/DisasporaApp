'use strict';

// Generated only after a course passes the complete release verifier.
// Jamaican Patois remains a temporary legacy preview and is intentionally absent.
const VERIFIED_COURSE_RELEASES = Object.freeze({});

function isSha256(value) {
  return /^[a-f0-9]{64}$/i.test(String(value || ''));
}

function hasVerifiedCourseRelease(courseId, courseContentSha256) {
  const record = VERIFIED_COURSE_RELEASES[courseId];
  return Boolean(
    record
    && isSha256(record.candidateDigest)
    && isSha256(record.sourceWorkbookSha256)
    && isSha256(record.courseContentSha256)
    && record.courseContentSha256 === courseContentSha256
    && record.approvedBy
    && record.approvedAt
  );
}

module.exports = {
  VERIFIED_COURSE_RELEASES,
  hasVerifiedCourseRelease,
};
