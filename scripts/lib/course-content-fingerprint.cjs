const crypto = require('node:crypto');

function buildCourseContentProjection(curriculum = {}, courseId = '') {
  const normalizedCourseId = String(courseId || '').trim();
  return Object.freeze({
    schemaVersion: 1,
    concepts: curriculum.concepts || [],
    course: (curriculum.courses || []).find(({ id }) => id === normalizedCourseId) || null,
    vocabulary: (curriculum.courseVocabulary || []).filter(
      ({ courseId: rowCourseId }) => rowCourseId === normalizedCourseId
    ),
    chapters: (curriculum.chapters || []).filter(
      ({ courseId: rowCourseId }) => rowCourseId === normalizedCourseId
    ),
    topics: (curriculum.topics || []).filter(
      ({ courseId: rowCourseId }) => rowCourseId === normalizedCourseId
    ),
    lessonSteps: (curriculum.lessonSteps || []).filter(
      ({ courseId: rowCourseId }) => rowCourseId === normalizedCourseId
    ),
  });
}

function buildCourseContentSha256(curriculum, courseId) {
  const projection = buildCourseContentProjection(curriculum, courseId);
  if (!projection.course) throw new Error(`Unknown course ${courseId || '(blank)'}.`);
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(projection))
    .digest('hex');
}

function buildCourseContentSha256ById(curriculum = {}) {
  return Object.freeze(Object.fromEntries(
    (curriculum.courses || []).map(({ id }) => [
      id,
      buildCourseContentSha256(curriculum, id),
    ])
  ));
}

module.exports = {
  buildCourseContentProjection,
  buildCourseContentSha256,
  buildCourseContentSha256ById,
};
