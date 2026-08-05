'use strict';

const LEGACY_PREVIEW_COURSE_IDS = new Set(['jamaican-patois']);
const DEVELOPER_PREVIEW_COURSE_IDS = new Set(['swahili']);

function deriveCourseReleaseState(course, { hasVerifiedRelease = false } = {}) {
  const published = course?.availability === 'published' && hasVerifiedRelease === true;
  const legacyPreview = course?.availability === 'preview'
    && LEGACY_PREVIEW_COURSE_IDS.has(course?.id);

  return {
    available: published || legacyPreview,
    published,
  };
}

function resolveDeveloperPreviewCourseId({
  requestedCourseId,
  isDevelopment,
  previewOptIn,
} = {}) {
  if (isDevelopment !== true || previewOptIn !== true) return null;
  return DEVELOPER_PREVIEW_COURSE_IDS.has(requestedCourseId)
    ? requestedCourseId
    : null;
}

function canAccessRuntimeCourse(course, previewCourseId = null) {
  if (!course || typeof course.id !== 'string') return false;
  if (course.available === true || course.published === true) return true;
  return previewCourseId === course.id
    && DEVELOPER_PREVIEW_COURSE_IDS.has(course.id);
}

module.exports = {
  canAccessRuntimeCourse,
  deriveCourseReleaseState,
  resolveDeveloperPreviewCourseId,
};
