function text(value) {
  return String(value ?? '').trim();
}

function displayName(courseId) {
  if (courseId === 'aave') return 'AAVE';
  if (courseId === 'nobiin') return 'Nobiin';
  return courseId
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function auditRebuildProgress({
  courseIds = [],
  vocabulary = [],
  topics = [],
  fileExists = () => false,
} = {}) {
  const normalizedCourseIds = courseIds.map(text);
  const errors = [];
  if (
    normalizedCourseIds.length !== 9
    || new Set(normalizedCourseIds).size !== 9
    || normalizedCourseIds.some((courseId) => !courseId)
  ) {
    errors.push('The rebuild audit requires exactly nine unique course IDs.');
  }

  const expectedCourses = new Set(normalizedCourseIds);
  const unexpectedVocabulary = vocabulary.filter((row) => !expectedCourses.has(text(row.course_id)));
  const unexpectedTopics = topics.filter((row) => !expectedCourses.has(text(row.course_id)));
  if (unexpectedVocabulary.length) {
    errors.push(`Found ${unexpectedVocabulary.length} vocabulary rows outside the nine-course catalog.`);
  }
  if (unexpectedTopics.length) {
    errors.push(`Found ${unexpectedTopics.length} topics outside the nine-course catalog.`);
  }

  const courseReports = normalizedCourseIds.map((courseId) => {
    const rows = vocabulary.filter((row) => text(row.course_id) === courseId);
    const courseTopics = topics.filter((row) => text(row.course_id) === courseId);
    const uniqueConcepts = new Set(rows.map((row) => text(row.concept_id))).size;
    const uniqueTopics = new Set(courseTopics.map((row) => text(row.topic_id))).size;
    const approvedRows = rows.filter(
      (row) => text(row.review_status).toLowerCase() === 'approved'
    ).length;
    const illustrations = rows.filter((row) => {
      const conceptId = text(row.concept_id);
      const expectedPath = `assets/images/vocab/${courseId}/${conceptId}.png`;
      return text(row.image_path).replace(/\\/g, '/') === expectedPath && fileExists(expectedPath);
    }).length;
    const audioFiles = rows.filter((row) => {
      const conceptId = text(row.concept_id);
      const expectedPath = `assets/audio/${courseId}/${conceptId}.mp3`;
      return text(row.audio_path).replace(/\\/g, '/') === expectedPath && fileExists(expectedPath);
    }).length;
    const structurallyComplete = rows.length === 39 && uniqueConcepts === 39 && uniqueTopics === 9;
    const releaseAssetsComplete = approvedRows === 39 && illustrations === 39 && audioFiles === 39;
    const name = displayName(courseId);
    if (!structurallyComplete || !releaseAssetsComplete) {
      errors.push(
        `${name}: ${rows.length}/39 rows, ${uniqueConcepts}/39 unique concepts, `
        + `${uniqueTopics}/9 topics, ${approvedRows}/39 approved, `
        + `${illustrations}/39 illustrations, ${audioFiles}/39 audio files.`
      );
    }
    return Object.freeze({
      courseId,
      vocabularyRows: rows.length,
      uniqueConcepts,
      topics: uniqueTopics,
      approvedRows,
      illustrations,
      audioFiles,
      structurallyComplete,
      releaseAssetsComplete,
    });
  });

  const totals = Object.freeze({
    courses: normalizedCourseIds.length,
    vocabularyRows: courseReports.reduce((sum, course) => sum + course.vocabularyRows, 0),
    approvedRows: courseReports.reduce((sum, course) => sum + course.approvedRows, 0),
    topics: courseReports.reduce((sum, course) => sum + course.topics, 0),
    illustrations: courseReports.reduce((sum, course) => sum + course.illustrations, 0),
    audioFiles: courseReports.reduce((sum, course) => sum + course.audioFiles, 0),
  });
  const complete = errors.length === 0
    && totals.courses === 9
    && totals.vocabularyRows === 351
    && totals.approvedRows === 351
    && totals.topics === 81
    && totals.illustrations === 351
    && totals.audioFiles === 351;
  return Object.freeze({
    complete,
    status: complete ? 'complete' : 'in-progress',
    totals,
    courses: Object.freeze(courseReports),
    errors: Object.freeze(errors),
  });
}

module.exports = {
  auditRebuildProgress,
};
