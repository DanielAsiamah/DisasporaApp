'use strict';

const aliases = Object.freeze({
  patois: 'jamaican-patois', haitian: 'haitian-creole',
  belizean: 'belizean-kriol', sudanese: 'sudanese-arabic',
});
const normalize = (value) => String(value || '').trim().toLowerCase();

function buildAlignment({ lessons, vocabulary }, curriculum) {
  const meanings = new Map(curriculum.concepts.map((row) => [row.id, normalize(row.meaning)]));
  const index = new Map();
  for (const row of curriculum.courseVocabulary) {
    const meaning = meanings.get(row.conceptId);
    if (!meaning || !normalize(row.localized)) continue;
    const key = JSON.stringify([row.courseId, meaning]);
    if (!index.has(key)) index.set(key, []);
    index.get(key).push({ ...row });
  }
  const items = vocabulary.map((row) => {
    const courseId = aliases[row.language_id] || row.language_id;
    const candidates = index.get(JSON.stringify([courseId, normalize(row.english_source)])) || [];
    return {
      ...row,
      courseId,
      matchState: normalize(row.target_text) ? 'workbook-translation'
        : candidates.length === 1 ? 'existing-candidate'
          : candidates.length > 1 ? 'ambiguous' : 'missing',
      candidates,
    };
  });
  const byLesson = new Map();
  for (const item of items) {
    if (!byLesson.has(item.lesson_id)) byLesson.set(item.lesson_id, []);
    byLesson.get(item.lesson_id).push(item);
  }
  return {
    items,
    lessons: lessons.map((lesson) => {
      const rows = byLesson.get(lesson.lesson_id) || [];
      const missingItems = rows.filter((row) => row.matchState === 'missing' || row.matchState === 'ambiguous').length;
      return {
        ...lesson,
        totalItems: rows.length,
        missingItems,
        // Coverage is not native review approval or permission to publish.
        translationCoverageComplete: rows.length > 0 && missingItems === 0,
      };
    }),
  };
}

module.exports = { buildAlignment };
