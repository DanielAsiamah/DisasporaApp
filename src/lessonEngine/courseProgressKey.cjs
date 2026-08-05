function buildCourseProgressStorageKey(userId, courseId) {
  if (typeof courseId !== 'string' || !courseId.trim()) {
    throw new Error('A course ID is required to store progress.');
  }

  return `diaspora:mvp-topics:v1:${userId || 'guest'}:${courseId}`;
}

module.exports = { buildCourseProgressStorageKey };
